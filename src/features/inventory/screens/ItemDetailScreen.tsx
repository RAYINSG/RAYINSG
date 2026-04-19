import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { InventoryStackParamList, InventoryItem } from '../../../types';
import { useInventory } from '../hooks/useInventory';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../shared/theme';
import { getCategoryIcon } from '../../../shared/utils/category';
import { formatDate, getExpiryLabel, getExpiryStatus } from '../../../shared/utils/date';
import {
  scheduleItemNotification, cancelItemNotification,
  getNextStage, getNextNotificationTime, getStageLabel,
} from '../../notifications/hooks/useNotifications';
import { useTranslation } from '../../../i18n';
import { onItemChanged } from '../../../services/ads/adService';

type Props = NativeStackScreenProps<InventoryStackParamList, 'ItemDetail'>;

export function ItemDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { itemId } = route.params;
  const { items, removeItem, updateExistingItem, deletePhotoAndKeepThumbnail } = useInventory();
  const item = items.find(i => i.id === itemId);

  useEffect(() => {
    navigation.setOptions({ title: item?.name ?? t('nav.itemDetail') });
  }, [item?.name]);

  if (!item) return null;

  const expiryStatus = getExpiryStatus(item.expiryDate);

  async function handleDelete() {
    Alert.alert(t('itemDetail.deleteTitle'), t('itemDetail.deleteMsg', { name: item!.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeItem(item!.id);
          onItemChanged();
          navigation.goBack();
        },
      },
    ]);
  }

  async function handlePostponeReminder() {
    if (!item) return;
    const nextStage = getNextStage(item.notificationStage ?? 'half');
    const stageName = t(`stages.stageNames.${nextStage}` as any) || nextStage;
    Alert.alert(
      t('itemDetail.postponeTitle'),
      t('itemDetail.postponeMsg', { stage: stageName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('itemDetail.postponeConfirm'),
          onPress: async () => {
            await updateExistingItem(item.id, { notificationStage: nextStage });
            await cancelItemNotification(item.id);
            if (nextStage !== 'done') {
              await scheduleItemNotification({ ...item, notificationStage: nextStage });
            }
            const msg = nextStage === 'done'
              ? t('itemDetail.postponeDone')
              : t('itemDetail.postponedMsg', { stage: stageName });
            Alert.alert(t('common.ok'), msg);
          },
        },
      ],
    );
  }

  async function handleMarkConsumed() {
    Alert.alert(t('itemDetail.markConsumedTitle'), t('itemDetail.markConsumedMsg'), [
      { text: t('common.cancel') },
      { text: t('common.confirm'), onPress: async () => { await updateExistingItem(item!.id, { status: 'consumed' }); onItemChanged(); } },
    ]);
  }

  async function handleDeletePhoto() {
    Alert.alert(
      t('itemDetail.deletePhotoTitle'),
      t('itemDetail.deletePhotoMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('itemDetail.deletePhotoBtn'),
          style: 'destructive',
          onPress: async () => {
            await deletePhotoAndKeepThumbnail(item!);
            Alert.alert(t('common.success'), t('itemDetail.deletePhotoSuccess'));
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {item.photoUri && (
        <View style={styles.photoWrapper}>
          <Image source={{ uri: item.photoUri }} style={styles.photo} resizeMode="cover" />
          {item.photoDeleted && (
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>{t('itemDetail.thumbnailBadge')}</Text>
            </View>
          )}
          {!item.photoDeleted && (
            <TouchableOpacity style={styles.deletePhotoBtn} onPress={handleDeletePhoto}>
              <Text style={styles.deletePhotoText}>{t('itemDetail.deletePhotoLabel')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Card style={[styles.statusCard, expiryStatus === 'expired' && styles.expiredCard, expiryStatus === 'soon' && styles.soonCard]}>
        <Text style={styles.expiryLabel}>{getExpiryLabel(item.expiryDate)}</Text>
        {item.expiryDate && (
          <Text style={styles.expiryDate}>{formatDate(item.expiryDate)}</Text>
        )}
      </Card>

      <Card style={styles.infoCard}>
        <Row label={t('itemDetail.categoryLbl')} value={`${getCategoryIcon(item.category)} ${t(`categories.${item.category}`)}`} />
        {item.locationName && <Row label={t('itemDetail.locationLbl')} value={`📍 ${item.locationName}`} />}
        {item.description ? <Row label={t('itemDetail.descLbl')} value={item.description} /> : null}
        {item.notes ? <Row label={t('itemDetail.notesLbl')} value={item.notes} /> : null}
        <Row label={t('itemDetail.addedDateLbl')} value={formatDate(item.createdAt)} />
        {item.aiAnalysis ? <Row label={t('itemDetail.aiTextLbl')} value={item.aiAnalysis} /> : null}
      </Card>

      {item.status === 'active' && item.expiryDate && (
        <Card style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>{t('itemDetail.reminderTitle')}</Text>
          <Text style={styles.reminderStage}>
            {t('itemDetail.currentStage', { stage: getStageLabel(item.notificationStage ?? 'half') })}
          </Text>
          {getNextNotificationTime(item) ? (
            <Text style={styles.reminderNext}>
              {t('itemDetail.nextReminder', { date: formatDate(getNextNotificationTime(item)!.getTime()) })}
            </Text>
          ) : null}
          {(item.notificationStage ?? 'half') !== 'done' && (
            <Button label={t('itemDetail.postponeBtn')} onPress={handlePostponeReminder} variant="outline" style={styles.reminderBtn} />
          )}
        </Card>
      )}

      <View style={styles.actions}>
        {item.status === 'active' && (
          <Button label={t('itemDetail.markConsumedBtn')} onPress={handleMarkConsumed} variant="secondary" style={styles.actionBtn} />
        )}
        <Button label={t('itemDetail.editBtn')} onPress={() => navigation.navigate('EditItem', { itemId })} variant="outline" style={styles.actionBtn} />
        <Button label={t('itemDetail.deleteBtn')} onPress={handleDelete} variant="danger" style={styles.actionBtn} />
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  photoWrapper: { marginBottom: Spacing.sm },
  photo: { width: '100%', height: 240, borderRadius: BorderRadius.md },
  deletedBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: BorderRadius.sm, padding: Spacing.xs,
  },
  deletedBadgeText: { color: '#fff', fontSize: FontSize.xs },
  deletePhotoBtn: {
    marginTop: Spacing.sm, alignItems: 'center',
    padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: Colors.expiringSoon,
  },
  deletePhotoText: { fontSize: FontSize.sm, color: Colors.expiringSoonText },
  statusCard: { alignItems: 'center', paddingVertical: Spacing.lg },
  expiredCard: { backgroundColor: Colors.expired },
  soonCard: { backgroundColor: Colors.expiringSoon },
  expiryLabel: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  expiryDate: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  infoCard: { gap: Spacing.sm },
  row: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  rowLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 2 },
  rowValue: { fontSize: FontSize.md, color: Colors.text },
  actions: { gap: Spacing.sm, marginBottom: Spacing.xxl },
  actionBtn: {},
  reminderCard: { gap: Spacing.sm },
  reminderTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  reminderStage: { fontSize: FontSize.sm, color: Colors.textSecondary },
  reminderNext: { fontSize: FontSize.sm, color: Colors.primary },
  reminderBtn: { marginTop: Spacing.xs },
});
