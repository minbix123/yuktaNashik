const { render, screen } = require('@testing-library/react');
const HomeModule = require('../../pages/index');
const Home = HomeModule.default || HomeModule;

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

const createTranslationHook = () => ({
  t: (key) => {
    const translations = {
      'common.loading': 'Loading...',
      'appName': 'Yukta Nashik',
      'nav.home': 'Home',
      'nav.challenges': 'Challenges',
      'nav.skillPassport': 'Skill Passport',
      'nav.language': 'Language',
      'languageNames.en': 'English',
      'languageNames.mr': 'Marathi',
      'challenges.description': 'Explore hands-on learning challenges',
      'auth.signIn': 'Sign In',
      'dashboard.welcome': 'Welcome',
      'roles.teacher': 'Teacher',
      'roles.schoolAdmin': 'School Admin'
    };
    return translations[key] || key;
  },
  i18n: {
    language: 'en',
    changeLanguage: jest.fn()
  }
});

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: () => createTranslationHook()
}));

jest.mock('next-i18next/pages', () => ({
  useTranslation: () => createTranslationHook()
}), { virtual: true });

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state when session is loading', () => {
    require('next-auth/react').useSession.mockReturnValue({
      data: null,
      status: 'loading'
    });

    render(<Home />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows sign-in page when user is not authenticated', () => {
    require('next-auth/react').useSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Yukta Nashik' })).toBeInTheDocument();
    expect(screen.getByText('Explore hands-on learning challenges')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows dashboard for student user', () => {
    require('next-auth/react').useSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          role: 'STUDENT'
        }
      },
      status: 'authenticated'
    });

    render(<Home />);

    expect(screen.getByText(/Home\s*,\s*John Doe!/)).toBeInTheDocument();
    expect(screen.getByText('Welcome, John Doe! Explore hands-on learning challenges')).toBeInTheDocument();
  });

  it('shows teacher role-specific content', () => {
    require('next-auth/react').useSession.mockReturnValue({
      data: {
        user: {
          name: 'Jane Smith',
          role: 'TEACHER'
        }
      },
      status: 'authenticated'
    });

    render(<Home />);

    expect(screen.getByText(/Home\s*,\s*Jane Smith!/)).toBeInTheDocument();
    expect(screen.getByText('Sign In as Teacher')).toBeInTheDocument();
  });

  it('shows school admin role-specific content', () => {
    require('next-auth/react').useSession.mockReturnValue({
      data: {
        user: {
          name: 'Admin User',
          role: 'SCHOOL_ADMIN'
        }
      },
      status: 'authenticated'
    });

    render(<Home />);

    expect(screen.getByText(/Home\s*,\s*Admin User!/)).toBeInTheDocument();
    expect(screen.getByText('Sign In as School Admin')).toBeInTheDocument();
  });
});