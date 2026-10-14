const { render, screen } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event');
const LayoutModule = require('../../components/layout');
const Layout = LayoutModule.default || LayoutModule;

const mockChangeLanguage = jest.fn();
const mockPush = jest.fn((pathname, asPath, options) => {
  if (options && options.locale) {
    mockChangeLanguage(options.locale);
  }
  return Promise.resolve(true);
});

const mockRouter = {
  pathname: '/',
  asPath: '/',
  locale: 'en',
  locales: ['en', 'mr'],
  push: mockPush,
};

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return mockRouter;
  }
}));

const createTranslationHook = () => ({
  t: (key) => {
    const translations = {
      'appName': 'Yukta Nashik',
      'nav.home': 'Home',
      'nav.challenges': 'Challenges',
      'nav.skillPassport': 'Skill Passport',
      'nav.language': 'Language',
      'languageNames.en': 'English',
      'languageNames.mr': 'Marathi'
    };
    return translations[key] || key;
  },
  i18n: {
    language: 'en',
    changeLanguage: mockChangeLanguage
  },
  changeLanguage: mockChangeLanguage
});

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: () => createTranslationHook()
}));

jest.mock('next-i18next/pages', () => ({
  useTranslation: () => createTranslationHook()
}), { virtual: true });

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the app name and navigation links', () => {
    render(<Layout><div>Test Content</div></Layout>);

    // Check that the app name is rendered
    expect(screen.getByText('Yukta Nashik')).toBeInTheDocument();

    // Check navigation links
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Challenges')).toBeInTheDocument();
    expect(screen.getByText('Skill Passport')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('renders children content', () => {
    const testContent = <div data-testid="test-content">Test Content</div>;
    render(<Layout>{testContent}</Layout>);

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('has skip to main content link', () => {
    render(<Layout><div>Test</div></Layout>);

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
  });

  describe('Language Dropdown', () => {
    it('shows language dropdown button', () => {
      render(<Layout><div>Test</div></Layout>);

      const languageButton = screen.getByRole('button', {
        name: /language/i
      });
      expect(languageButton).toBeInTheDocument();
    });

    it('toggles language dropdown on button click', async () => {
      render(<Layout><div>Test</div></Layout>);

      const languageButton = screen.getByRole('button', {
        name: /language/i
      });

      // Initially dropdown should be closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Click to open
      await userEvent.click(languageButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click to close
      await userEvent.click(languageButton);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('changes language when menu item is clicked', async () => {
      const { changeLanguage } = require('next-i18next').useTranslation();

      render(<Layout><div>Test</div></Layout>);

      const languageButton = screen.getByRole('button', {
        name: /language/i
      });

      // Open dropdown
      await userEvent.click(languageButton);

      // Click Marathi option
      const marathiOption = screen.getByRole('menuitem', {
        name: /marathi/i
      });
      await userEvent.click(marathiOption);

      // Verify language change was triggered with 'mr'
      expect(mockPush).toHaveBeenCalledWith('/', '/', { locale: 'mr' });
      expect(changeLanguage).toHaveBeenCalledWith('mr');
    });
  });
});