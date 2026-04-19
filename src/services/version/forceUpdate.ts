import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getT } from '../../i18n';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kk1744.homestoreapp';

function parseVersion(v: string): number[] {
  return v.split('.').map(n => parseInt(n, 10) || 0);
}

function isVersionLess(current: string, minimum: string): boolean {
  const c = parseVersion(current);
  const m = parseVersion(minimum);
  for (let i = 0; i < Math.max(c.length, m.length); i++) {
    const cv = c[i] ?? 0;
    const mv = m[i] ?? 0;
    if (cv < mv) return true;
    if (cv > mv) return false;
  }
  return false;
}

export async function checkForceUpdate(): Promise<void> {
  try {
    const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
    const snap = await getDoc(doc(db, 'config', 'appConfig'));
    if (!snap.exists()) return;

    const data = snap.data();
    const minVersion: string = data?.minVersion ?? '1.0.0';

    if (isVersionLess(currentVersion, minVersion)) {
      const t = getT();
      Alert.alert(
        t('forceUpdate.title'),
        t('forceUpdate.message'),
        [
          {
            text: t('forceUpdate.updateBtn'),
            onPress: () => {
              Linking.openURL(PLAY_STORE_URL);
              // Show again after returning (iOS only; Android handles via Play Store)
            },
          },
        ],
        { cancelable: false },
      );
    }
  } catch {
    // Network failure — skip silently, don't block the user
  }
}
