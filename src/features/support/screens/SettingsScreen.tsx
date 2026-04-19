import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TextInput, TouchableOpacity, Linking,
} from 'react-native';
import { useAuth } from '../../auth/hooks/useAuth';
import { useInventory } from '../../inventory/hooks/useInventory';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../shared/theme';
import { useTranslation, useI18n, LANGUAGE_LABELS, Language } from '../../../i18n';

const SUPPORT_EMAIL = 'chijui_yen@hotmail.com';
const FREE_ITEM_LIMIT = 10;

export function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useI18n();
  const { user, logout } = useAuth();
  const { items, isPremium, setPremium } = useInventory();
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

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
            <Button label={t('settings.upgradeBtn')} onPress={() => {
              Alert.alert(t('settings.upgradeTitle'), t('settings.upgradeMsg'), [{ text: t('settings.upgradeOk'), style: 'cancel' }]);
            }} style={styles.upgradeBtn} />
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
  upgradeBtn: { marginTop: Spacing.sm },
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
