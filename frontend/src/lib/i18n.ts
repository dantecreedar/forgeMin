import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './translations';

const initialLanguage =
  typeof window !== 'undefined'
    ? localStorage.getItem('forgemind_language') || 'es'
    : 'es';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: translations.es },
      en: { translation: translations.en },
    },
    lng: initialLanguage,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
