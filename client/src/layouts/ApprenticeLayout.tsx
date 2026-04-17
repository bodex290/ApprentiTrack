import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, BookOpen, Target, MessageSquare,
  LogOut, Briefcase,
} from 'lucide-react';
import ChatBot from '../components/ChatBot';

export default function ApprenticeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/my/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/my/portfolio', label: 'My Portfolio', icon: Target },
    { to: '/my/submissions', label: 'My Submissions', icon: FileText },
    { to: '/my/submit', label: 'Submit Evidence', icon: Briefcase },
    { to: '/my/modules', label: 'Modules', icon: BookOpen },
    { to: '/my/feedback', label: 'Feedback', icon: MessageSquare },
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
          <p className="mt-1" style={{ fontSize: '12px', color: '#22c55e' }}>My Portfolio</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 no-underline"
                  style={({ isActive }) => ({
                    background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    color: isActive ? '#22c55e' : '#94a3b8',
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
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
