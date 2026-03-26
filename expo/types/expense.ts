export type ExpenseCategoryType = 'food' | 'grocery' | 'transport' | 'utility_bills' | 'shopping' | 'home' | 'subscriptions' | 'other';

export const ExpenseCategoryLabels: Record<ExpenseCategoryType, string> = {
  food: 'Food',
  grocery: 'Grocery',
  transport: 'Transport',
  utility_bills: 'Utility Bills',
  shopping: 'Shopping',
  home: 'Home',
  subscriptions: 'Subscriptions',
  other: 'Other',
};

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategoryType;
  categoryId?: string;
  amount: number;
  notes?: string;
  note?: string;
  aiConfidence?: number;
  merchant?: string;
  receiptRawText?: string;
  receiptItemsPreview?: string;
  receiptConfidence?: number;
  receiptImagePath?: string;
  createdAt: string;
}

export interface ExpenseSummary {
  totalThisWeek: number;
  totalThisMonth: number;
  expenseCount: number;
  categoryBreakdown: Record<ExpenseCategoryType, number>;
}
