import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { InventoryItem, StorageLocation } from '../../types';

const ITEMS_COL = 'items';
const LOCATIONS_COL = 'locations';

// ─── Items ───────────────────────────────────────────────────────────────────

export async function addItem(item: Omit<InventoryItem, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, ITEMS_COL), item);
  return ref.id;
}

export async function updateItem(id: string, data: Partial<InventoryItem>) {
  await updateDoc(doc(db, ITEMS_COL, id), { ...data, updatedAt: Date.now() });
}

export async function deleteItem(id: string) {
  await deleteDoc(doc(db, ITEMS_COL, id));
}

export async function getItem(id: string): Promise<InventoryItem | null> {
  const snap = await getDoc(doc(db, ITEMS_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as InventoryItem;
}

export function subscribeToItems(
  userId: string,
  onUpdate: (items: InventoryItem[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, ITEMS_COL),
    where('userId', '==', userId),
  );
  return onSnapshot(q, snap => {
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as InventoryItem))
      .sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return Number(a.expiryDate) - Number(b.expiryDate);
      });
    onUpdate(items);
  }, (error) => {
    console.error('[subscribeToItems] Firestore error:', error.code, error.message);
  });
}

// ─── Locations ───────────────────────────────────────────────────────────────

export async function addLocation(userId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, LOCATIONS_COL), {
    userId,
    name,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function getLocations(userId: string): Promise<StorageLocation[]> {
  const q = query(
    collection(db, LOCATIONS_COL),
    where('userId', '==', userId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as StorageLocation))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

export async function deleteLocation(id: string) {
  await deleteDoc(doc(db, LOCATIONS_COL, id));
}
