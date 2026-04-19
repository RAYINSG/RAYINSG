import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem, StorageLocation } from '../../../types';
import {
  subscribeToItems,
  addItem,
  updateItem,
  deleteItem,
  addLocation,
  getLocations,
} from '../../../services/firebase/inventory';
import {
  saveThumbnail,
  deleteOriginalPhoto,
  deleteThumbnail,
} from '../../../services/storage/photoStorage';

const FREE_ITEM_LIMIT = 10;

interface InventoryState {
  items: InventoryItem[];
  locations: StorageLocation[];
  loading: boolean;
  isPremium: boolean;

  subscribe: (userId: string) => () => void;
  loadLocations: (userId: string) => Promise<void>;
  addNewItem: (userId: string, item: Omit<InventoryItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExistingItem: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  addNewLocation: (userId: string, name: string) => Promise<StorageLocation>;
  deletePhotoAndKeepThumbnail: (item: InventoryItem) => Promise<void>;
  canAddItem: () => boolean;
  setPremium: (value: boolean) => void;
}

export const useInventory = create<InventoryState>()(
  persist(
    (set, get) => ({
  items: [],
  locations: [],
  loading: false,
  isPremium: false,

  subscribe: (userId) => {
    set({ loading: true });
    const unsubscribe = subscribeToItems(userId, (items) => {
      set({ items, loading: false });
    });
    return unsubscribe;
  },

  loadLocations: async (userId) => {
    const locations = await getLocations(userId);
    const seen = new Set<string>();
    const unique = locations.filter(loc => {
      if (seen.has(loc.name.trim())) return false;
      seen.add(loc.name.trim());
      return true;
    });
    set({ locations: unique });
  },

  canAddItem: () => {
    const { items, isPremium } = get();
    // 計算所有「非已消耗」的物品數量（active、soon、expired 都算進上限）
    return isPremium || items.filter(i => i.status !== 'consumed').length < FREE_ITEM_LIMIT;
  },

  setPremium: (value) => set({ isPremium: value }),

  addNewItem: async (userId, itemData) => {
    const now = Date.now();
    const fullItem: Omit<InventoryItem, 'id'> = {
      ...itemData,
      userId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const itemId = await addItem(fullItem);

    // 儲存縮圖到 App 永久目錄，原圖路徑保留給 Firestore
    if (itemData.photoUri) {
      const thumbPath = await saveThumbnail(itemData.photoUri, itemId);
      await updateItem(itemId, {
        photoUri: itemData.photoUri,   // 原圖（可能是相簿或 cache）
        thumbnailUri: thumbPath,        // 縮圖（永久本機）
      });
    }

    return itemId;
  },

  updateExistingItem: async (id, data) => {
    await updateItem(id, data);
  },

  removeItem: async (id) => {
    // 刪除記錄時一併清理縮圖
    await deleteThumbnail(id);
    await deleteItem(id);
  },

  addNewLocation: async (userId, name) => {
    const { locations } = get();
    const existing = locations.find(l => l.name.trim() === name.trim());
    if (existing) return existing;
    const id = await addLocation(userId, name);
    const newLocation: StorageLocation = { id, name, createdAt: Date.now() };
    set(state => {
      if (state.locations.find(l => l.id === id || l.name.trim() === name.trim())) return state;
      return { locations: [...state.locations, newLocation] };
    });
    return newLocation;
  },

  // 刪除原圖，縮圖保留 → 用戶仍可瀏覽
  deletePhotoAndKeepThumbnail: async (item) => {
    if (!item.photoUri || item.photoDeleted) return;

    // 先產生縮圖（原圖還在）
    const thumbPath = await saveThumbnail(item.photoUri, item.id);

    // 刪除原圖（只刪 App cache 裡的副本，不動相簿）
    await deleteOriginalPhoto(item.photoUri);

    // Firestore 記錄改為：photoUri 指向縮圖，標記 photoDeleted，清除舊 thumbnailUri
    await updateItem(item.id, {
      photoUri: thumbPath,
      thumbnailUri: thumbPath,
      photoDeleted: true,
    });
  },
    }),
    {
      name: 'inventory-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // 只持久化 isPremium，items/locations 仍從 Firestore 即時讀取
      partialize: (state) => ({ isPremium: state.isPremium }),
    },
  ),
);
