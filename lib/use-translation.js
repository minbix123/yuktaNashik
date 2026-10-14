import { useTranslation as usePagesTranslation } from 'next-i18next/pages'
import * as nextI18NextRoot from 'next-i18next'

export function useTranslationHook(ns = 'common') {
  const useTranslationFn =
    typeof nextI18NextRoot.useTranslation === 'function' &&
    nextI18NextRoot.useTranslation !== usePagesTranslation
      ? nextI18NextRoot.useTranslation
      : usePagesTranslation

  const { t, i18n } = useTranslationFn(ns)

  return {
    t,
    i18n,
    currentLanguage: i18n?.language || 'en',
    changeLanguage: (lng) => i18n?.changeLanguage?.(lng),
  }
}

export default useTranslationHook
