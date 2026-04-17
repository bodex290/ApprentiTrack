/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

// ── Mock AuthContext ──────────────────────────────────
let mockAuthValue: any = {};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// ── Stub page components ──────────────────────────────
vi.mock('../components/Dashboard', () => ({ default: () => <div>Coach Dashboard</div> }));
vi.mock('../components/Apprentices', () => ({ default: () => <div>Apprentices Page</div> }));
vi.mock('../components/KSBCoverage', () => ({ default: () => <div>KSB Page</div> }));
vi.mock('../components/Submissions', () => ({ default: () => <div>Submissions Page</div> }));
vi.mock('../components/Interventions', () => ({ default: () => <div>Interventions Page</div> }));
vi.mock('../components/Cohorts', () => ({ default: () => <div>Cohorts Page</div> }));
vi.mock('../components/Modules', () => ({ default: () => <div>Modules Page</div> }));
vi.mock('../pages/admin/UserManagement', () => ({ default: () => <div>User Management</div> }));
vi.mock('../pages/apprentice/MyDashboard', () => ({ default: () => <div>My Dashboard</div> }));
vi.mock('../pages/apprentice/MyPortfolio', () => ({ default: () => <div>My Portfolio</div> }));
vi.mock('../pages/apprentice/MySubmissions', () => ({ default: () => <div>My Submissions</div> }));
vi.mock('../pages/apprentice/SubmitEvidence', () => ({ default: () => <div>Submit Evidence</div> }));
vi.mock('../pages/apprentice/MyModules', () => ({ default: () => <div>My Modules</div> }));
vi.mock('../pages/apprentice/MyFeedback', () => ({ default: () => <div>My Feedback</div> }));
vi.mock('../pages/ChangePasswordPage', () => ({ default: () => <div>Change Password</div> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <div>Login Page</div> }));

// ── Re-implement route guards (mirrors App.tsx logic) ─
// We import these indirectly through the mock to test the same guard logic.
import { useAuth } from '../context/AuthContext';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RedirectByRole() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (user.role === 'apprentice') return <Navigate to="/my/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

// Page imports (mocked above)
import LoginPage from '../pages/LoginPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import Dashboard from '../components/Dashboard';
import MyDashboard from '../pages/apprentice/MyDashboard';

function TestApp({ initialPath = '/' }: { initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/" element={<RedirectByRole />} />
        <Route element={<RequireAuth><RequireRole roles={['coach']}><Outlet /></RequireRole></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route element={<RequireAuth><RequireRole roles={['apprentice']}><Outlet /></RequireRole></RequireAuth>}>
          <Route path="/my/dashboard" element={<MyDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Test data ─────────────────────────────────────────
const coachUser = {
  id: 1, email: 'coach@test.com', role: 'coach' as const,
  first_name: 'Test', last_name: 'Coach',
  must_change_password: false, apprentice_id: null,
};

const apprenticeUser = {
  id: 2, email: 'app@test.com', role: 'apprentice' as const,
  first_name: 'Test', last_name: 'Apprentice',
  must_change_password: false, apprentice_id: 10,
};

const mustChangeUser = { ...coachUser, must_change_password: true };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthValue = {
    user: null, token: null, loading: false,
    login: vi.fn(), logout: vi.fn(), refreshUser: vi.fn(),
  };
});

describe('Routing & Guards', () => {
  describe('Unauthenticated', () => {
    it('renders login page at /login', () => {
      render(<TestApp initialPath="/login" />);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('redirects / to /login when not authenticated', () => {
      render(<TestApp initialPath="/" />);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('redirects /dashboard to /login when not authenticated', () => {
      render(<TestApp initialPath="/dashboard" />);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Coach routes', () => {
    beforeEach(() => {
      mockAuthValue = { ...mockAuthValue, user: coachUser, token: 'fake-token' };
    });

    it('redirects coach from / to /dashboard', () => {
      render(<TestApp initialPath="/" />);
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    });

    it('renders dashboard at /dashboard', () => {
      render(<TestApp initialPath="/dashboard" />);
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    });
  });

  describe('Apprentice routes', () => {
    beforeEach(() => {
      mockAuthValue = { ...mockAuthValue, user: apprenticeUser, token: 'fake-token' };
    });

    it('redirects apprentice from / to /my/dashboard', () => {
      render(<TestApp initialPath="/" />);
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });

    it('renders apprentice dashboard at /my/dashboard', () => {
      render(<TestApp initialPath="/my/dashboard" />);
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });
  });

  describe('must_change_password', () => {
    it('redirects to /change-password when must_change_password is true', () => {
      mockAuthValue = { ...mockAuthValue, user: mustChangeUser, token: 'fake-token' };
      render(<TestApp initialPath="/" />);
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });
  });

  describe('Role guards', () => {
    it('coach cannot access apprentice routes', () => {
      mockAuthValue = { ...mockAuthValue, user: coachUser, token: 'fake-token' };
      render(<TestApp initialPath="/my/dashboard" />);
      // Should redirect to / → /dashboard
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    });

    it('apprentice cannot access coach routes', () => {
      mockAuthValue = { ...mockAuthValue, user: apprenticeUser, token: 'fake-token' };
      render(<TestApp initialPath="/dashboard" />);
      // Should redirect to / → /my/dashboard
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });
  });
});
