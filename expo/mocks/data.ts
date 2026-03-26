import { GroceryLog, StoreData, UserProfile } from '@/types';

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

export const mockProfiles: UserProfile[] = [
  {
    id: 'p1',
    name: 'Sarah',
    avatar: 'https://r2-pub.rork.com/generated-images/53524209-adc7-4928-8363-fd2b9e050540.png',
    bio: 'Always scanning for the best tool deals. I compare prices so you don\'t have to.',
    weeklyAvgSpend: 92,
    dominantStyle: 'deals',
    totalLogs: 132,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 88 },
      { week: 'W2', spend: 95 },
      { week: 'W3', spend: 90 },
      { week: 'W4', spend: 94 },
    ],
  },
  {
    id: 'p2',
    name: 'Jason',
    avatar: 'https://r2-pub.rork.com/generated-images/820955bc-27da-437d-ae58-cdaff03ff0cc.png',
    bio: 'Workshop builder. Finding clearance tools and flipping project supplies every week.',
    weeklyAvgSpend: 145,
    dominantStyle: 'deals',
    totalLogs: 76,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 138 },
      { week: 'W2', spend: 152 },
      { week: 'W3', spend: 141 },
      { week: 'W4', spend: 149 },
    ],
  },
  {
    id: 'p3',
    name: 'Emily',
    avatar: 'https://r2-pub.rork.com/generated-images/43be5ff0-8e62-4953-ab00-166d1e7e2eda.png',
    bio: 'DIY on a budget. Sharing my best hardware finds and home project tips.',
    weeklyAvgSpend: 68,
    dominantStyle: 'budget',
    totalLogs: 58,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 65 },
      { week: 'W2', spend: 72 },
      { week: 'W3', spend: 64 },
      { week: 'W4', spend: 70 },
    ],
  },
  {
    id: 'p4',
    name: 'Matt',
    avatar: 'https://r2-pub.rork.com/generated-images/0ad1d605-36cc-4d84-9062-0dcef3432c5c.png',
    bio: 'Scouting affordable tools and building materials. If it\'s a steal, I\'ll find it.',
    weeklyAvgSpend: 110,
    dominantStyle: 'bulk',
    totalLogs: 89,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 105 },
      { week: 'W2', spend: 118 },
      { week: 'W3', spend: 108 },
      { week: 'W4', spend: 112 },
    ],
    thumbnails: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'p5',
    name: 'Lisa',
    avatar: 'https://r2-pub.rork.com/generated-images/d3f96c8e-6d42-4b0c-9a46-b6afaf30977f.png',
    bio: 'Power tool junkie. Drills, saws, sanders — always hunting the best price.',
    weeklyAvgSpend: 135,
    dominantStyle: 'healthy',
    totalLogs: 147,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 128 },
      { week: 'W2', spend: 142 },
      { week: 'W3', spend: 131 },
      { week: 'W4', spend: 139 },
    ],
  },
  {
    id: 'p6',
    name: 'Ryan',
    avatar: 'https://r2-pub.rork.com/generated-images/deb5c713-f809-4a04-bb1e-8990b7523a2c.png',
    bio: 'Warehouse runs every weekend. Stocking up on hardware and saving big in bulk.',
    weeklyAvgSpend: 195,
    dominantStyle: 'bulk',
    totalLogs: 121,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 188 },
      { week: 'W2', spend: 202 },
      { week: 'W3', spend: 191 },
      { week: 'W4', spend: 198 },
    ],
    thumbnails: [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'p7',
    name: 'Amir',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    bio: 'Scanning everything at the hardware store before I buy. If there\'s a better deal, I\'ll find it.',
    weeklyAvgSpend: 78,
    dominantStyle: 'deals',
    totalLogs: 64,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 74 },
      { week: 'W2', spend: 82 },
      { week: 'W3', spend: 76 },
      { week: 'W4', spend: 80 },
    ],
  },
  {
    id: 'p8',
    name: 'Keiko',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    bio: 'Home improvement on a budget. Love finding quality tools without overspending.',
    weeklyAvgSpend: 105,
    dominantStyle: 'budget',
    totalLogs: 91,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 98 },
      { week: 'W2', spend: 112 },
      { week: 'W3', spend: 101 },
      { week: 'W4', spend: 108 },
    ],
    thumbnails: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'p9',
    name: 'Darius',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face',
    bio: 'Just checking prices before I buy stuff. This app actually saves me money every trip.',
    weeklyAvgSpend: 180,
    dominantStyle: 'bulk',
    totalLogs: 113,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 172 },
      { week: 'W2', spend: 188 },
      { week: 'W3', spend: 175 },
      { week: 'W4', spend: 184 },
    ],
  },
  {
    id: 'p10',
    name: 'Priya',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
    bio: 'Comparing tool prices on my phone while I shop. Saving a little on every trip adds up.',
    weeklyAvgSpend: 62,
    dominantStyle: 'healthy',
    totalLogs: 73,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 58 },
      { week: 'W2', spend: 66 },
      { week: 'W3', spend: 60 },
      { week: 'W4', spend: 64 },
    ],
  },
  {
    id: 'p11',
    name: 'Carlos',
    avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face',
    bio: 'Hardware deals and clearance finds. Keeping the workshop stocked without breaking the bank.',
    weeklyAvgSpend: 125,
    dominantStyle: 'deals',
    totalLogs: 98,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 118 },
      { week: 'W2', spend: 132 },
      { week: 'W3', spend: 121 },
      { week: 'W4', spend: 128 },
    ],
    thumbnails: [
      'https://images.unsplash.com/photo-1543168256-418811576931?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1604969367673-0cfe3608ccd1?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'p12',
    name: 'Fatima',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
    bio: 'Tool hunting on weekends. Love a good workshop setup that doesn\'t cost a fortune.',
    weeklyAvgSpend: 88,
    dominantStyle: 'budget',
    totalLogs: 55,
    publicLogs: [],
    weeklyHistory: [
      { week: 'W1', spend: 82 },
      { week: 'W2', spend: 94 },
      { week: 'W3', spend: 85 },
      { week: 'W4', spend: 90 },
    ],
    thumbnails: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=200&h=200&fit=crop',
    ],
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
