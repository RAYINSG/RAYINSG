import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useI18n, LANGUAGE_LABELS, Language } from '../../../i18n';
import Constants from 'expo-constants';
import { AD_UNITS } from '../../../services/ads/adService';
const isExpoGo = Constants.appOwnership === 'expo' || __DEV__;
let BannerAd: any, BannerAdSize: any;
if (!isExpoGo) {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
}
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/hooks/useAuth';
import { useInventory } from '../hooks/useInventory';
import { Card } from '../../../shared/components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../shared/theme';
import { getExpiryStatus } from '../../../shared/utils/date';
import { getCategoryIcon } from '../../../shared/utils/category';
import { useTranslation } from '../../../i18n';

export function HomeScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useI18n();
  const { user } = useAuth();
  const { items, subscribe, loadLocations, isPremium } = useInventory();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribe(user.uid);
    loadLocations(user.uid);
    return unsubscribe;
  }, [user?.uid]);

  const active = items
    .filter(i => i.status === 'active')
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate - b.expiryDate;
    });

  const expiringSoon = active
    .filter(i => getExpiryStatus(i.expiryDate) === 'soon')
    .sort((a, b) => (a.expiryDate ?? 0) - (b.expiryDate ?? 0));

  const expired = items
    .filter(i => i.status === 'active' && getExpiryStatus(i.expiryDate) === 'expired')
    .sort((a, b) => (b.expiryDate ?? 0) - (a.expiryDate ?? 0));

  function goToFilter(filter: string) {
    navigation.navigate('Inventory', { screen: 'InventoryList', params: { filter } });
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{t('home.greeting', { name: user?.displayName ?? '' })}</Text>
            <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langRow} contentContainerStyle={styles.langRowContent}>
          {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
            <TouchableOpacity
              key={code}
              style={[styles.langChip, language === code && styles.langChipActive]}
              onPress={() => setLanguage(code)}
            >
              <Text style={[styles.langChipText, language === code && styles.langChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.statsRow}>
          <StatCard emoji="📦" count={active.length} label={t('home.statActive')} color={Colors.primary} onPress={() => goToFilter('active')} />
          <StatCard emoji="⚠️" count={expiringSoon.length} label={t('home.statSoon')} color={Colors.warning} onPress={() => goToFilter('soon')} />
          <StatCard emoji="❌" count={expired.length} label={t('home.statExpired')} color={Colors.error} onPress={() => goToFilter('expired')} />
        </View>

        {expiringSoon.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.sectionSoon')}</Text>
            {expiringSoon.map(item => (
              <TouchableOpacity key={item.id} onPress={() => navigation.navigate('Inventory', { screen: 'ItemDetail', params: { itemId: item.id } })}>
                <Card style={styles.alertCard}>
                  <Text style={styles.alertEmoji}>{getCategoryIcon(item.category)}</Text>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertName}>{item.name}</Text>
                    {item.locationName && <Text style={styles.alertLoc}>{t('home.location', { location: item.locationName })}</Text>}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {expired.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.sectionExpired')}</Text>
            {expired.slice(0, 5).map(item => (
              <Card key={item.id} style={[styles.alertCard, styles.expiredCard]}>
                <Text style={styles.alertEmoji}>{getCategoryIcon(item.category)}</Text>
                <Text style={styles.alertName}>{item.name}</Text>
              </Card>
            ))}
          </View>
        )}

        {active.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏠</Text>
            <Text style={styles.emptyText}>{t('home.empty')}</Text>
            <Text style={styles.emptySubText}>{t('home.emptySub')}</Text>
          </Card>
        )}
      </ScrollView>

      {/* Banner 廣告固定在畫面底部，永遠可見 */}
      {!isPremium && !isExpoGo && BannerAd && (
        <BannerAd unitId={AD_UNITS.BANNER} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      )}
    </View>
  );
}

function StatCard({ emoji, count, label, color, onPress }: {
  emoji: string; count: number; label: string; color: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.statCard, { borderTopColor: color }]} onPress={onPress} disabled={!onPress}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  headerText: { flex: 1 },
  greeting: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
  langRow: { marginBottom: Spacing.xl },
  langRowContent: { flexDirection: 'row', gap: Spacing.xs, paddingBottom: Spacing.xs },
  langChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  langChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  langChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  langChipTextActive: { color: '#fff', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', borderTopWidth: 3,
    ...require('../../../shared/theme').Shadow.sm,
  },
  statEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  statCount: { fontSize: FontSize.xxl, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  expiredCard: { backgroundColor: Colors.expired },
  alertEmoji: { fontSize: 28 },
  alertInfo: { flex: 1 },
  alertName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  alertLoc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary },
  emptySubText: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: Spacing.xs },
});
