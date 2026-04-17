import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Target, FileText, AlertTriangle,
  GraduationCap, BookOpen, LogOut,
} from 'lucide-react';
import ChatBot from '../components/ChatBot';

export default function CoachLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/apprentices', label: 'Apprentices', icon: Users },
    { to: '/cohorts', label: 'Cohorts', icon: GraduationCap },
    { to: '/modules', label: 'Modules', icon: BookOpen },
    { to: '/ksb', label: 'KSB Coverage', icon: Target },
    { to: '/submissions', label: 'Submissions', icon: FileText },
    { to: '/interventions', label: 'Interventions', icon: AlertTriangle },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : '??';

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: '#fafafa' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col" style={{
        background: '#0f172a',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <h1 className="text-white font-semibold tracking-tight" style={{ fontSize: '18px' }}>
            ApprentiTrack
          </h1>
          <p className="text-slate-400 mt-1" style={{ fontSize: '12px' }}>Coach Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 no-underline`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: isActive ? '#3b82f6' : '#94a3b8',
                    fontSize: '14px',
                    fontWeight: isActive ? '500' : '400',
                  })}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#3b82f6' }}>
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-slate-400 text-xs truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* AI Chat Assistant */}
      <ChatBot />
    </div>
  );
}
