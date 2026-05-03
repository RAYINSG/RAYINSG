import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../types';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Colors, Spacing, FontSize } from '../../../shared/theme';
import { useTranslation } from '../../../i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({ name: '', email: '', password: '', confirm: '' });

  function validate(): boolean {
    const e = { name: '', email: '', password: '', confirm: '' };
    if (!name.trim()) e.name = t('auth.nameEmpty');
    if (!email.includes('@')) e.email = t('auth.emailInvalid');
    if (password.length < 6) e.password = t('auth.passwordShort');
    if (password !== confirm) e.confirm = t('auth.passwordMismatch');
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  async function handleRegister() {
    if (!validate()) return;
    try {
      await register(email.trim(), password, name.trim());
      navigation.navigate('VerifyEmail');
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? t('auth.emailInUse')
        : t('auth.registerFailedDefault');
      Alert.alert(t('auth.registerFailed'), msg);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.registerTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

        <View style={styles.form}>
          <Input label={t('auth.nameLbl')} value={name} onChangeText={setName} placeholder={t('auth.namePlaceholder')} error={errors.name} />
          <Input
            label={t('auth.emailLbl')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={t('auth.emailPlaceholder')}
            error={errors.email}
          />
          <Input label={t('auth.passwordLbl')} value={password} onChangeText={setPassword} secureTextEntry secureToggle placeholder={t('auth.passwordPlaceholder')} error={errors.password} />
          <Input label={t('auth.confirmPasswordLbl')} value={confirm} onChangeText={setConfirm} secureTextEntry secureToggle placeholder={t('auth.confirmPlaceholder')} error={errors.confirm} />
          <Button label={t('auth.registerBtn')} onPress={handleRegister} loading={loading} style={styles.btn} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
          <Text style={styles.link} onPress={() => navigation.goBack()}>{t('auth.loginLink')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginTop: Spacing.xxl },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  form: { marginBottom: Spacing.xl },
  btn: { marginTop: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.md },
  link: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600', marginLeft: Spacing.xs },
});
