import React, { useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSplitSlip } from '@/context/SplitSlipContext';
import { computeBill, formatRupees } from '@/utils/calculations';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function BillTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    people,
    items,
    billTitle,
    gstRate,
    splitMode,
    paidBy,
    addPerson,
    removePerson,
    addItem,
    removeItem,
    setBillTitle,
    setGstRate,
    setSplitMode,
    setPaidBy,
    saveBill,
  } = useSplitSlip();

  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [newItemAssignees, setNewItemAssignees] = useState<string[]>([]);
  const newPersonInputRef = useRef<TextInput>(null);
  const itemNameRef = useRef<TextInput>(null);
  const itemPriceRef = useRef<TextInput>(null);

  const { perPerson, subtotal, totalTax } = useMemo(
    () => computeBill({ people, items, gstRate, splitMode }),
    [people, items, gstRate, splitMode]
  );

  const canSave = items.length > 0;
  const canAddItem = itemName.trim().length > 0 && parseFloat(itemPrice) > 0;

  function handleConfirmPerson() {
    const trimmed = newPersonName.trim();
    if (trimmed) {
      addPerson(trimmed);
    } else {
      let n = people.length + 1;
      while (people.includes(`Person ${n}`)) n++;
      addPerson(`Person ${n}`);
    }
    setNewPersonName('');
    setIsAddingPerson(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleAddItem() {
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || isNaN(price) || price <= 0) return;
    addItem(itemName.trim(), price, newItemAssignees);
    setItemName('');
    setItemPrice('');
    setNewItemAssignees([]);
    itemNameRef.current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function toggleAssignee(name: string) {
    setNewItemAssignees((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  function handleSave() {
    if (!canSave) return;
    saveBill();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const isWeb = Platform.OS === 'web';
  // Tab bar is position:absolute, so scroll content needs padding to clear it.
  // Tab bar height ≈ 50px native + safe-area inset; 84px on web.
  const extraBottom = isWeb ? 84 : 50 + insets.bottom;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + extraBottom, borderRadius: 2 }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
      {/* ── People ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>People</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {people.map((p) => (
          <View key={p} style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.chipText, { color: colors.foreground }]}>{p}</Text>
            {people.length > 1 && (
              <TouchableOpacity
                onPress={() => {
                  removePerson(p);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {isAddingPerson ? (
          <View style={[styles.addPersonInput, { borderColor: colors.accent, backgroundColor: colors.card }]}>
            <TextInput
              ref={newPersonInputRef}
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder="Name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.addPersonField, { color: colors.foreground }]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirmPerson}
              maxLength={24}
            />
            <TouchableOpacity onPress={handleConfirmPerson} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
              <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '600' }}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addChip, { borderColor: colors.accent }]}
            onPress={() => setIsAddingPerson(true)}
          >
            <Text style={[styles.addChipText, { color: colors.accent }]}>+ Add person</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Bill title ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Bill title</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
          placeholder="e.g. Saturday dinner"
          placeholderTextColor={colors.mutedForeground}
          value={billTitle}
          onChangeText={setBillTitle}
          returnKeyType="next"
          onSubmitEditing={() => itemNameRef.current?.focus()}
        />
      </View>

      {/* ── Add item ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Add item</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.itemInputRow}>
          <TextInput
            ref={itemNameRef}
            style={[styles.input, { flex: 6, minWidth: 0, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Item name"
            placeholderTextColor={colors.mutedForeground}
            value={itemName}
            onChangeText={setItemName}
            returnKeyType="next"
            onSubmitEditing={() => itemPriceRef.current?.focus()}
          />
          <TextInput
            ref={itemPriceRef}
            style={[styles.input, { flex: 4, minWidth: 0, color: colors.foreground, borderColor: colors.border }]}
            placeholder="₹ Price"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            value={itemPrice}
            onChangeText={setItemPrice}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
          />
        </View>

        {/* Assignee chips */}
        <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Assign to</Text>
        <View style={styles.assignRow}>
          {people.map((p) => {
            const active = newItemAssignees.includes(p);
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.assignChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => toggleAssignee(p)}
              >
                <Text
                  style={[
                    styles.assignChipText,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.addItemBtn,
            {
              backgroundColor: canAddItem ? colors.primary : colors.muted,
            },
          ]}
          onPress={handleAddItem}
          disabled={!canAddItem}
        >
          <Text style={[styles.addItemBtnText, { color: canAddItem ? colors.primaryForeground : colors.mutedForeground }]}>
            Add item
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Items list ── */}
      {items.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Items</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {items.map((it, i) => (
              <View
                key={it.id}
                style={[
                  styles.itemRow,
                  i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.itemRowLeft}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{it.name}</Text>
                  <Text style={[styles.itemAssignees, { color: colors.mutedForeground }]}>
                    {it.assignedTo.length ? it.assignedTo.join(', ') : 'unassigned'}
                  </Text>
                </View>
                <View style={styles.itemRowRight}>
                  <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                    {formatRupees(it.price)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      removeItem(it.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                  >
                    <Text style={{ fontSize: 15, color: colors.destructive }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Bill subtotal */}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.totalAmt, { color: colors.foreground }]}>{formatRupees(subtotal)}</Text>
            </View>
            {parseFloat(gstRate) > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
                  GST ({gstRate}%)
                </Text>
                <Text style={[styles.totalAmt, { color: colors.foreground }]}>{formatRupees(totalTax)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.grandAmt, { color: colors.foreground }]}>
                {formatRupees(subtotal + totalTax)}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* ── Settings ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Settings</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* GST rate */}
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>GST rate (%)</Text>
          <TextInput
            style={[styles.settingInput, { color: colors.foreground, borderColor: colors.border }]}
            keyboardType="numeric"
            value={gstRate}
            onChangeText={setGstRate}
            maxLength={5}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Split tax mode */}
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>Split tax</Text>
          <View style={styles.toggleRow}>
            {(['proportional', 'equal'] as const).map((mode) => {
              const active = splitMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSplitMode(mode)}
                >
                  <Text style={[styles.toggleBtnText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                    {mode === 'proportional' ? 'By share' : 'Equally'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Who paid */}
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>Who paid</Text>
        </View>
        <View style={styles.assignRow}>
          {people.map((p) => {
            const active = paidBy === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.assignChip,
                  {
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accent : 'transparent',
                  },
                ]}
                onPress={() => setPaidBy(p)}
              >
                <Text style={[styles.assignChipText, { color: active ? colors.accentForeground : colors.foreground }]}>
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Per-person breakdown ── */}
      {items.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Breakdown</Text>
          {people.map((p) => {
            const data = perPerson[p];
            if (!data) return null;
            return (
              <View
                key={p}
                style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.receiptName, { color: colors.foreground }]}>{p}</Text>
                {data.items.length === 0 ? (
                  <Text style={[styles.noItems, { color: colors.mutedForeground }]}>No items assigned</Text>
                ) : (
                  data.items.map((it, i) => (
                    <View key={i} style={styles.receiptLine}>
                      <Text style={[styles.receiptLineLabel, { color: colors.mutedForeground }]}>
                        {it.name}
                        {it.shared ? ' (shared)' : ''}
                      </Text>
                      <Text style={[styles.receiptLineAmt, { color: colors.foreground }]}>
                        {formatRupees(it.amount)}
                      </Text>
                    </View>
                  ))
                )}
                {parseFloat(gstRate) > 0 && (
                  <View style={[styles.receiptLine, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 8 }]}>
                    <Text style={[styles.receiptLineLabel, { color: colors.mutedForeground }]}>GST</Text>
                    <Text style={[styles.receiptLineAmt, { color: colors.foreground }]}>
                      {formatRupees(data.tax)}
                    </Text>
                  </View>
                )}
                <View style={[styles.receiptTotal, { borderTopColor: colors.border }]}>
                  <Text style={[styles.receiptTotalLabel, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.receiptTotalAmt, { color: colors.foreground }]}>
                    {formatRupees(data.total)}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* ── Save button ── */}
      <TouchableOpacity
        style={[
          styles.saveBtn,
          { backgroundColor: canSave ? colors.primary : colors.muted },
        ]}
        onPress={handleSave}
        disabled={!canSave}
        activeOpacity={0.8}
      >
        <Text style={[styles.saveBtnText, { color: canSave ? colors.primaryForeground : colors.mutedForeground }]}>
          Save bill to ledger
        </Text>
      </TouchableOpacity>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  chipScroll: { marginBottom: 16 },
  chipRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addChipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  addPersonInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  addPersonField: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minWidth: 80,
    maxWidth: 120,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 0,
  },
  itemInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  miniLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  assignRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  assignChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  assignChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 11,
    marginTop: 4,
  },
  addItemBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowLeft: { flex: 1 },
  itemRowRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  itemName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  itemAssignees: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  itemPrice: { fontSize: 14, fontFamily: 'Inter_500Medium', fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  totalAmt: { fontSize: 13, fontFamily: 'Inter_500Medium', fontVariant: ['tabular-nums'] },
  grandLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  grandAmt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  settingLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  settingInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    minWidth: 60,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  receiptCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  receiptName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  noItems: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  receiptLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  receiptLineLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  receiptLineAmt: { fontSize: 13, fontFamily: 'Inter_500Medium', fontVariant: ['tabular-nums'] },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
  },
  receiptTotalLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  receiptTotalAmt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
