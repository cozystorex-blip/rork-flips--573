import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Expense, ExpenseCategoryType, ExpenseSummary } from '@/types';

const STORAGE_KEY = 'expenses_data';

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const [ExpenseProvider, useExpenses] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Expense[];
      }
      return [];
    },
  });

  useEffect(() => {
    if (expensesQuery.data) {
      setExpenses(expensesQuery.data);
    }
  }, [expensesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updatedExpenses: Expense[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
      return updatedExpenses;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const mutate = saveMutation.mutate;

  const addExpense = useCallback(
    (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      const newExpense: Expense = {
        ...expense,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        createdAt: new Date().toISOString(),
      };
      console.log('[ExpenseContext] Adding expense:', newExpense.title, newExpense.amount);
      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      mutate(updated);
      return newExpense;
    },
    [expenses, mutate]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      console.log('[ExpenseContext] Deleting expense:', id);
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      mutate(updated);
    },
    [expenses, mutate]
  );

  const summary = useMemo((): ExpenseSummary => {
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    const totalThisWeek = expenses
      .filter((e) => new Date(e.createdAt) >= weekStart)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalThisMonth = expenses
      .filter((e) => new Date(e.createdAt) >= monthStart)
      .reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = {} as Record<ExpenseCategoryType, number>;
    const allCategories: ExpenseCategoryType[] = ['food', 'grocery', 'transport', 'utility_bills', 'shopping', 'home', 'subscriptions', 'other'];
    allCategories.forEach((cat) => {
      categoryBreakdown[cat] = expenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
    });

    return {
      totalThisWeek,
      totalThisMonth,
      expenseCount: expenses.length,
      categoryBreakdown,
    };
  }, [expenses]);

  const weeklyExpenses = useMemo(() => {
    const weekStart = getStartOfWeek();
    return expenses.filter((e) => new Date(e.createdAt) >= weekStart);
  }, [expenses]);

  const monthlyExpenses = useMemo(() => {
    const monthStart = getStartOfMonth();
    return expenses.filter((e) => new Date(e.createdAt) >= monthStart);
  }, [expenses]);

  return useMemo(() => ({
    expenses,
    weeklyExpenses,
    monthlyExpenses,
    summary,
    addExpense,
    deleteExpense,
    isLoading: expensesQuery.isLoading,
  }), [expenses, weeklyExpenses, monthlyExpenses, summary, addExpense, deleteExpense, expensesQuery.isLoading]);
});

export function useFilteredExpenses(
  search: string,
  categoryFilter: ExpenseCategoryType | null,
  timeFilter: 'week' | 'month' | 'all'
) {
  const { expenses, weeklyExpenses, monthlyExpenses } = useExpenses();

  return useMemo(() => {
    let filtered: Expense[];
    switch (timeFilter) {
      case 'week':
        filtered = weeklyExpenses;
        break;
      case 'month':
        filtered = monthlyExpenses;
        break;
      default:
        filtered = expenses;
    }

    if (categoryFilter) {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((e) => e.title.toLowerCase().includes(q));
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [expenses, weeklyExpenses, monthlyExpenses, search, categoryFilter, timeFilter]);
}
