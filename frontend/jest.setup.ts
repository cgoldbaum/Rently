import '@testing-library/jest-dom'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources, DEFAULT_LANGUAGE, DEFAULT_NS, NAMESPACES } from '@rently/shared'

// Inicializa la instancia default de i18next para que `useTranslation()` sin
// <I18nextProvider> devuelva traducciones reales (es) en los tests.
i18next.use(initReactI18next).init({
  resources,
  lng: 'es',
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: DEFAULT_NS,
  ns: NAMESPACES as unknown as string[],
  interpolation: { escapeValue: false },
  returnNull: false,
})
