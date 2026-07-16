import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pl from './locales/pl.json'

void i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
  },
  lng: 'pl',
  fallbackLng: 'pl',
  initImmediate: false,
  keySeparator: '.',
  ignoreJSONStructure: false,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
})

export { i18n }
