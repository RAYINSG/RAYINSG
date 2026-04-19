import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { zhTW, Translations } from './locales/zh-TW';
import { zhCN } from './locales/zh-CN';
import { en } from './locales/en';
import { id } from './locales/id';

// Lazy-load extra languages to keep startup fast
const loadExtra = async (lang: Language) => {
  switch (lang) {
    case 'th': return (await import('./locales/th')).th;
    case 'ja': return (await import('./locales/ja')).ja;
    case 'ko': return (await import('./locales/ko')).ko;
    case 'es': return (await import('./locales/es')).es;
    default: return zhTW;
  }
};

export type Language = 'zh-TW' | 'zh-CN' | 'en' | 'id' | 'th' | 'ja' | 'ko' | 'es';

export const LANGUAGE_LABELS: Record<Language, string> = {
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  'en':    'English',
  'id':    'Bahasa (ID/MY)',
  'th':    'ภาษาไทย',
  'ja':    '日本語',
  'ko':    '한국어',
  'es':    'Español',
};

// Preloaded locales (fast languages, always available)
const PRELOADED: Partial<Record<Language, Translations>> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN as Translations,
  'en':    en as Translations,
  'id':    id as Translations,
};

interface I18nState {
  language: Language;
  _locale: Translations;
  setLanguage: (lang: Language) => Promise<void>;
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      language: 'zh-TW',
      _locale: zhTW,
      setLanguage: async (lang: Language) => {
        let locale: Translations;
        if (PRELOADED[lang]) {
          locale = PRELOADED[lang]!;
        } else {
          locale = (await loadExtra(lang)) as Translations;
        }
        set({ language: lang, _locale: locale });
      },
    }),
    {
      name: 'i18n-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, reload the correct locale
        if (state && state.language) {
          const lang = state.language;
          if (PRELOADED[lang]) {
            state._locale = PRELOADED[lang]!;
          } else {
            loadExtra(lang).then(locale => {
              useI18n.setState({ _locale: locale as Translations });
            });
          }
        }
      },
    },
  ),
);

// Helper: interpolate {{key}} placeholders
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ''));
}

// Hook: use inside React components
export function useTranslation() {
  const { language, _locale } = useI18n();

  function t(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let value: any = _locale;
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value !== 'string') {
      // Fallback to zh-TW
      let fallback: any = zhTW;
      for (const part of parts) {
        fallback = fallback?.[part];
      }
      return typeof fallback === 'string' ? interpolate(fallback, params) : key;
    }
    return interpolate(value, params);
  }

  return { t, language };
}

// Non-hook version: use outside React (e.g. notifications)
export function getT(): (key: string, params?: Record<string, string | number>) => string {
  const locale = useI18n.getState()._locale;
  return (key: string, params?: Record<string, string | number>) => {
    const parts = key.split('.');
    let value: any = locale;
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value !== 'string') {
      let fallback: any = zhTW;
      for (const part of parts) {
        fallback = fallback?.[part];
      }
      return typeof fallback === 'string' ? interpolate(fallback, params) : key;
    }
    return interpolate(value, params);
  };
}
