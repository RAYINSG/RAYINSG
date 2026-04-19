import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { analyzeProductImage } from '../../../services/gemini/analyze';
import { extractExpiryDateFromImage } from '../../../services/ocr/extractDate';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { Colors, Spacing, FontSize } from '../../../shared/theme';
import { useInventory } from '../../inventory/hooks/useInventory';
import { useTranslation } from '../../../i18n';

export function ScannerScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isPremium, canAddItem } = useInventory();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  function goToAddItem(uri: string | null, aiResult?: any, ocrExpiry?: string) {
    if (!canAddItem()) {
      Alert.alert(t('addItem.limitTitle'), t('addItem.limitMsg'), [
        { text: t('addItem.limitCancel'), style: 'cancel', onPress: () => setPhotoUri(null) },
      ]);
      return;
    }
    navigation.navigate('Inventory', {
      screen: 'AddItem',
      params: { photoUri: uri ?? undefined, aiResult, ocrExpiry },
    });
  }

  async function pickFromCamera() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert(t('scanner.cameraPermission'), t('scanner.cameraPermissionMsg'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handlePhotoReady(uri: string) {
    setAnalyzing(true);
    let ocrExpiry: string | undefined;
    try {
      const date = await extractExpiryDateFromImage(uri);
      if (date) ocrExpiry = date.toISOString().split('T')[0];
    } catch {}
    setAnalyzing(false);

    const hint = ocrExpiry ? t('scanner.ocrDetected', { date: ocrExpiry }) : '';

    if (!isPremium) {
      Alert.alert(t('scanner.selectMethod'), `${t('scanner.photoSelected')}${hint}`, [
        { text: t('scanner.manualInput'), onPress: () => goToAddItem(uri, undefined, ocrExpiry) },
        {
          text: t('scanner.aiSubscriptionRequired'),
          onPress: () => Alert.alert('', t('scanner.aiSubscriptionMsg')),
        },
        { text: t('scanner.cancelPhoto'), style: 'cancel', onPress: () => setPhotoUri(null) },
      ]);
    } else {
      Alert.alert(t('scanner.selectMethod'), `${t('scanner.photoSelected')}${hint}`, [
        { text: t('scanner.manualInput'), onPress: () => goToAddItem(uri, undefined, ocrExpiry) },
        { text: t('scanner.aiAnalysis'), onPress: () => runAiAnalysis(uri) },
        { text: t('scanner.cancelPhoto'), style: 'cancel', onPress: () => setPhotoUri(null) },
      ]);
    }
  }

  async function runAiAnalysis(uri: string) {
    setAnalyzing(true);
    try {
      const result = await analyzeProductImage(uri);
      goToAddItem(uri, result);
    } catch {
      Alert.alert(t('scanner.analysisFailed'), t('scanner.analysisFailedMsg'));
      goToAddItem(uri);
    } finally {
      setAnalyzing(false);
    }
  }

  React.useEffect(() => {
    if (photoUri && !analyzing) {
      handlePhotoReady(photoUri);
    }
  }, [photoUri]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('scanner.title')}</Text>
      <Text style={styles.subtitle}>{t('scanner.subtitle')}</Text>

      {analyzing ? (
        <Card style={styles.analyzingCard}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.analyzingText}>{t('scanner.analyzing')}</Text>
          <Text style={styles.analyzingSubText}>{t('scanner.analyzingSub')}</Text>
        </Card>
      ) : (
        <View style={styles.optionsWrapper}>
          <Card style={styles.optionCard}>
            <Text style={styles.optionEmoji}>📷</Text>
            <Text style={styles.optionTitle}>{t('scanner.cameraTitle')}</Text>
            <Text style={styles.optionDesc}>{t('scanner.cameraDesc')}</Text>
            <Button label={t('scanner.cameraBtn')} onPress={pickFromCamera} style={styles.optionBtn} />
          </Card>

          <Card style={styles.optionCard}>
            <Text style={styles.optionEmoji}>🖼️</Text>
            <Text style={styles.optionTitle}>{t('scanner.libraryTitle')}</Text>
            <Text style={styles.optionDesc}>{t('scanner.libraryDesc')}</Text>
            <Button label={t('scanner.libraryBtn')} onPress={pickFromLibrary} variant="outline" style={styles.optionBtn} />
          </Card>

          <Card style={styles.optionCard}>
            <Text style={styles.optionEmoji}>✏️</Text>
            <Text style={styles.optionTitle}>{t('scanner.manualTitle')}</Text>
            <Text style={styles.optionDesc}>{t('scanner.manualDesc')}</Text>
            <Button label={t('scanner.manualBtn')} onPress={() => goToAddItem(null)} variant="outline" style={styles.optionBtn} />
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  analyzingCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  analyzingText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  analyzingSubText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  optionsWrapper: { gap: Spacing.md },
  optionCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  optionEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  optionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  optionDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.md },
  optionBtn: { width: '100%' },
});
