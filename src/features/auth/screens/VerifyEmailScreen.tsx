import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/components/Button';
import { Colors, Spacing, FontSize } from '../../../shared/theme';
import { useTranslation } from '../../../i18n';

export function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { user, logout, resendVerification, checkVerification } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      Alert.alert(t('common.error'), t('auth.verifyResendFailed'));
    } finally {
      setResending(false);
    }
  }

  async function handleCheckVerified() {
    setChecking(true);
    try {
      const verified = await checkVerification();
      if (!verified) {
        Alert.alert(t('auth.verifyNotYetTitle'), t('auth.verifyNotYet'));
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📧</Text>
      <Text style={styles.title}>{t('auth.verifyTitle')}</Text>
      <Text style={styles.msg}>{t('auth.verifyMsg', { email: user?.email ?? '' })}</Text>

      <Button
        label={checking ? t('auth.verifyChecking') : t('auth.verifyContinue')}
        onPress={handleCheckVerified}
        loading={checking}
        style={styles.btn}
      />
      <Button
        label={resent ? t('auth.verifyResent') : t('auth.verifyResend')}
        onPress={handleResend}
        loading={resending}
        variant="outline"
        style={styles.btn}
      />
      <Text style={styles.logoutLink} onPress={logout}>
        {t('auth.verifyOtherAccount')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  msg: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  btn: { width: '100%', marginBottom: Spacing.sm },
  logoutLink: { marginTop: Spacing.lg, color: Colors.textSecondary, fontSize: FontSize.md, textDecorationLine: 'underline' },
});
