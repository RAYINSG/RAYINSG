import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { InventoryItem, NotificationStage } from '../../../types';
import { getT } from '../../../i18n';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('expiry', {
        name: '到期提醒',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export function getNextNotificationTime(item: InventoryItem): Date | null {
  if (!item.expiryDate) return null;

  const now = Date.now();
  const expiry = item.expiryDate;
  const created = item.createdAt ?? now;
  const totalDuration = expiry - created;

  if (totalDuration <= 0) return null;

  const sevenDaysBefore = expiry - 7 * 24 * 60 * 60 * 1000;

  if (item.reminderDate && item.reminderDate > now) {
    return new Date(item.reminderDate);
  }

  const stage = item.notificationStage ?? 'half';

  switch (stage) {
    case 'half': {
      const halfPoint = created + totalDuration * 0.5;
      if (halfPoint > now) return new Date(halfPoint);
      if (sevenDaysBefore > now) return new Date(sevenDaysBefore);
      return null;
    }
    case 'three_quarter': {
      const threeQuarterPoint = created + totalDuration * 0.75;
      if (threeQuarterPoint > now) return new Date(threeQuarterPoint);
      if (sevenDaysBefore > now) return new Date(sevenDaysBefore);
      return null;
    }
    case 'ninety': {
      const ninetyPoint = created + totalDuration * 0.9;
      if (ninetyPoint > now) return new Date(ninetyPoint);
      if (sevenDaysBefore > now) return new Date(sevenDaysBefore);
      return null;
    }
    case 'week':
      return sevenDaysBefore > now ? new Date(sevenDaysBefore) : null;
    case 'done':
      return null;
    default:
      return null;
  }
}

export function getNextStage(current: NotificationStage): NotificationStage {
  switch (current) {
    case 'half': return 'three_quarter';
    case 'three_quarter': return 'ninety';
    case 'ninety': return 'week';
    case 'week': return 'done';
    default: return 'done';
  }
}

export function getStageLabel(stage: NotificationStage): string {
  const t = getT();
  switch (stage) {
    case 'half': return t('stages.half');
    case 'three_quarter': return t('stages.three_quarter');
    case 'ninety': return t('stages.ninety');
    case 'week': return t('stages.week');
    case 'done': return t('stages.done');
  }
}

export async function scheduleItemNotification(item: InventoryItem) {
  if (isExpoGo || item.status !== 'active') return;
  try {
    await cancelItemNotification(item.id);
    const t = getT();

    const nextTime = getNextNotificationTime(item);
    if (nextTime && nextTime > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${item.id}_smart`,
        content: {
          title: t('notification.expiryTitle'),
          body: buildNotificationBody(item, t),
          data: { itemId: item.id, stage: item.notificationStage ?? 'half' },
        },
        trigger: { date: nextTime } as any,
      });
    }

    if (item.expiryDate) {
      const sevenDaysBefore = new Date(item.expiryDate - 7 * 24 * 60 * 60 * 1000);
      if (sevenDaysBefore > new Date()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${item.id}_week`,
          content: {
            title: t('notification.expirySoonTitle'),
            body: t('notification.expirySoonBody', { name: item.name }),
            data: { itemId: item.id },
          },
          trigger: { date: sevenDaysBefore } as any,
        });
      }
    }
  } catch {}
}

function buildNotificationBody(item: InventoryItem, t: (key: string, p?: any) => string): string {
  const stage = item.notificationStage ?? 'half';
  if (!item.expiryDate) return t('notification.noExpiryBody', { name: item.name });

  const daysLeft = Math.ceil((item.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
  const params = { name: item.name, days: daysLeft };

  switch (stage) {
    case 'half':         return t('notification.halfBody', params);
    case 'three_quarter':return t('notification.threeQuarterBody', params);
    case 'ninety':       return t('notification.ninetyBody', params);
    default:             return t('notification.defaultBody', params);
  }
}

export async function cancelItemNotification(itemId: string) {
  if (isExpoGo) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`${itemId}_smart`);
    await Notifications.cancelScheduledNotificationAsync(`${itemId}_week`);
  } catch {}
}

export async function scheduleAllExpiryNotifications(items: InventoryItem[]) {
  if (isExpoGo) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const item of items) {
      if (item.status === 'active') {
        await scheduleItemNotification(item);
      }
    }
  } catch {}
}
