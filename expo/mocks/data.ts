import { GroceryLog, StoreData } from '@/types';

const now = new Date();
const dayOfWeek = now.getDay();
const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

function dateForDay(offset: number): string {
  const d = new Date(now);
  d.setDate(now.getDate() + mondayOffset + offset);
  return d.toISOString().split('T')[0];
}

function timeAgo(minutes: number): string {
  const d = new Date(now.getTime() - minutes * 60000);
  return d.toISOString();
}

export const mockLogs: GroceryLog[] = [
  {
    id: '1',
    store: 'Home Depot',
    total: 87.42,
    category: 'deals',
    items: [
      { id: 'i1', name: 'DEWALT Drill Bits Set', price: 19.97, isHealthy: false },
      { id: 'i2', name: 'Paint Roller Kit', price: 12.98, isHealthy: false },
      { id: 'i3', name: 'LED Shop Light 4ft', price: 24.97, isHealthy: true },
      { id: 'i4', name: 'Work Gloves 3-Pack', price: 9.97, isHealthy: true },
      { id: 'i5', name: 'Extension Cord 50ft', price: 19.53, isHealthy: false },
    ],
    date: dateForDay(0),
    dayOfWeek: 1,
    isPublic: true,
    createdAt: timeAgo(120),
  },
  {
    id: '2',
    store: "Lowe's",
    total: 124.86,
    category: 'deals',
    items: [
      { id: 'i10', name: 'CRAFTSMAN Tool Set 135pc', price: 49.98, isHealthy: false },
      { id: 'i11', name: 'Interior Paint 1 Gal', price: 28.98, isHealthy: false },
      { id: 'i12', name: 'Outlet Covers 10pk', price: 8.97, isHealthy: true },
      { id: 'i13', name: 'Caulk Gun + Silicone', price: 14.96, isHealthy: false },
      { id: 'i14', name: 'Stud Finder', price: 21.97, isHealthy: true },
    ],
    date: dateForDay(1),
    dayOfWeek: 2,
    isPublic: true,
    createdAt: timeAgo(60),
  },
  {
    id: '3',
    store: 'Harbor Freight',
    total: 156.20,
    category: 'bulk',
    items: [
      { id: 'i18', name: 'Floor Jack 3-Ton', price: 79.99, isHealthy: false },
      { id: 'i19', name: 'Socket Set 64pc', price: 29.99, isHealthy: false },
      { id: 'i20', name: 'Ratchet Straps 4pk', price: 12.99, isHealthy: false },
      { id: 'i21', name: 'Mechanic Gloves', price: 8.99, isHealthy: true },
      { id: 'i22', name: 'Shop Towels 200ct', price: 9.99, isHealthy: false },
      { id: 'i23', name: 'LED Work Light', price: 14.25, isHealthy: true },
    ],
    date: dateForDay(2),
    dayOfWeek: 3,
    isPublic: false,
    createdAt: timeAgo(30),
  },
  {
    id: '4',
    store: 'Ace Hardware',
    total: 52.15,
    category: 'budget',
    items: [
      { id: 'i27', name: 'Duct Tape 3-Pack', price: 9.99, isHealthy: false },
      { id: 'i28', name: 'Picture Hanging Kit', price: 7.49, isHealthy: false },
      { id: 'i29', name: 'Sandpaper Variety', price: 6.99, isHealthy: false },
      { id: 'i30', name: 'Tape Measure 25ft', price: 12.99, isHealthy: false },
      { id: 'i31', name: 'Wood Screws Assorted', price: 5.49, isHealthy: false },
      { id: 'i32', name: 'Flashlight LED', price: 9.20, isHealthy: true },
    ],
    date: dateForDay(3),
    dayOfWeek: 4,
    isPublic: true,
    createdAt: timeAgo(5),
  },
];

export const mockStores: StoreData[] = [
  {
    id: 's1',
    name: 'Home Depot',
    latitude: 40.758,
    longitude: -73.9855,
    category: 'deals',
    avgSpend: 92.4,
    totalLogs: 48,
    lastLogTime: '2m ago',
  },
  {
    id: 's2',
    name: "Lowe's",
    latitude: 40.7425,
    longitude: -73.9883,
    category: 'deals',
    avgSpend: 104.2,
    totalLogs: 31,
    lastLogTime: '8m ago',
  },
  {
    id: 's3',
    name: 'Harbor Freight',
    latitude: 40.7614,
    longitude: -73.9776,
    category: 'budget',
    avgSpend: 68.8,
    totalLogs: 27,
    lastLogTime: '22m ago',
  },
  {
    id: 's4',
    name: 'Ace Hardware',
    latitude: 40.7489,
    longitude: -73.968,
    category: 'budget',
    avgSpend: 42.6,
    totalLogs: 52,
    lastLogTime: '5m ago',
  },
  {
    id: 's5',
    name: 'Menards',
    latitude: 40.7549,
    longitude: -73.974,
    category: 'bulk',
    avgSpend: 118.9,
    totalLogs: 19,
    lastLogTime: '45m ago',
  },
  {
    id: 's6',
    name: 'Tractor Supply Co.',
    latitude: 40.7505,
    longitude: -73.9934,
    category: 'deals',
    avgSpend: 76.3,
    totalLogs: 38,
    lastLogTime: '1m ago',
  },
];



export function getWeeklySummary(logs: GroceryLog[]) {
  const totalSpend = logs.reduce((sum, log) => sum + log.total, 0);
  const totalMeals = logs.length;

  const allItems = logs.flatMap((log) => log.items);
  const healthyItems = allItems.filter((item) => item.isHealthy).length;
  const healthyPercent =
    allItems.length > 0
      ? Math.round((healthyItems / allItems.length) * 100)
      : 0;

  const budgetLogs = logs.filter(
    (log) => log.category === 'budget' || log.category === 'deals'
  );
  const budgetPercent =
    logs.length > 0 ? Math.round((budgetLogs.length / logs.length) * 100) : 0;

  return { totalSpend, totalMeals, healthyPercent, budgetPercent };
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getWeekDateRange(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `${fmt(monday)} – ${fmt(sunday)}`;
}
