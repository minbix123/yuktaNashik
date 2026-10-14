const { render, screen, waitFor } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event');
const ChallengesPageModule = require('../../pages/challenges');
const ChallengesPage = ChallengesPageModule.default || ChallengesPageModule;

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

const mockChangeLanguage = jest.fn();
const mockPush = jest.fn((pathname, asPath, options) => {
  if (options && options.locale) {
    mockChangeLanguage(options.locale);
  }
  return Promise.resolve(true);
});

const createTranslationHook = () => ({
  t: (key) => {
    const translations = {
      'appName': 'Yukta Nashik',
      'nav.home': 'Home',
      'nav.challenges': 'Challenges',
      'nav.skillPassport': 'Skill Passport',
      'nav.language': 'Language',
      'languageNames.en': 'English',
      'languageNames.mr': 'Marathi',
      'challenges.title': 'Learning Challenges',
      'challenges.availableChallenges': 'Learning Challenges',
      'challenges.description': 'Explore hands-on learning challenges',
      'challenges.signInPrompt': 'Explore hands-on learning challenges',
      'challenges.newChallenge': 'New Challenge',
      'challenges.startProject': 'Start Project',
      'challenges.filter': 'Filter',
      'challenges.subject': 'Subject',
      'challenges.grade': 'Grade',
      'challenges.search': 'Search challenges...',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.retry': 'Retry',
      'common.noData': 'No challenges found',
      'challenges.noChallenges': 'No challenges found',
      'actions.viewDetails': 'View Details',
      'challenges.gradeAll': 'All Grades',
      'challenges.subjectAll': 'All Subjects',
      'auth.signIn': 'Sign In'
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

// Mock router
const mockRouter = {
  pathname: '/challenges',
  asPath: '/challenges',
  locale: 'en',
  locales: ['en', 'mr'],
  query: {},
  push: mockPush,
  prefetch: jest.fn()
};

jest.mock('next/router', () => ({
  useRouter() {
    return mockRouter;
  }
}));

describe('Challenges Page', () => {
  const mockChallenges = [
    {
      id: 'challenge1',
      title: 'Science Experiment',
      description: 'Conduct a science experiment',
      grade: 5,
      subject: 'Science',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'challenge2',
      title: 'Math Project',
      description: 'Build a math model',
      grade: 6,
      subject: 'Math',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ challenges: mockChallenges })
    });
  });

  describe('Authentication States', () => {
    it('shows loading state when session is loading', () => {
      require('next-auth/react').useSession.mockReturnValue({
        data: null,
        status: 'loading'
      });

      render(<ChallengesPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows sign-in prompt when user is not authenticated', () => {
      require('next-auth/react').useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(<ChallengesPage />);

      expect(screen.getByText('Learning Challenges')).toBeInTheDocument();
      expect(screen.getByText('Explore hands-on learning challenges')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows challenges page when user is authenticated', async () => {
      require('next-auth/react').useSession.mockReturnValue({
        data: {
          user: {
            id: 'user1',
            name: 'John Doe',
            role: 'STUDENT'
          }
        },
        status: 'authenticated'
      });

      render(<ChallengesPage />);

      expect(screen.getByText('Learning Challenges')).toBeInTheDocument();
      expect(await screen.findByText('Science Experiment')).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    beforeEach(() => {
      require('next-auth/react').useSession.mockReturnValue({
        data: {
          user: {
            id: 'user1',
            name: 'John Doe',
            role: 'STUDENT'
          }
        },
        status: 'authenticated'
      });
    });

    it('renders page title and fetched challenges', async () => {
      render(<ChallengesPage />);

      expect(screen.getByText('Learning Challenges')).toBeInTheDocument();
      expect(await screen.findByText('Science Experiment')).toBeInTheDocument();
      expect(screen.getByText('Conduct a science experiment')).toBeInTheDocument();
      expect(screen.getByText('Math Project')).toBeInTheDocument();
    });

    it('renders challenge metadata and start project buttons', async () => {
      render(<ChallengesPage />);

      await screen.findByText('Science Experiment');
      expect(screen.getByText(/Grade: 5/)).toBeInTheDocument();
      expect(screen.getByText(/Subject: Science/)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /start project/i }).length).toBe(2);
    });

    it('renders empty state when no challenges are returned', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenges: [] })
      });

      render(<ChallengesPage />);

      expect(await screen.findByText('No challenges found')).toBeInTheDocument();
    });

    it('renders error state when fetching challenges fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      render(<ChallengesPage />);

      expect(await screen.findByText('Error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe('Interactions', () => {
    beforeEach(() => {
      require('next-auth/react').useSession.mockReturnValue({
        data: {
          user: {
            id: 'user1',
            name: 'John Doe',
            role: 'STUDENT'
          }
        },
        status: 'authenticated'
      });
    });

    it('should start project and navigate to workflow when Start Project is clicked', async () => {
      render(<ChallengesPage />);

      await screen.findByText('Science Experiment');

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'project1' })
      });

      const startButtons = screen.getAllByRole('button', { name: /start project/i });
      await userEvent.click(startButtons[0]);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/projects/project1/workflow');
      });
    });
  });

  describe('Language Switching', () => {
    beforeEach(() => {
      require('next-auth/react').useSession.mockReturnValue({
        data: {
          user: {
            id: 'user1',
            name: 'John Doe',
            role: 'STUDENT'
          }
        },
        status: 'authenticated'
      });
    });

    it('should change language when language button is clicked', async () => {
      const { changeLanguage } = require('next-i18next').useTranslation();

      render(<ChallengesPage />);

      await screen.findByText('Science Experiment');

      const languageButton = screen.getByRole('button', { name: /language/i });
      expect(languageButton).toBeInTheDocument();

      // Click to open dropdown
      await userEvent.click(languageButton);

      // Select Marathi option
      const marathiOption = screen.getByRole('menuitem', { name: /marathi/i });
      await userEvent.click(marathiOption);

      // Verify changeLanguage was called with 'mr'
      expect(changeLanguage).toHaveBeenCalledWith('mr');
    });
  });
});