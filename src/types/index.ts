export type ItemCategory =
  | 'food'
  | 'health'
  | 'voucher'
  | 'medicine'
  | 'cosmetic'
  | 'other';

export type ItemStatus = 'active' | 'expired' | 'consumed';

export type NotificationStage = 'half' | 'three_quarter' | 'ninety' | 'week' | 'done';

export interface StorageLocation {
  id: string;
  name: string;
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: ItemCategory;
  expiryDate: number | null;
  locationId: string | null;
  locationName: string | null;
  status: ItemStatus;
  photoUri: string | null;
  thumbnailUri: string | null;
  photoDeleted: boolean;
  aiAnalysis: string | null;
  createdAt: number;
  updatedAt: number;
  reminderDate: number | null;
  notificationStage: NotificationStage;
  notes: string | null;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Scanner: undefined;
  Inventory: { screen?: string; params?: { filter?: string } } | undefined;
  Settings: undefined;
};

export type InventoryStackParamList = {
  InventoryList: { filter?: 'all' | 'active' | 'soon' | 'expired' | 'consumed' } | undefined;
  ItemDetail: { itemId: string };
  AddItem: { photoUri?: string; aiResult?: AiAnalysisResult; itemId?: string; ocrExpiry?: string };
  EditItem: { photoUri?: string; aiResult?: AiAnalysisResult; itemId?: string; ocrExpiry?: string };
};

export interface AiAnalysisResult {
  name: string;
  description: string;
  category: ItemCategory;
  estimatedExpiry: string | null;
  colors: string[];
  rawText: string;
}
