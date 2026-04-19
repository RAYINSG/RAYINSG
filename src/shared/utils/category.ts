import { ItemCategory } from '../../types';

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: '食品',
  health: '保健品',
  voucher: '禮券',
  medicine: '藥品',
  cosmetic: '化妝品/保養品',
  other: '其他',
};

export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  food: '🍎',
  health: '💊',
  voucher: '🎫',
  medicine: '💉',
  cosmetic: '💄',
  other: '📦',
};

export function getCategoryLabel(category: ItemCategory): string {
  return CATEGORY_LABELS[category] ?? '其他';
}

export function getCategoryIcon(category: ItemCategory): string {
  return CATEGORY_ICONS[category] ?? '📦';
}

export const ALL_CATEGORIES: ItemCategory[] = [
  'food', 'health', 'voucher', 'medicine', 'cosmetic', 'other',
];
