import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import { appWithTranslation } from 'next-i18next/pages'
import ErrorBoundary from '../components/ErrorBoundary'
import enCommon from '../locales/en/common.json'
import mrCommon from '../locales/mr/common.json'

function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps?.session}>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </SessionProvider>
  )
}

export default appWithTranslation(MyApp, {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'mr'],
  },
  defaultNS: 'common',
  ns: ['common'],
  resources: {
    en: { common: enCommon },
    mr: { common: mrCommon },
  },
})