export interface Student {
  id: number;
  name: string;
  dailyScore: number;
  weeklyScore: number;
}

export interface Category {
  name: string;
  type: 'positive' | 'negative';
  subCategories: SubCategory[];
}

export interface SubCategory {
  name: string;
  points: number;
}

export interface ShopItem {
  name: string;
  cost: number;
}

export interface ScoreLog {
  id?: number;
  student_id: number;
  action: string;
  points_change: number;
  timestamp: string;
  category: string;
  subcategory: string;
}