import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSplitSlip } from "@/context/SplitSlipContext";
import { computeNetBalances, formatRupees } from "@/utils/calculations";

export default function LedgerTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, toggleSettled } = useSplitSlip();

  const netBalances = useMemo(() => computeNetBalances(history), [history]);
  const netEntries = Object.entries(netBalances).filter(
    ([, v]) => Math.abs(v) > 0.5,
  );
  const reversed = useMemo(() => [...history].reverse(), [history]);

  const isWeb = Platform.OS === "web";
  const extraBottom = isWeb ? 84 : 50 + insets.bottom;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 40 + extraBottom },
      ]}
    >
      {/* ── Net Balances ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        Net Balances
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {netEntries.length === 0 ? (
          <View style={styles.settledRow}>
            <Text style={{ fontSize: 15, color: colors.success }}>✓</Text>
            <Text style={[styles.settledText, { color: colors.success }]}>
              Everyone is settled up
            </Text>
          </View>
        ) : (
          netEntries.map(([name, v], i) => (
            <View
              key={name}
              style={[
                styles.balanceRow,
                i < netEntries.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.balanceName, { color: colors.foreground }]}>
                {name}
              </Text>
              <Text
                style={[
                  styles.balanceAmt,
                  { color: v < 0 ? colors.destructive : colors.success },
                ]}
              >
                {v < 0
                  ? `owes ${formatRupees(-v)}`
                  : `is owed ${formatRupees(v)}`}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── Bill History ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        History
      </Text>

      {reversed.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ fontSize: 32 }}>📭</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No bills yet
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
          >
            Save your first bill from the Bill tab
          </Text>
        </View>
      ) : (
        reversed.map((bill) => {
          const debtEntries = Object.entries(bill.debts);
          const allSettled =
            debtEntries.length > 0 && debtEntries.every(([, d]) => d.settled);

          return (
            <View
              key={bill.id}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Bill header */}
              <View style={styles.billHeader}>
                <View style={styles.billHeaderLeft}>
                  <Text
                    style={[styles.billTitle, { color: colors.foreground }]}
                  >
                    {bill.title}
                  </Text>
                  <Text
                    style={[styles.billMeta, { color: colors.mutedForeground }]}
                  >
                    paid by {bill.paidBy}
                  </Text>
                </View>
                {allSettled && (
                  <View
                    style={[
                      styles.settledBadge,
                      { backgroundColor: "#E6F4EA" },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.success,
                        fontWeight: "700",
                      }}
                    >
                      ✓
                    </Text>
                    <Text
                      style={[
                        styles.settledBadgeText,
                        { color: colors.success },
                      ]}
                    >
                      Settled
                    </Text>
                  </View>
                )}
              </View>

              {debtEntries.length === 0 ? (
                <Text
                  style={[styles.noDebts, { color: colors.mutedForeground }]}
                >
                  No outstanding debts
                </Text>
              ) : (
                debtEntries.map(([debtor, d]) => (
                  <View
                    key={debtor}
                    style={[styles.debtRow, { borderTopColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.debtText,
                        {
                          color: d.settled
                            ? colors.mutedForeground
                            : colors.foreground,
                          textDecorationLine: d.settled
                            ? "line-through"
                            : "none",
                        },
                      ]}
                    >
                      {debtor} owes {bill.paidBy}
                      {"\n"}
                      <Text
                        style={[
                          styles.debtAmt,
                          {
                            color: d.settled
                              ? colors.mutedForeground
                              : colors.foreground,
                          },
                        ]}
                      >
                        {formatRupees(d.amount)}
                      </Text>
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.settleBtn,
                        {
                          borderColor: d.settled
                            ? colors.success
                            : colors.border,
                          backgroundColor: d.settled
                            ? "#E6F4EA"
                            : "transparent",
                        },
                      ]}
                      onPress={() => {
                        toggleSettled(bill.id, debtor);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.7}
                    >
                      {d.settled ? (
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.success,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.settleBtnText,
                          {
                            color: d.settled
                              ? colors.success
                              : colors.foreground,
                          },
                        ]}
                      >
                        {d.settled ? "Settled" : "Mark paid"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  settledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  settledText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
  },
  balanceName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  balanceAmt: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  emptyState: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  billHeaderLeft: { flex: 1 },
  billTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  billMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  settledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  settledBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  noDebts: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingVertical: 4,
  },
  debtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  debtText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  debtAmt: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  settleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  settleBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
