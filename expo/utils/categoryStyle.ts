export interface CategoryStyle {
  color: string;
  label: string;
}

export function getCategoryStyle(category?: string | null): CategoryStyle | null {
  if (category === 'budget') return { color: '#22c55e', label: 'Budget' };
  if (category === 'healthy') return { color: '#3b82f6', label: 'Healthy' };
  if (category === 'bulk') return { color: '#8b5cf6', label: 'Bulk' };
  if (category === 'deals') return { color: '#facc15', label: 'Deals' };
  return null;
}
