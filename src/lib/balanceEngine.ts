export interface Balance {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

interface ExpenseWithSplits {
  payer_id: string;
  amount: number;
  expense_splits: { participant_id: string; amount: number }[];
}

export function computeBalances(
  expenses: ExpenseWithSplits[],
  participantNames: Record<string, string>
): Balance[] {
  // Net balance per participant (positive = owed money, negative = owes money)
  const net: Record<string, number> = {};

  for (const exp of expenses) {
    net[exp.payer_id] = (net[exp.payer_id] || 0) + exp.amount;
    for (const split of exp.expense_splits) {
      net[split.participant_id] = (net[split.participant_id] || 0) - split.amount;
    }
  }

  // Minimal settlement using greedy algorithm
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, amount] of Object.entries(net)) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded < -0.01) debtors.push({ id, amount: -rounded });
    else if (rounded > 0.01) creditors.push({ id, amount: rounded });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Balance[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(amt * 100) / 100;
    if (rounded > 0) {
      settlements.push({
        from: debtors[i].id,
        fromName: participantNames[debtors[i].id] || "Unknown",
        to: creditors[j].id,
        toName: participantNames[creditors[j].id] || "Unknown",
        amount: rounded,
      });
    }
    debtors[i].amount -= amt;
    creditors[j].amount -= amt;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}
