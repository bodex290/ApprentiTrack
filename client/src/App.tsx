import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { ReactNode } from 'react';

// Pages
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CoachLayout from './layouts/CoachLayout';
import ApprenticeLayout from './layouts/ApprenticeLayout';

// Existing coach/admin shared components
import Dashboard from './components/Dashboard';
import Apprentices from './components/Apprentices';
import KSBCoverage from './components/KSBCoverage';
import Submissions from './components/Submissions';
import Interventions from './components/Interventions';
import Cohorts from './components/Cohorts';
import Modules from './components/Modules';

// Apprentice portal pages
import MyDashboard from './pages/apprentice/MyDashboard';
import MyPortfolio from './pages/apprentice/MyPortfolio';
import MySubmissions from './pages/apprentice/MySubmissions';
import SubmitEvidence from './pages/apprentice/SubmitEvidence';
import MyModules from './pages/apprentice/MyModules';
import MyFeedback from './pages/apprentice/MyFeedback';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditLog from './pages/admin/AuditLog';

/* ── Route Guards ──────────────────────────────────────── */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RedirectByRole() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'apprentice') return <Navigate to="/my/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    </div>
  );
}

/* ── App ───────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Root redirect */}
          <Route path="/" element={<RedirectByRole />} />

          {/* Admin routes */}
          <Route element={
            <RequireAuth>
              <RequireRole roles={['admin']}>
                <AdminLayout />
              </RequireRole>
            </RequireAuth>
          }>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<Dashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/cohorts" element={<Cohorts />} />
            <Route path="/admin/modules" element={<Modules />} />
            <Route path="/admin/ksb" element={<KSBCoverage />} />
            <Route path="/admin/apprentices" element={<Apprentices />} />
            <Route path="/admin/submissions" element={<Submissions />} />
            <Route path="/admin/interventions" element={<Interventions />} />
            <Route path="/admin/audit-log" element={<AuditLog />} />
          </Route>

          {/* Coach routes */}
          <Route element={
            <RequireAuth>
              <RequireRole roles={['coach']}>
                <CoachLayout />
              </RequireRole>
            </RequireAuth>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/apprentices" element={<Apprentices />} />
            <Route path="/cohorts" element={<Cohorts />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/ksb" element={<KSBCoverage />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/interventions" element={<Interventions />} />
          </Route>

          {/* Apprentice routes */}
          <Route element={
            <RequireAuth>
              <RequireRole roles={['apprentice']}>
                <ApprenticeLayout />
              </RequireRole>
            </RequireAuth>
          }>
            <Route path="/my/dashboard" element={<MyDashboard />} />
            <Route path="/my/portfolio" element={<MyPortfolio />} />
            <Route path="/my/submissions" element={<MySubmissions />} />
            <Route path="/my/submit" element={<SubmitEvidence />} />
            <Route path="/my/modules" element={<MyModules />} />
            <Route path="/my/feedback" element={<MyFeedback />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
