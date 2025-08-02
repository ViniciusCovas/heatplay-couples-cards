import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import ptTranslations from './locales/pt.json';
import frTranslations from './locales/fr.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  es: {
    translation: esTranslations,
  },
  pt: {
    translation: ptTranslations,
  },
  fr: {
    translation: frTranslations,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })
  .then(() => {
    if (import.meta.env?.DEV) {
      console.log('🌍 i18n initialized with language:', i18n.language);
      console.log('🌍 Available languages:', Object.keys(resources));
      console.log('🌍 Browser language:', navigator.language);
    }
  });

export default i18n;