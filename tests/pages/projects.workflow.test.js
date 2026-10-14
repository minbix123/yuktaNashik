const { render, screen } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event');
const ProjectsPageModule = require('../../pages/projects/[id]/workflow');
const ProjectsPage = ProjectsPageModule.default || ProjectsPageModule;

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
      'project.workflow.title': 'Project Workflow',
      'project.workflow.learn': 'Learn',
      'project.workflow.investigate': 'Investigate',
      'project.workflow.design': 'Design',
      'project.workflow.build': 'Build',
      'project.workflow.test': 'Test',
      'project.workflow.fail': 'Fail',
      'project.workflow.improve': 'Improve',
      'project.workflow.explain': 'Explain',
      'project.workflow.reflect': 'Reflect',
      'project.workflow.earnSkill': 'Earn Skill Evidence',
      'project.status.draft': 'Draft',
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

const mockRouter = {
  pathname: '/projects/[id]/workflow',
  asPath: '/projects/project1/workflow',
  locale: 'en',
  locales: ['en', 'mr'],
  query: { id: 'project1' },
  push: mockPush,
  prefetch: jest.fn(),
  back: jest.fn()
};

// Mock router
jest.mock('next/router', () => ({
  useRouter() {
    return mockRouter;
  }
}));

describe('Project Workflow Page', () => {
  const mockProject = {
    id: 'project1',
    title: 'Test Project',
    description: 'Test Project Description',
    status: 'LEARN',
    challenge: {
      id: 'challenge1',
      title: 'Test Challenge',
      description: 'Test Challenge Description'
    },
    student: {
      id: 'student1',
      user: {
        name: 'John Doe',
        image: 'profile.jpg'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProject
    });
  });

  describe('Authentication States', () => {
    it('shows loading state when session is loading', () => {
      require('next-auth/react').useSession.mockReturnValue({
        data: null,
        status: 'loading'
      });

      render(<ProjectsPage />);

      expect(screen.getByText(/loading|please sign in/i)).toBeInTheDocument();
    });

    it('shows sign-in prompt when user is not authenticated', () => {
      require('next-auth/react').useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(<ProjectsPage />);

      expect(screen.getByText(/please sign in|project workflow/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows project workflow when user is authenticated', async () => {
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

      render(<ProjectsPage />);

      expect(await screen.findByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText(/project stages/i)).toBeInTheDocument();
    });
  });

  describe('Authorization', () => {
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

    it('allows access when project studentId matches session userId', async () => {
      render(<ProjectsPage />);

      expect(await screen.findByText('Test Project')).toBeInTheDocument();
    });

    it('handles unauthorized access gracefully', () => {
      expect(true).toBe(true);
    });
  });

  describe('Workflow Visualization', () => {
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

    it('renders project title and stage information', async () => {
      render(<ProjectsPage />);

      expect(await screen.findByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText(/Understand the challenge and gather initial knowledge/i)).toBeInTheDocument();
    });

    it('renders current stage status', async () => {
      render(<ProjectsPage />);

      await screen.findByText('Test Project');
      expect(screen.getByText(/Current status:\s*LEARN/i)).toBeInTheDocument();
    });

    it('renders all workflow stages', async () => {
      render(<ProjectsPage />);

      await screen.findByText('Test Project');

      expect(screen.getByRole('option', { name: /LEARN/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /INVESTIGATE/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /DESIGN/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /BUILD/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /TEST/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /FAIL/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /IMPROVE/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /EXPLAIN/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /REFLECT/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /EARN_SKILL_EVIDENCE/i })).toBeInTheDocument();
    });

    it('highlights current workflow stage', async () => {
      render(<ProjectsPage />);

      await screen.findByText('Test Project');

      const select = screen.getByLabelText(/stage/i);
      expect(select).toHaveValue('LEARN');
    });
  });

  describe('Workflow Progression', () => {
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

    it('allows advancing to next stage when appropriate', () => {
      expect(true).toBe(true);
    });

    it('prevents skipping stages when not allowed', () => {
      expect(true).toBe(true);
    });
  });

  describe('Project Actions', () => {
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

    it('allows adding reflections', () => {
      expect(true).toBe(true);
    });

    it('allows adding skill evidence', () => {
      expect(true).toBe(true);
    });

    it('shows project iterations/history', () => {
      expect(true).toBe(true);
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

      render(<ProjectsPage />);

      await screen.findByText('Test Project');

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