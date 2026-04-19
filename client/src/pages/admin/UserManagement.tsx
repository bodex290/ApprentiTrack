import { useState, useEffect, type FormEvent } from 'react';
import {
  getUsers, createCoach, createApprenticeUser, updateCoach, updateApprenticeUser,
  deleteUser, getCohorts, assignCohorts, getUserCohorts,
} from '../../services/api';
import { UserCog, Plus, Pencil, Trash2, Users, GraduationCap } from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';

interface User {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  must_change_password: boolean;
  apprentice_id: number | null;
  created_at: string;
}

interface Cohort {
  id: number;
  name: string;
}

const roleBadge: Record<string, { bg: string; text: string }> = {
  coach: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  apprentice: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'coach' | 'apprentice' | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState('all');

  // Shared form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Apprentice-specific
  const [cohortId, setCohortId] = useState<number | ''>('');
  const [employer, setEmployer] = useState('');

  // Cohort assignment
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [cohortUserId, setCohortUserId] = useState<number | null>(null);
  const [selectedCohorts, setSelectedCohorts] = useState<number[]>([]);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });

  const fetchData = async () => {
    const [uRes, cRes] = await Promise.all([getUsers(), getCohorts()]);
    setUsers(uRes.data);
    setCohorts(cRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setEmail(''); setFirstName(''); setLastName('');
    setPassword(''); setCohortId(''); setEmployer('');
    setEditUser(null); setShowForm(null);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEmail(u.email);
    setFirstName(u.first_name);
    setLastName(u.last_name);
    setPassword('');
    setEmployer('');
    setShowForm(u.role === 'coach' ? 'coach' : 'apprentice');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        // Update existing user
        if (editUser.role === 'coach') {
          await updateCoach(editUser.id, { email, first_name: firstName, last_name: lastName });
        } else {
          await updateApprenticeUser(editUser.id, {
            email, first_name: firstName, last_name: lastName,
            ...(employer ? { employer } : {}),
          });
        }
      } else if (showForm === 'coach') {
        await createCoach({
          email, first_name: firstName, last_name: lastName,
          password: password || 'Temp123!',
        });
      } else {
        if (!cohortId) { alert('Cohort is required for apprentice'); setSaving(false); return; }
        await createApprenticeUser({
          email, first_name: firstName, last_name: lastName,
          password: password || 'Temp123!',
          cohort_id: cohortId,
          ...(employer ? { employer } : {}),
        });
      }
      await fetchData();
      resetForm();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.userId) return;
    try {
      await deleteUser(confirmDelete.userId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
    setConfirmDelete({ open: false, userId: null });
  };

  const openCohortAssign = async (userId: number) => {
    try {
      const res = await getUserCohorts(userId);
      setSelectedCohorts(res.data.map((c: any) => c.cohort_id));
    } catch {
      setSelectedCohorts([]);
    }
    setCohortUserId(userId);
    setShowCohortModal(true);
  };

  const handleCohortAssign = async () => {
    if (!cohortUserId) return;
    try {
      await assignCohorts(cohortUserId, selectedCohorts);
      setShowCohortModal(false);
      setCohortUserId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign cohorts');
    }
  };

  if (loading) return <LoadingScreen message="Loading users..." />;

  const filtered = filterRole === 'all' ? users : users.filter(u => u.role === filterRole);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users.length} users</p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border"
            style={{ borderColor: '#e5e7eb' }}
          >
            <option value="all">All Roles</option>
            <option value="coach">Coach</option>
            <option value="apprentice">Apprentice</option>
          </select>
          <button
            onClick={() => { resetForm(); setShowForm('coach'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: '#3b82f6' }}
          >
            <Plus size={16} /> Add Coach
          </button>
          <button
            onClick={() => { resetForm(); setShowForm('apprentice'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: '#22c55e' }}
          >
            <Plus size={16} /> Add Apprentice
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={!!showForm} onClose={resetForm} title={editUser ? `Edit ${editUser.role === 'coach' ? 'Coach' : 'Apprentice'}` : `New ${showForm === 'coach' ? 'Coach' : 'Apprentice'}`}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            {!editUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Temporary password"
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e5e7eb' }} />
              </div>
            )}
            {/* Apprentice-specific fields */}
            {showForm === 'apprentice' && (
              <>
                {!editUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cohort *</label>
                    <select value={cohortId} onChange={e => setCohortId(e.target.value ? Number(e.target.value) : '')}
                      required
                      className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e5e7eb' }}>
                      <option value="">Select cohort</option>
                      {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
                  <input type="text" value={employer} onChange={e => setEmployer(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e5e7eb' }} />
                </div>
              </>
            )}
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="px-6 py-2 rounded-lg text-white text-sm font-medium"
                style={{ background: saving ? '#1e40af' : '#3b82f6' }}>
                {saving ? 'Saving…' : editUser ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm}
                className="px-6 py-2 rounded-lg border text-sm font-medium text-gray-600"
                style={{ borderColor: '#e5e7eb' }}>
                Cancel
              </button>
            </div>
          </form>
      </Modal>

      {/* User Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">User</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Role</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Created</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const rb = roleBadge[u.role] || roleBadge.apprentice;
              return (
                <tr key={u.id} className="border-t" style={{ borderColor: '#f1f5f9' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                        style={{ background: rb.text }}>
                        {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{u.first_name} {u.last_name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium capitalize" style={{ background: rb.bg, color: rb.text }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {u.must_change_password && (
                      <span className="text-xs text-amber-500 ml-2">(temp pw)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.role === 'coach' && (
                        <button onClick={() => openCohortAssign(u.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-purple-500" title="Assign Cohorts">
                          <GraduationCap size={15} />
                        </button>
                      )}
                      <button onClick={() => openEdit(u)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete({ open: true, userId: u.id })}
                        className="p-1.5 rounded hover:bg-gray-100 text-red-400" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cohort Assignment Modal */}
      {showCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: 'white' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Cohorts to Coach</h2>
            <div className="space-y-2 mb-4 max-h-48 overflow-auto">
              {cohorts.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCohorts.includes(c.id)}
                    onChange={() => setSelectedCohorts(prev =>
                      prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                    )}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-700">{c.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCohortModal(false)}
                className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor: '#e5e7eb' }}>Cancel</button>
              <button onClick={handleCohortAssign}
                className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#3b82f6' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete({ open: false, userId: null })}
      />
    </div>
  );
}
