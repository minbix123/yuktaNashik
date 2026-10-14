// Jest setup file
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { expect } = require('@jest/globals');
require('@testing-library/jest-dom');

const mockI18n = {
  language: 'en',
  changeLanguage: jest.fn(),
};

const mockRouter = {
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  locale: 'en',
  locales: ['en', 'mr'],
  push: jest.fn((pathname, asPath, options) => {
    if (options && options.locale) {
      mockI18n.changeLanguage(options.locale);
    }
    return Promise.resolve(true);
  }),
  replace: jest.fn().mockResolvedValue(true),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn().mockResolvedValue(undefined),
};

// Mock next/router (Pages Router)
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => mockRouter),
}));

// Mock next/navigation (App Router)
const mockNavigationRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  query: {},
};

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => mockNavigationRouter),
  usePathname: jest.fn(() => ''),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const defaultTranslations = {
  'appName': 'Yukta Nashik',
  'nav.home': 'Home',
  'nav.challenges': 'Challenges',
  'nav.skillPassport': 'Skill Passport',
  'nav.language': 'Language',
  'languageNames.en': 'English',
  'languageNames.mr': 'Marathi',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.noData': 'No challenges found',
  'auth.signIn': 'Sign In',
  'dashboard.welcome': 'Welcome',
  'roles.teacher': 'Teacher',
  'roles.schoolAdmin': 'School Admin',
  'challenges.title': 'Learning Challenges',
  'challenges.availableChallenges': 'Learning Challenges',
  'challenges.description': 'Explore hands-on learning challenges',
  'challenges.signInPrompt': 'Explore hands-on learning challenges',
  'challenges.startProject': 'Start Project',
  'challenges.grade': 'Grade',
  'challenges.subject': 'Subject',
};

const createTranslationHook = () => ({
  t: (str) => defaultTranslations[str] || str,
  i18n: mockI18n,
  changeLanguage: mockI18n.changeLanguage,
});

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: () => createTranslationHook(),
  appWithTranslation: (Component) => Component,
  serverSideTranslations: jest.fn().mockResolvedValue({}),
}));

// Mock next-i18next/pages
jest.mock('next-i18next/pages', () => ({
  useTranslation: () => createTranslationHook(),
  appWithTranslation: (Component) => Component,
  serverSideTranslations: jest.fn().mockResolvedValue({}),
}), { virtual: true });

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', email: 'test@example.com', role: 'STUDENT' } },
    status: 'authenticated'
  })),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

// Normalize @testing-library/user-event default export when required via CommonJS under SWC
jest.mock('@testing-library/user-event', () => {
  const actual = jest.requireActual('@testing-library/user-event');
  const base = actual.default || actual;
  return Object.assign(base, actual, { default: base });
});

// ResizeObserver mock for Jest
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = jest.fn().mockImplementation(() => new ResizeObserver());