import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TextInput, TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../auth/hooks/useAuth';
import { useInventory } from '../../inventory/hooks/useInventory';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../shared/theme';
import { useTranslation, useI18n, LANGUAGE_LABELS, Language } from '../../../i18n';
import {
  initIAP,
  getPremiumProduct,
  purchasePremium,
  restorePremiumPurchase,
  listenPurchaseUpdates,
} from '../../../services/iap/purchase';

const SUPPORT_EMAIL = 'chijuiyen@hotmail.com';
const FREE_ITEM_LIMIT = 10;

export function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useI18n();
  const { user, logout } = useAuth();
  const { items, isPremium, setPremium } = useInventory();
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [productPrice, setProductPrice] = useState<string>('NT$500');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    // 初始化 IAP 並取得實際價格
    initIAP().then(() => {
      getPremiumProduct().then(p => {
        if (p?.localizedPrice) setProductPrice(p.localizedPrice);
      });
      listenPurchaseUpdates(
        () => {
          setPremium(true);
          setPurchasing(false);
          Alert.alert('🎉', t('settings.purchaseSuccess'));
        },
        (msg) => {
          setPurchasing(false);
          Alert.alert(t('common.error'), msg);
        },
      );
    });
  }, []);

  async function handlePurchase() {
    setPurchasing(true);
    try {
      await purchasePremium();
      // 結果由 listenPurchaseUpdates 處理
    } catch {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const purchased = await restorePremiumPurchase();
      if (purchased) {
        setPremium(true);
        Alert.alert('✅', t('settings.restoreSuccess'));
      } else {
        Alert.alert('', t('settings.restoreNotFound'));
      }
    } catch {
      Alert.alert(t('common.error'), t('settings.restoreError'));
    } finally {
      setRestoring(false);
    }
  }

  const activeCount = items.filter(i => i.status !== 'consumed').length;

  async function handleSendFeedback() {
    if (!feedbackText.trim()) {
      Alert.alert('', t('settings.feedbackEmpty'));
      return;
    }
    setSendingFeedback(true);
    try {
      const subject = encodeURIComponent('HomeStore App Feedback');
      const body = encodeURIComponent(
        `User: ${user?.email ?? 'unknown'}\nUID: ${user?.uid ?? ''}\n\n${feedbackText}`,
      );
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
      setFeedbackText('');
    } catch {
      Alert.alert(t('common.error'), t('settings.feedbackError', { email: SUPPORT_EMAIL }));
    } finally {
      setSendingFeedback(false);
    }
  }

  async function handleLogout() {
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutMsg'), [
      { text: t('common.cancel') },
      { text: t('settings.logout'), style: 'destructive', onPress: logout },
    ]);
  }

  const LANGUAGES = Object.entries(LANGUAGE_LABELS) as [Language, string][];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account */}
      <Text style={styles.sectionTitle}>{t('settings.accountSection')}</Text>
      <Card style={styles.accountCard}>
        <Text style={styles.accountName}>{user?.displayName ?? t('settings.userName')}</Text>
        <Text style={styles.accountEmail}>{user?.email}</Text>
      </Card>

      {/* Plan */}
      <Text style={styles.sectionTitle}>{t('settings.planSection')}</Text>
      <Card style={[styles.planCard, isPremium && styles.premiumCard]}>
        {isPremium ? (
          <>
            <Text style={styles.planBadge}>{t('settings.premiumPlan')}</Text>
            <Text style={styles.planDesc}>{t('settings.premiumDesc')}</Text>
          </>
        ) : (
          <>
            <Text style={styles.planBadge}>{t('settings.freePlan')}</Text>
            <Text style={styles.planUsage}>{t('settings.freeUsage', { count: activeCount, limit: FREE_ITEM_LIMIT })}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min((activeCount / FREE_ITEM_LIMIT) * 100, 100)}%` }]} />
            </View>
            <Text style={styles.planDesc}>{t('settings.freeDesc')}</Text>

            {/* 買斷升級卡片 */}
            <View style={styles.upgradeBox}>
              <Text style={styles.upgradePriceLabel}>🔓 {t('settings.upgradeTitle')}</Text>
              <Text style={styles.upgradeFeatures}>
                ✓ {t('settings.featureUnlimited')}{'\n'}
                ✓ {t('settings.featureAI')}{'\n'}
                ✓ {t('settings.featureLifetime')}
              </Text>
              <Text style={styles.upgradePrice}>{productPrice}</Text>
              <Button
                label={purchasing ? t('settings.purchasing') : t('settings.upgradeBtn')}
                onPress={handlePurchase}
                loading={purchasing}
                style={styles.upgradeBtn}
              />
              <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                {restoring
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.restoreText}>{t('settings.restorePurchase')}</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        )}
      </Card>

      {/* Language */}
      <Text style={styles.sectionTitle}>{t('settings.languageSection')}</Text>
      <Card>
        <View style={styles.langGrid}>
          {LANGUAGES.map(([code, label]) => (
            <TouchableOpacity
              key={code}
              style={[styles.langChip, language === code && styles.langChipActive]}
              onPress={() => setLanguage(code)}
            >
              <Text style={[styles.langText, language === code && styles.langTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Feedback */}
      <Text style={styles.sectionTitle}>{t('settings.feedbackSection')}</Text>
      <Card>
        <Text style={styles.feedbackLabel}>{t('settings.feedbackLabel')}</Text>
        <TextInput
          style={styles.feedbackInput}
          value={feedbackText}
          onChangeText={setFeedbackText}
          placeholder={t('settings.feedbackPlaceholder')}
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <Button label={t('settings.sendFeedback')} onPress={handleSendFeedback} loading={sendingFeedback} variant="outline" style={styles.feedbackBtn} />
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={styles.emailLink}>{t('settings.supportEmail', { email: SUPPORT_EMAIL })}</Text>
        </TouchableOpacity>
      </Card>

      {/* About */}
      <Text style={styles.sectionTitle}>{t('settings.aboutSection')}</Text>
      <Card style={styles.aboutCard}>
        <Text style={styles.aboutText}>{t('settings.appName')}</Text>
        <Text style={styles.aboutSubText}>{t('settings.appDesc')}</Text>
        <TouchableOpacity style={styles.privacyRow} onPress={() => Linking.openURL('https://rayinsg.github.io/homestore-privacy')}>
          <Text style={styles.privacyLink}>{t('settings.privacyPolicy')}</Text>
        </TouchableOpacity>
      </Card>

      <Button label={t('settings.logout')} onPress={handleLogout} variant="outline" style={styles.logoutBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md },
  accountCard: { gap: Spacing.xs },
  accountName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  accountEmail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  planCard: {},
  premiumCard: { borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  planBadge: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  planUsage: { fontSize: FontSize.sm, color: Colors.textSecondary },
  progressBar: {
    height: 6, backgroundColor: Colors.border, borderRadius: BorderRadius.full,
    marginVertical: Spacing.sm, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  planDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  upgradeBox: {
    marginTop: Spacing.sm, backgroundColor: '#F1F8E9',
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary,
  },
  upgradePriceLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primaryDark, marginBottom: Spacing.sm },
  upgradeFeatures: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 22, marginBottom: Spacing.sm },
  upgradePrice: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  upgradeBtn: { marginTop: Spacing.xs },
  restoreBtn: { alignItems: 'center', marginTop: Spacing.sm, padding: Spacing.sm },
  restoreText: { fontSize: FontSize.sm, color: Colors.primary },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  langChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  langChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  langText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  langTextActive: { color: '#fff', fontWeight: '600' },
  feedbackLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  feedbackInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.md, color: Colors.text, height: 100,
    marginBottom: Spacing.sm,
  },
  feedbackBtn: {},
  emailLink: { fontSize: FontSize.xs, color: Colors.primary, marginTop: Spacing.sm, textAlign: 'center' },
  aboutCard: { alignItems: 'center' },
  aboutText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  aboutSubText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  privacyRow: { marginTop: Spacing.sm },
  privacyLink: { fontSize: FontSize.sm, color: Colors.primary },
  logoutBtn: { marginTop: Spacing.md, marginBottom: Spacing.xxl },
});
