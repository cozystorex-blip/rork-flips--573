export type CategoryType = 'budget' | 'healthy' | 'bulk' | 'deals';

export const CategoryLabels: Record<CategoryType, string> = {
  budget: 'Budget',
  healthy: 'Healthy',
  bulk: 'Bulk',
  deals: 'Deals',
};

export interface GroceryItem {
  id: string;
  name: string;
  price: number;
  isHealthy: boolean;
}

export interface GroceryLog {
  id: string;
  store: string;
  total: number;
  category: CategoryType;
  items: GroceryItem[];
  date: string;
  dayOfWeek: number;
  isPublic: boolean;
  createdAt: string;
}

export interface WeeklySummary {
  totalSpend: number;
  totalMeals: number;
  healthyPercent: number;
  budgetPercent: number;
}
