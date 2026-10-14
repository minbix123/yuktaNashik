import Link from "next/link"
import { useRouter } from 'next/router'
import { useTranslation as usePagesTranslation } from 'next-i18next/pages'
import * as nextI18NextRoot from 'next-i18next'
import * as nextAuthReact from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'

function useSafeSession() {
  try {
    if (typeof nextAuthReact.useSession === 'function') {
      return nextAuthReact.useSession() || { data: null, status: 'unauthenticated' }
    }
  } catch {
    // Fallback when rendered outside <SessionProvider> in unit tests
  }
  return { data: null, status: 'unauthenticated' }
}

export default function Layout({ children }) {
  const useTranslation =
    typeof nextI18NextRoot.useTranslation === 'function' &&
    nextI18NextRoot.useTranslation !== usePagesTranslation
      ? nextI18NextRoot.useTranslation
      : usePagesTranslation

  const translationResult = useTranslation() || {}
  const t = translationResult.t || ((k) => k)
  const i18n = translationResult.i18n
  const router = useRouter() || { pathname: '/', asPath: '/', locale: 'en', push: () => {} }
  const { data: session } = useSafeSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)
  const currentLocale = router.locale || i18n?.language || 'en'
  const userRole = session?.user?.role

  useEffect(() => {
    if (!dropdownOpen) return undefined

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen])

  const changeLanguage = (locale) => {
    setDropdownOpen(false)
    i18n?.changeLanguage?.(locale)
    translationResult.changeLanguage?.(locale)
    router.push?.(router.pathname, router.asPath, { locale })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-blue-700 focus:shadow"
      >
        Skip to main content
      </a>
      <header className="bg-white shadow-md">
        <nav aria-label="Primary navigation" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
            <Link
              href="/"
              className="flex-shrink-0 text-xl font-semibold text-gray-800"
              aria-label={t('appName')}
            >
              {t('appName')}
            </Link>
            <div className="flex flex-wrap items-center gap-4 md:gap-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900"
                aria-current={router.pathname === '/' ? 'page' : undefined}
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/challenges"
                className="text-gray-700 hover:text-gray-900"
                aria-current={router.pathname?.startsWith('/challenges') ? 'page' : undefined}
              >
                {t('nav.challenges')}
              </Link>
              <Link
                href="/skill-passport"
                className="text-gray-700 hover:text-gray-900"
                aria-current={router.pathname === '/skill-passport' ? 'page' : undefined}
              >
                {t('nav.skillPassport')}
              </Link>
              {userRole === 'TEACHER' && (
                <Link
                  href="/teacher"
                  className="text-gray-700 hover:text-gray-900"
                  aria-current={router.pathname?.startsWith('/teacher') ? 'page' : undefined}
                >
                  Teacher Dashboard
                </Link>
              )}
              {userRole === 'MENTOR' && (
                <Link
                  href="/mentor"
                  className="text-gray-700 hover:text-gray-900"
                  aria-current={router.pathname?.startsWith('/mentor') ? 'page' : undefined}
                >
                  Mentor Dashboard
                </Link>
              )}
              {userRole === 'PARENT' && (
                <Link
                  href="/parent"
                  className="text-gray-700 hover:text-gray-900"
                  aria-current={router.pathname?.startsWith('/parent') ? 'page' : undefined}
                >
                  Parent Dashboard
                </Link>
              )}
              {userRole === 'SCHOOL_ADMIN' && (
                <Link
                  href="/admin/school-admin"
                  className="text-gray-700 hover:text-gray-900"
                  aria-current={router.pathname?.startsWith('/admin/school-admin') ? 'page' : undefined}
                >
                  School Admin Dashboard
                </Link>
              )}
              {userRole === 'PLATFORM_ADMIN' && (
                <Link
                  href="/admin/platform-admin"
                  className="text-gray-700 hover:text-gray-900"
                  aria-current={router.pathname?.startsWith('/admin/platform-admin') ? 'page' : undefined}
                >
                  Platform Admin Dashboard
                </Link>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && !dropdownOpen) {
                      event.preventDefault()
                      setDropdownOpen(true)
                    }
                  }}
                  className="flex items-center rounded text-gray-700 hover:text-gray-900"
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                  aria-controls="site-language-menu"
                >
                  <span>{t('nav.language')}</span>
                  <span className="ml-2" aria-hidden="true">
                    {t('languageNames.en')} / {t('languageNames.mr')}
                  </span>
                  <svg className="ml-1 h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <ul
                    id="site-language-menu"
                    role="menu"
                    aria-label={t('nav.language')}
                    className="absolute right-0 z-20 mt-2 w-36 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/10"
                  >
                    {['en', 'mr'].map((locale) => (
                      <li key={locale} role="none">
                        <button
                          type="button"
                          role="menuitem"
                          aria-current={currentLocale === locale ? 'true' : undefined}
                          onClick={() => changeLanguage(locale)}
                          className={`block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 ${currentLocale === locale ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          {t(`languageNames.${locale}`)}
                          {currentLocale === locale && <span className="sr-only"> (current language)</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>
      <main id="main-content" tabIndex="-1" className="mx-auto max-w-7xl py-6 focus:outline-none sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
