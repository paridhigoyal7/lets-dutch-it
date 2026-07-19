export interface ItemData {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
}

export interface PersonLineItem {
  name: string;
  amount: number;
  shared: boolean;
}

export interface PersonData {
  items: PersonLineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface Debt {
  amount: number;
  settled: boolean;
}

export interface Bill {
  id: string;
  title: string;
  paidBy: string;
  debts: Record<string, Debt>;
  createdAt: number;
}

export function computeBill({
  people,
  items,
  gstRate,
  splitMode,
}: {
  people: string[];
  items: ItemData[];
  gstRate: string;
  splitMode: 'proportional' | 'equal';
}): { subtotal: number; totalTax: number; perPerson: Record<string, PersonData> } {
  const rate = parseFloat(gstRate) || 0;
  const subtotal = items.reduce((sum, it) => sum + it.price, 0);
  const totalTax = (subtotal * rate) / 100;

  const perPerson: Record<string, PersonData> = {};
  people.forEach((p) => {
    perPerson[p] = { items: [], subtotal: 0, tax: 0, total: 0 };
  });

  items.forEach((it) => {
    if (!it.assignedTo || it.assignedTo.length === 0) return;
    const share = it.price / it.assignedTo.length;
    it.assignedTo.forEach((p) => {
      if (!perPerson[p]) return;
      perPerson[p].items.push({
        name: it.name,
        amount: share,
        shared: it.assignedTo.length > 1,
      });
      perPerson[p].subtotal += share;
    });
  });

  people.forEach((p) => {
    const data = perPerson[p];
    const tax =
      splitMode === 'equal'
        ? totalTax / (people.length || 1)
        : subtotal > 0
        ? (totalTax * data.subtotal) / subtotal
        : 0;
    data.tax = tax;
    data.total = data.subtotal + tax;
  });

  return { subtotal, totalTax, perPerson };
}

export function computeDebts({
  people,
  paidBy,
  perPerson,
}: {
  people: string[];
  paidBy: string;
  perPerson: Record<string, PersonData>;
}): Record<string, Debt> {
  const debts: Record<string, Debt> = {};
  people.forEach((p) => {
    if (p === paidBy) return;
    if (perPerson[p]?.total > 0.5) {
      debts[p] = { amount: perPerson[p].total, settled: false };
    }
  });
  return debts;
}

export function computeNetBalances(history: Bill[]): Record<string, number> {
  const net: Record<string, number> = {};
  history.forEach((bill) => {
    Object.entries(bill.debts).forEach(([debtor, d]) => {
      if (d.settled) return;
      net[debtor] = (net[debtor] || 0) - d.amount;
      net[bill.paidBy] = (net[bill.paidBy] || 0) + d.amount;
    });
  });
  return net;
}

export function formatRupees(n: number): string {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return (
    '₹' +
    rounded.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
