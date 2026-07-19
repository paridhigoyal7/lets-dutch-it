import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bill, computeBill, computeDebts, Debt, ItemData } from '@/utils/calculations';

const STORAGE_KEY = 'splitslip-data-v1';

const defaultState = {
  people: ['You', 'Friend'] as string[],
  items: [] as ItemData[],
  billTitle: '',
  gstRate: '5',
  splitMode: 'proportional' as 'proportional' | 'equal',
  paidBy: 'You',
  history: [] as Bill[],
};

interface SplitSlipContextValue {
  ready: boolean;
  people: string[];
  items: ItemData[];
  billTitle: string;
  gstRate: string;
  splitMode: 'proportional' | 'equal';
  paidBy: string;
  history: Bill[];
  setBillTitle: (title: string) => void;
  setGstRate: (rate: string) => void;
  setSplitMode: (mode: 'proportional' | 'equal') => void;
  setPaidBy: (person: string) => void;
  addPerson: (name: string) => void;
  removePerson: (name: string) => void;
  addItem: (name: string, price: number, assignedTo: string[]) => void;
  removeItem: (id: string) => void;
  saveBill: () => void;
  toggleSettled: (billId: string, debtor: string) => void;
}

const SplitSlipContext = createContext<SplitSlipContextValue | null>(null);

export function SplitSlipProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [people, setPeople] = useState<string[]>(defaultState.people);
  const [items, setItems] = useState<ItemData[]>(defaultState.items);
  const [billTitle, setBillTitle] = useState(defaultState.billTitle);
  const [gstRate, setGstRate] = useState(defaultState.gstRate);
  const [splitMode, setSplitMode] = useState<'proportional' | 'equal'>(defaultState.splitMode);
  const [paidBy, setPaidBy] = useState(defaultState.paidBy);
  const [history, setHistory] = useState<Bill[]>(defaultState.history);
  const loadedOnce = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.people) setPeople(parsed.people);
          if (parsed.items) setItems(parsed.items);
          if (parsed.billTitle !== undefined) setBillTitle(parsed.billTitle);
          if (parsed.gstRate !== undefined) setGstRate(parsed.gstRate);
          if (parsed.splitMode) setSplitMode(parsed.splitMode);
          if (parsed.paidBy !== undefined) setPaidBy(parsed.paidBy);
          if (parsed.history) setHistory(parsed.history);
        }
      } catch {
        // use defaults
      }
      loadedOnce.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!loadedOnce.current) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ people, items, billTitle, gstRate, splitMode, paidBy, history })
    ).catch(() => {});
  }, [people, items, billTitle, gstRate, splitMode, paidBy, history]);

  const addPerson = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || people.includes(trimmed)) return;
      setPeople((prev) => [...prev, trimmed]);
    },
    [people]
  );

  const removePerson = useCallback(
    (name: string) => {
      if (people.length <= 1) return;
      const newPeople = people.filter((p) => p !== name);
      setPeople(newPeople);
      setItems((prev) =>
        prev.map((it) => ({ ...it, assignedTo: it.assignedTo.filter((p) => p !== name) }))
      );
      if (paidBy === name) setPaidBy(newPeople[0] ?? '');
    },
    [people, paidBy]
  );

  const addItem = useCallback((name: string, price: number, assignedTo: string[]) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setItems((prev) => [...prev, { id, name, price, assignedTo }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const saveBill = useCallback(() => {
    if (items.length === 0) return;
    const { perPerson } = computeBill({ people, items, gstRate, splitMode });
    const debts = computeDebts({ people, paidBy, perPerson });
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setHistory((prev) => [
      ...prev,
      {
        id,
        title: billTitle.trim() || 'Untitled bill',
        paidBy,
        debts,
        createdAt: Date.now(),
      },
    ]);
    setItems([]);
    setBillTitle('');
  }, [items, people, gstRate, splitMode, paidBy, billTitle]);

  const toggleSettled = useCallback((billId: string, debtor: string) => {
    setHistory((prev) =>
      prev.map((bill) => {
        if (bill.id !== billId) return bill;
        const debts: Record<string, Debt> = {
          ...bill.debts,
          [debtor]: { ...bill.debts[debtor], settled: !bill.debts[debtor].settled },
        };
        return { ...bill, debts };
      })
    );
  }, []);

  return (
    <SplitSlipContext.Provider
      value={{
        ready,
        people,
        items,
        billTitle,
        gstRate,
        splitMode,
        paidBy,
        history,
        setBillTitle,
        setGstRate,
        setSplitMode,
        setPaidBy,
        addPerson,
        removePerson,
        addItem,
        removeItem,
        saveBill,
        toggleSettled,
      }}
    >
      {children}
    </SplitSlipContext.Provider>
  );
}

export function useSplitSlip() {
  const ctx = useContext(SplitSlipContext);
  if (!ctx) throw new Error('useSplitSlip must be used within SplitSlipProvider');
  return ctx;
}
