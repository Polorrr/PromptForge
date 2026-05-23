import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import zh from './locales/zh/translation.json';

function getInitialLanguage(): string {
  try {
    const stored = localStorage.getItem('promptforge-app');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.language === 'zh' || state?.language === 'en') {
        return state.language;
      }
    }
  } catch {}
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
