import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { must_change_password } = await login(email, password);
      if (must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <LogIn size={28} style={{ color: '#3b82f6' }} />
          </div>
          <h1 className="text-2xl font-bold text-white">ApprentiTrack</h1>
          <p className="text-slate-400 mt-2 text-sm">KSB Progress & Coverage Tracker</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={16} style={{ color: '#ef4444' }} />
            <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 outline-none"
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 outline-none pr-10"
                style={{
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '14px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium text-white transition-all"
            style={{
              background: loading ? '#1e40af' : '#3b82f6',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="mt-6 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <p className="text-xs text-slate-400 text-center">
            Coach: <span className="text-slate-300">dr.patel@uni.ac.uk</span> / <span className="text-slate-300">Coach123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
