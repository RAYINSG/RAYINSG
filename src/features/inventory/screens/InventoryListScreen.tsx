import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SectionList,
  TouchableOpacity, Alert, TextInput, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { InventoryStackParamList, InventoryItem } from '../../../types';
import { useAuth } from '../../auth/hooks/useAuth';
import { useInventory } from '../hooks/useInventory';
import { Card } from '../../../shared/components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../shared/theme';
import { getExpiryLabel, getExpiryStatus } from '../../../shared/utils/date';
import { getCategoryIcon, ALL_CATEGORIES } from '../../../shared/utils/category';
import { scheduleAllExpiryNotifications } from '../../notifications/hooks/useNotifications';
import { useTranslation } from '../../../i18n';
import { onItemChanged } from '../../../services/ads/adService';

type Props = NativeStackScreenProps<InventoryStackParamList, 'InventoryList'>;
type GroupBy = 'none' | 'location' | 'category';

function sortByExpiry(list: InventoryItem[]): InventoryItem[] {
  return [...list].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate - b.expiryDate;
  });
}

export function InventoryListScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, subscribe, loadLocations, removeItem, updateExistingItem, addNewItem, canAddItem } = useInventory();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'soon' | 'expired' | 'consumed'>(
    route.params?.filter ?? 'all'
  );
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribe(user.uid);
    loadLocations(user.uid);
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (route.params?.filter) setStatusFilter(route.params.filter as any);
  }, [route.params?.filter]);

  useEffect(() => {
    scheduleAllExpiryNotifications(items);
  }, [items]);

  function applyFilters(list: InventoryItem[]): InventoryItem[] {
    return list.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === 'soon') return item.status === 'active' && getExpiryStatus(item.expiryDate) === 'soon';
      if (statusFilter === 'expired') return item.status === 'active' && getExpiryStatus(item.expiryDate) === 'expired';
      if (statusFilter !== 'all') return item.status === statusFilter;
      return true;
    });
  }

  function buildSections(): { title: string; data: InventoryItem[] }[] {
    const base = applyFilters(items);
    const unassigned = t('inventory.unassignedLocation');
    if (groupBy === 'location') {
      const map = new Map<string, InventoryItem[]>();
      base.forEach(item => {
        const key = item.locationName ?? unassigned;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => a === unassigned ? 1 : b === unassigned ? -1 : a.localeCompare(b))
        .map(([title, data]) => ({ title: title === unassigned ? title : `📍 ${title}`, data: sortByExpiry(data) }));
    }
    if (groupBy === 'category') {
      return ALL_CATEGORIES
        .map(cat => ({
          title: `${getCategoryIcon(cat)} ${t(`categories.${cat}`)}`,
          data: sortByExpiry(base.filter(i => i.category === cat)),
        }))
        .filter(s => s.data.length > 0);
    }
    return [];
  }

  function handleLongPress(item: InventoryItem) {
    Alert.alert(item.name, t('inventory.selectAction'), [
      { text: t('inventory.actionEdit'), onPress: () => navigation.navigate('EditItem', { itemId: item.id }) },
      { text: t('inventory.actionCopy'), onPress: () => handleCopy(item) },
      { text: t('inventory.actionDelete'), style: 'destructive', onPress: () => handleDelete(item) },
      { text: t('inventory.actionCancel'), style: 'cancel' },
    ]);
  }

  async function handleCopy(item: InventoryItem) {
    if (!user || !canAddItem()) {
      Alert.alert(t('inventory.limitTitle'), t('inventory.limitMsg'));
      return;
    }
    const now = Date.now();
    try {
      await addNewItem(user.uid, {
        name: `${item.name}${t('inventory.copyLabel')}`, description: item.description, category: item.category,
        expiryDate: item.expiryDate, locationId: item.locationId, locationName: item.locationName,
        status: 'active', photoUri: null, thumbnailUri: null, photoDeleted: false,
        aiAnalysis: null, reminderDate: null, notificationStage: 'half', notes: item.notes,
      });
      Alert.alert(t('common.success'), t('inventory.copySuccess', { name: item.name }));
    } catch {
      Alert.alert(t('common.error'), t('inventory.copyFail'));
    }
  }

  function handleDelete(item: InventoryItem) {
    Alert.alert(t('inventory.deleteTitle'), t('inventory.deleteMsg', { name: item.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { removeItem(item.id); onItemChanged(); } },
    ]);
  }

  const STATUS_TABS = [
    { label: t('inventory.filterAll'), value: 'all' },
    { label: t('inventory.filterActive'), value: 'active' },
    { label: t('inventory.filterSoon'), value: 'soon' },
    { label: t('inventory.filterExpired'), value: 'expired' },
    { label: t('inventory.filterConsumed'), value: 'consumed' },
  ] as const;

  const GROUP_TABS = [
    { label: t('inventory.groupNone'), value: 'none' as GroupBy },
    { label: t('inventory.groupLocation'), value: 'location' as GroupBy },
    { label: t('inventory.groupCategory'), value: 'category' as GroupBy },
  ];

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <ItemCard
      item={item}
      onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      onLongPress={() => handleLongPress(item)}
    />
  );

  const filtered = sortByExpiry(applyFilters(items));
  const sections = buildSections();
  const isEmpty = groupBy === 'none' ? filtered.length === 0 : sections.length === 0;

  const EmptyView = (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>📦</Text>
      <Text style={styles.emptyText}>{t('inventory.empty')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder={t('inventory.searchPlaceholder')}
        placeholderTextColor={Colors.textLight}
      />

      <View style={styles.chipRow}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.chip, statusFilter === tab.value && styles.chipActive]}
            onPress={() => setStatusFilter(tab.value)}
          >
            <Text style={[styles.chipText, statusFilter === tab.value && styles.chipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.groupRow}>
        {GROUP_TABS.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.groupBtn, groupBy === tab.value && styles.groupBtnActive]}
            onPress={() => setGroupBy(tab.value)}
          >
            <Text style={[styles.groupText, groupBy === tab.value && styles.groupTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {groupBy === 'none' ? (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={[styles.list, isEmpty && styles.listEmpty]}
          ListEmptyComponent={EmptyView}
          renderItem={renderItem}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={i => i.id}
          contentContainerStyle={[styles.list, isEmpty && styles.listEmpty]}
          ListEmptyComponent={EmptyView}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

function ItemCard({ item, onPress, onLongPress }: { item: InventoryItem; onPress: () => void; onLongPress: () => void }) {
  const expiryStatus = getExpiryStatus(item.expiryDate);
  const photoUri = item.thumbnailUri ?? item.photoUri;
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
      <Card style={[styles.card, expiryStatus === 'expired' && styles.cardExpired, expiryStatus === 'soon' && styles.cardSoon]}>
        <View style={styles.cardRow}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.cardPhoto} resizeMode="cover" />
          ) : (
            <Text style={styles.cardEmoji}>{getCategoryIcon(item.category)}</Text>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={[
              styles.cardExpiry,
              expiryStatus === 'expired' && { color: Colors.expiredText },
              expiryStatus === 'soon' && { color: Colors.expiringSoonText },
            ]}>
              {getExpiryLabel(item.expiryDate)}
            </Text>
            {item.locationName && <Text style={styles.cardLocation}>📍 {item.locationName}</Text>}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: {
    margin: Spacing.md, paddingHorizontal: Spacing.md, height: 44,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  groupRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  groupBtn: {
    flex: 1, paddingVertical: 6, alignItems: 'center',
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  groupBtnActive: { borderColor: Colors.primaryDark, backgroundColor: Colors.primaryDark },
  groupText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  groupTextActive: { color: '#fff' },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  sectionHeader: { backgroundColor: Colors.background, paddingVertical: Spacing.xs },
  sectionHeaderText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  card: {},
  cardExpired: { backgroundColor: Colors.expired },
  cardSoon: { backgroundColor: Colors.expiringSoon },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardPhoto: { width: 56, height: 56, borderRadius: BorderRadius.sm },
  cardEmoji: { fontSize: 34 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  cardExpiry: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  cardLocation: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
});
