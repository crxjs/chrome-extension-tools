import { I18nextProvider, useTranslation } from 'react-i18next'
import { i18n } from './i18n'

function Translation() {
  const { t } = useTranslation(undefined, { i18n })
  return <p data-testid='translation'>{t('greeting')}</p>
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Translation />
    </I18nextProvider>
  )
}
