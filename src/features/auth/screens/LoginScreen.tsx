import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../types';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Colors, Spacing, FontSize } from '../../../shared/theme';
import { useTranslation } from '../../../i18n';
import { useI18n, LANGUAGE_LABELS, Language } from '../../../i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LANGUAGES = Object.entries(LANGUAGE_LABELS) as [Language, string][];

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { language, setLanguage } = useI18n();
  const { login, loginWithGoogle, sendReset, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  function validate(): boolean {
    const e = { email: '', password: '' };
    if (!email.includes('@')) e.email = t('auth.emailInvalid');
    if (password.length < 6) e.password = t('auth.passwordShort');
    setErrors(e);
    return !e.email && !e.password;
  }

  async function handleLogin() {
    if (!validate()) return;
    try {
      const firebaseUser = await login(email.trim(), password);
      if (firebaseUser && !firebaseUser.emailVerified) {
        navigation.navigate('VerifyEmail');
      }
    } catch (err: any) {
      Alert.alert(t('auth.loginFailed'), translateFirebaseError(err.code, t));
    }
  }

  async function handleGoogleLogin() {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('auth.googleFailed'), err.message);
      }
    }
  }

  async function handleForgotPassword() {
    if (!email.includes('@')) {
      Alert.alert(t('auth.forgotEmailHint'), t('auth.forgotEmailHintMsg'));
      return;
    }
    try {
      await sendReset(email.trim());
      Alert.alert(t('auth.forgotSent'), t('auth.forgotSentMsg'));
    } catch {
      Alert.alert(t('auth.forgotError'), t('auth.forgotErrorMsg'));
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Language selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langRow} contentContainerStyle={styles.langContent}>
          {LANGUAGES.map(([code, label]) => (
            <TouchableOpacity
              key={code}
              style={[styles.langBtn, language === code && styles.langBtnActive]}
              onPress={() => setLanguage(code)}
            >
              <Text style={[styles.langText, language === code && styles.langTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.header}>
          <Text style={styles.emoji}>🏠</Text>
          <Text style={styles.title}>HomeStore</Text>
          <Text style={styles.subtitle}>{t('auth.loginTitle')}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('auth.emailLbl')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            error={errors.email}
          />
          <Input
            label={t('auth.passwordLbl')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            placeholder={t('auth.passwordPlaceholder')}
            error={errors.password}
          />
          <Button label={t('auth.loginBtn')} onPress={handleLogin} loading={loading} style={styles.loginBtn} />
          <Button label={t('auth.forgotPassword')} onPress={handleForgotPassword} variant="outline" style={styles.forgotBtn} />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orDivider')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button label={t('auth.googleBtn')} onPress={handleGoogleLogin} loading={loading} variant="outline" style={styles.googleBtn} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            {t('auth.registerLink')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function translateFirebaseError(code: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':        t('auth.errUserNotFound'),
    'auth/wrong-password':        t('auth.errWrongPassword'),
    'auth/invalid-credential':    t('auth.errInvalidCredential'),
    'auth/invalid-email':         t('auth.errInvalidEmail'),
    'auth/too-many-requests':     t('auth.errTooManyRequests'),
    'auth/network-request-failed':t('auth.errNetworkFailed'),
    'auth/user-disabled':         t('auth.errUserDisabled'),
  };
  return map[code] ?? t('auth.errDefault');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: Colors.background, padding: Spacing.lg, justifyContent: 'center' },
  langRow: { marginBottom: Spacing.lg, flexGrow: 0 },
  langContent: { gap: 8, paddingVertical: 4 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  langBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  langText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  langTextActive: { color: '#fff', fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  emoji: { fontSize: 64, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.title, fontWeight: '700', color: Colors.primary },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  form: { marginBottom: Spacing.lg },
  loginBtn: { marginTop: Spacing.sm },
  forgotBtn: { marginTop: Spacing.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: Spacing.sm, color: Colors.textSecondary, fontSize: FontSize.sm },
  googleBtn: { marginBottom: Spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.md },
  link: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600', marginLeft: Spacing.xs },
});
