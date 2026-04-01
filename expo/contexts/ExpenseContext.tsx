import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Expense, ExpenseCategoryType, ExpenseSummary } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchExpenses as fetchExpensesRemote,
  upsertExpense as upsertExpenseRemote,
  deleteExpense as deleteExpenseRemote,
} from '@/services/supabaseData';

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

function normalizeExpense(raw: Record<string, unknown>): Expense {
  return {
    id: (raw.id as string) ?? '',
    title: (raw.title as string) ?? '',
    amount: (raw.amount as number) ?? 0,
    category: ((raw.category) as ExpenseCategoryType) ?? 'other',
    storeName: ((raw.storeName ?? raw.store_name) as string) ?? undefined,
    notes: (raw.notes as string) ?? undefined,
    createdAt: ((raw.createdAt ?? raw.created_at) as string) ?? new Date().toISOString(),
  } as Expense;
}

export const [ExpenseProvider, useExpenses] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const expensesQuery = useQuery({
    queryKey: ['expenses', userId],
    queryFn: async () => {
      if (userId) {
        try {
          const remote = await fetchExpensesRemote(userId);
          if (Array.isArray(remote) && remote.length > 0) {
            console.log('[ExpenseContext] Loaded', remote.length, 'expenses from remote');
            return remote.map((r) => normalizeExpense(r as Record<string, unknown>));
          }
        } catch (e) {
          console.log('[ExpenseContext] Remote fetch failed:', e);
        }
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Expense[];
      }
      return [];
    },
    staleTime: 30000,
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
      void queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
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

      if (userId) {
        void upsertExpenseRemote(userId, {
          id: newExpense.id,
          title: newExpense.title,
          amount: newExpense.amount,
          category: newExpense.category,
          store_name: newExpense.merchant ?? null,
          notes: newExpense.notes ?? null,
          created_at: newExpense.createdAt,
        });
      }

      return newExpense;
    },
    [expenses, mutate, userId]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      console.log('[ExpenseContext] Deleting expense:', id);
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      mutate(updated);

      if (userId) {
        void deleteExpenseRemote(userId, id);
      }
    },
    [expenses, mutate, userId]
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
