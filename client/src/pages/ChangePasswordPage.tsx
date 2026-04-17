import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword as apiChangePassword } from '../services/api';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(251,191,36,0.15)' }}>
            <Lock size={28} style={{ color: '#fbbf24' }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Change Password</h1>
          <p className="text-slate-400 mt-2 text-sm">
            {user?.must_change_password
              ? 'You must change your temporary password before continuing.'
              : 'Update your account password.'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={16} style={{ color: '#ef4444' }} />
            <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 outline-none"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 outline-none"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 outline-none"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}
            />
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle size={14} style={{ color: '#22c55e' }} />
                <span className="text-xs" style={{ color: '#22c55e' }}>Passwords match</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium text-white transition-all"
            style={{
              background: loading ? '#92400e' : '#f59e0b',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
