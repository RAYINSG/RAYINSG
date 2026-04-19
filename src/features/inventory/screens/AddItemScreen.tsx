import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { InventoryStackParamList, ItemCategory } from '../../../types';
import { useAuth } from '../../auth/hooks/useAuth';
import { useInventory } from '../hooks/useInventory';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Card } from '../../../shared/components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../shared/theme';
import { ALL_CATEGORIES, getCategoryIcon } from '../../../shared/utils/category';
import { scheduleItemNotification } from '../../notifications/hooks/useNotifications';
import { onItemSaved } from '../../../services/ads/adService';
import { useTranslation } from '../../../i18n';
import { deleteLocation as deleteLocationFirestore } from '../../../services/firebase/inventory';
import { extractExpiryDateFromImage } from '../../../services/ocr/extractDate';

type Props = NativeStackScreenProps<InventoryStackParamList, 'AddItem'>;

export function AddItemScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { photoUri, aiResult, itemId, ocrExpiry } = route.params ?? {};
  const isEditing = !!itemId;
  const { user } = useAuth();
  const { addNewItem, updateExistingItem, items, locations, addNewLocation, loadLocations, canAddItem } = useInventory();

  const existingItem = isEditing ? items.find(i => i.id === itemId) : null;

  const [name, setName] = useState(existingItem?.name ?? aiResult?.name ?? '');
  const [description, setDescription] = useState(existingItem?.description ?? aiResult?.description ?? '');
  const [notes, setNotes] = useState(existingItem?.notes ?? '');
  const [category, setCategory] = useState<ItemCategory>(existingItem?.category ?? aiResult?.category ?? 'other');
  const [expiryDate, setExpiryDate] = useState<Date | null>(
    existingItem?.expiryDate
      ? new Date(existingItem.expiryDate)
      : aiResult?.estimatedExpiry
      ? new Date(aiResult.estimatedExpiry)
      : ocrExpiry
      ? new Date(ocrExpiry)
      : null,
  );
  const [reminderDate, setReminderDate] = useState<Date | null>(
    existingItem?.reminderDate ? new Date(existingItem.reminderDate) : null,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(existingItem?.locationId ?? null);
  const [newLocationName, setNewLocationName] = useState('');
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanningDate, setScanningDate] = useState(false);

  // ── 補拍日期照片 ─────────────────────────────────────────────
  async function handleScanDatePhoto() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('', t('scanner.cameraPermissionMsg'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled) return;

    setScanningDate(true);
    try {
      const date = await extractExpiryDateFromImage(result.assets[0].uri);
      if (date) {
        const text = dateToYYYYMMDD(date);
        setExpiryText(text);
        setExpiryDate(date);
        Alert.alert('', t('addItem.dateScanned', { date: date.toLocaleDateString() }));
      } else {
        Alert.alert('', t('addItem.dateNotFound'));
      }
    } catch {
      Alert.alert('', t('addItem.dateNotFound'));
    } finally {
      setScanningDate(false);
    }
  }
  // ─────────────────────────────────────────────────────────────

  // ── 日期文字輸入輔助 ──────────────────────────────────────────
  function dateToYYYYMMDD(date: Date | null): string {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  function parseYYYYMMDD(text: string): Date | null {
    if (text.length !== 8) return null;
    const y = parseInt(text.slice(0, 4), 10);
    const m = parseInt(text.slice(4, 6), 10) - 1;
    const d = parseInt(text.slice(6, 8), 10);
    if (y < 2000 || y > 2100 || m < 0 || m > 11 || d < 1 || d > 31) return null;
    const date = new Date(y, m, d);
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
    return date;
  }

  const [expiryText, setExpiryText] = useState<string>(dateToYYYYMMDD(expiryDate));
  const [reminderText, setReminderText] = useState<string>(dateToYYYYMMDD(reminderDate));

  function handleExpiryTextChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    setExpiryText(digits);
    setExpiryDate(parseYYYYMMDD(digits));
  }

  function handleReminderTextChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    setReminderText(digits);
    setReminderDate(parseYYYYMMDD(digits));
  }
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? t('nav.editItem') : t('nav.addItem') });
  }, [isEditing, t]);


  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('', t('addItem.emptyNameAlert'));
      return;
    }
    if (!user) return;
    if (!isEditing && !canAddItem()) {
      Alert.alert(t('addItem.limitTitle'), t('addItem.limitMsg'), [
        { text: t('addItem.limitCancel'), onPress: () => navigation.goBack() },
        { text: t('addItem.limitUpgrade'), onPress: () => navigation.goBack() },
      ]);
      return;
    }

    setSaving(true);
    try {
      let locationId = selectedLocationId;
      let locationName = locations.find(l => l.id === selectedLocationId)?.name ?? null;

      if (showNewLocation && newLocationName.trim()) {
        const loc = await addNewLocation(user.uid, newLocationName.trim());
        locationId = loc.id;
        locationName = loc.name;
      }

      if (isEditing && existingItem) {
        await updateExistingItem(existingItem.id, {
          name: name.trim(),
          description,
          notes: notes.trim() || null,
          category,
          expiryDate: expiryDate?.getTime() ?? null,
          reminderDate: reminderDate?.getTime() ?? null,
          locationId,
          locationName,
          updatedAt: Date.now(),
        });
        await scheduleItemNotification({ ...existingItem, name: name.trim(), expiryDate: expiryDate?.getTime() ?? null, locationId, locationName });
      } else {
        const now = Date.now();
        const newItemId = await addNewItem(user.uid, {
          name: name.trim(),
          description,
          notes: notes.trim() || null,
          category,
          expiryDate: expiryDate?.getTime() ?? null,
          locationId,
          locationName,
          photoUri: photoUri ?? null,
          thumbnailUri: null,
          photoDeleted: false,
          aiAnalysis: aiResult?.rawText ?? null,
          status: 'active',
          reminderDate: reminderDate?.getTime() ?? null,
          notificationStage: 'half',
        });

        await scheduleItemNotification({
          id: newItemId,
          name: name.trim(),
          expiryDate: expiryDate?.getTime() ?? null,
          createdAt: now,
          reminderDate: reminderDate?.getTime() ?? null,
          notificationStage: 'half',
          status: 'active',
        } as any);
      }

      onItemSaved();
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('addItem.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLocation(locId: string, locName: string) {
    Alert.alert(
      t('addItem.deleteLocationTitle'),
      t('addItem.deleteLocationConfirm', { name: locName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocationFirestore(locId);
              if (selectedLocationId === locId) setSelectedLocationId(null);
              if (user) await loadLocations(user.uid);
            } catch {}
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />}

      {aiResult && (
        <Card style={styles.aiCard}>
          <Text style={styles.aiTitle}>{t('addItem.aiTitle')}</Text>
          <Text style={styles.aiText}>{t('addItem.aiColors', { colors: aiResult.colors.join('、') })}</Text>
          {aiResult.estimatedExpiry && (
            <Text style={styles.aiText}>{t('addItem.aiExpiry', { date: aiResult.estimatedExpiry })}</Text>
          )}
        </Card>
      )}

      <Input label={t('addItem.nameLbl')} value={name} onChangeText={setName} placeholder={t('addItem.namePlaceholder')} />
      <Input label={t('addItem.descLbl')} value={description} onChangeText={setDescription} placeholder={t('addItem.descPlaceholder')} multiline numberOfLines={2} style={{ height: 70 }} />
      <Input label={t('addItem.notesLbl')} value={notes} onChangeText={setNotes} placeholder={t('addItem.notesPlaceholder')} multiline numberOfLines={2} style={{ height: 70 }} />

      {/* Category */}
      <Text style={styles.sectionLabel}>{t('addItem.categoryLbl')}</Text>
      <View style={styles.categoryGrid}>
        {ALL_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, category === cat && styles.categorySelected]}
            onPress={() => setCategory(cat)}
          >
            <Text style={styles.categoryEmoji}>{getCategoryIcon(cat)}</Text>
            <Text style={[styles.categoryText, category === cat && styles.categoryTextSelected]}>
              {t(`categories.${cat}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expiry Date */}
      <Text style={styles.sectionLabel}>{t('addItem.expiryLbl')}</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={styles.dateInput}
          value={expiryText}
          onChangeText={handleExpiryTextChange}
          placeholder="YYYYMMDD"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          maxLength={8}
        />
        {expiryDate && (
          <Text style={styles.dateParsed}>{expiryDate.toLocaleDateString()}</Text>
        )}
        {expiryText.length > 0 && (
          <TouchableOpacity onPress={() => { setExpiryText(''); setExpiryDate(null); }}>
            <Text style={styles.clearDate}>{t('addItem.clearDate')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.scanDateBtn} onPress={handleScanDatePhoto} disabled={scanningDate}>
          {scanningDate
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Text style={styles.scanDateIcon}>📷</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Reminder Date */}
      <Text style={styles.sectionLabel}>{t('addItem.reminderLbl')}</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={styles.dateInput}
          value={reminderText}
          onChangeText={handleReminderTextChange}
          placeholder="YYYYMMDD"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          maxLength={8}
        />
        {reminderDate && (
          <Text style={styles.dateParsed}>{reminderDate.toLocaleDateString()}</Text>
        )}
        {reminderText.length > 0 && (
          <TouchableOpacity onPress={() => { setReminderText(''); setReminderDate(null); }}>
            <Text style={styles.clearDate}>{t('addItem.clearDate')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Location */}
      <Text style={styles.sectionLabel}>{t('addItem.locationLbl')}</Text>
      {locations.length > 0 && (
        <View style={styles.locationList}>
          <TouchableOpacity
            style={[styles.locationChip, !selectedLocationId && styles.locationSelected]}
            onPress={() => setSelectedLocationId(null)}
          >
            <Text style={styles.locationText}>{t('addItem.unassigned')}</Text>
          </TouchableOpacity>
          {locations.map(loc => (
            <TouchableOpacity
              key={loc.id}
              style={[styles.locationChip, selectedLocationId === loc.id && styles.locationSelected]}
              onPress={() => setSelectedLocationId(loc.id)}
              onLongPress={() => handleDeleteLocation(loc.id, loc.name)}
            >
              <Text style={styles.locationText}>📍 {loc.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addLocationBtn} onPress={() => setShowNewLocation(v => !v)}>
        <Text style={styles.addLocationText}>{t('addItem.addLocationBtn')}</Text>
      </TouchableOpacity>
      {showNewLocation && (
        <TextInput
          style={styles.locationInput}
          value={newLocationName}
          onChangeText={setNewLocationName}
          placeholder={t('addItem.locationPlaceholder')}
          placeholderTextColor={Colors.textLight}
        />
      )}

      <Button label={t('addItem.saveBtn')} onPress={handleSave} loading={saving} style={styles.saveBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  photo: { width: '100%', height: 200, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  aiCard: { marginBottom: Spacing.md, backgroundColor: '#E8F5E9' },
  aiTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark, marginBottom: Spacing.xs },
  aiText: { fontSize: FontSize.sm, color: Colors.primaryDark },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, gap: Spacing.xs,
  },
  categorySelected: { borderColor: Colors.primary, backgroundColor: '#E8F5E9' },
  categoryEmoji: { fontSize: 16 },
  categoryText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  categoryTextSelected: { color: Colors.primary, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dateInput: {
    flex: 1, fontSize: FontSize.md, color: Colors.text,
    paddingVertical: Spacing.md,
  },
  dateParsed: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  clearDate: { fontSize: FontSize.sm, color: Colors.error },
  scanDateBtn: { padding: Spacing.xs },
  scanDateIcon: { fontSize: 20 },
  locationList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  locationChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  locationSelected: { borderColor: Colors.primary, backgroundColor: '#E8F5E9' },
  locationText: { fontSize: FontSize.sm, color: Colors.text },
  addLocationBtn: { marginBottom: Spacing.sm },
  addLocationText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  locationInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, backgroundColor: Colors.surface, fontSize: FontSize.md, color: Colors.text,
    marginBottom: Spacing.md,
  },
  saveBtn: { marginTop: Spacing.md, marginBottom: Spacing.xxl },
});
