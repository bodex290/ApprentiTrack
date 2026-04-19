import { useEffect, useState } from 'react';
import { Plus, GraduationCap, Users, Edit2, Trash2 } from 'lucide-react';
import { getCohorts, createCohort, updateCohort, deleteCohort } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { FormField, FormInput, SubmitButton } from './FormFields';
import LoadingScreen from './LoadingScreen';

interface Cohort {
  id: number;
  name: string;
  programme: string;
  start_date: string;
  end_date: string | null;
  created_at: string | null;
}

const emptyForm = { name: '', programme: '', start_date: '', end_date: '' };

const Cohorts = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editCohort, setEditCohort] = useState<Cohort | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const load = () => {
    getCohorts()
      .then((res) => setCohorts(res.data))
      .catch((err) => console.error('Failed to load cohorts:', err))
      .finally(() => setPageLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        programme: form.programme,
        start_date: form.start_date,
        end_date: form.end_date || null,
      };
      if (editCohort) {
        await updateCohort(editCohort.id, payload);
      } else {
        await createCohort(payload);
      }
      setShowModal(false);
      setEditCohort(null);
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Cohort) => {
    setEditCohort(c);
    setForm({
      name: c.name,
      programme: c.programme,
      start_date: c.start_date,
      end_date: c.end_date || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      await deleteCohort(deleteTarget);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  if (pageLoading) return <LoadingScreen message="Loading cohorts..." />;

  return (
    <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: '28px', color: '#0f172a' }}>Cohorts</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Manage apprenticeship cohorts and programmes</p>
          </div>
          <button
            onClick={() => { setEditCohort(null); setForm(emptyForm); setShowModal(true); }}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{ background: '#3b82f6', color: 'white', fontSize: '14px', display: isAdmin ? undefined : 'none' }}
          >
            <Plus size={18} /> Add Cohort
          </button>
        </div>

        {/* Modal */}
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditCohort(null); }} title={editCohort ? 'Edit Cohort' : 'Add Cohort'}>
          <form onSubmit={handleSubmit}>
            <FormField label="Name">
              <FormInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cohort 2025-A" />
            </FormField>
            <FormField label="Programme">
              <FormInput required value={form.programme} onChange={(e) => setForm({ ...form, programme: e.target.value })} placeholder="e.g. Digital & Technology Solutions" />
            </FormField>
            <FormField label="Start Date">
              <FormInput required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </FormField>
            <FormField label="End Date (optional)">
              <FormInput type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </FormField>
            <SubmitButton disabled={saving}>{saving ? 'Saving…' : editCohort ? 'Update Cohort' : 'Create Cohort'}</SubmitButton>
          </form>
        </Modal>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#3b82f615' }}>
                <GraduationCap size={22} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: '28px', color: '#0f172a' }}>{cohorts.length}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Total Cohorts</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#10b98115' }}>
                <Users size={22} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: '28px', color: '#0f172a' }}>
                  {new Set(cohorts.map(c => c.programme)).size}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Programmes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <h2 className="font-semibold" style={{ fontSize: '16px', color: '#0f172a' }}>All Cohorts</h2>
          </div>
          <table className="w-full">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                {['Name', 'Programme', 'Start Date', 'End Date', 'Status', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                  <th key={h} className="text-left px-6 py-4" style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort, index) => {
                const isActive = !cohort.end_date || new Date(cohort.end_date) > new Date();
                return (
                  <tr key={cohort.id} className="transition-colors duration-150 hover:bg-slate-50" style={{ background: index % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#3b82f615' }}>
                          <GraduationCap size={18} style={{ color: '#3b82f6' }} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{cohort.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>{cohort.programme}</td>
                    <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>
                      {new Date(cohort.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>
                      {cohort.end_date ? new Date(cohort.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: isActive ? '#10b981' : '#94a3b8' }} />
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{isActive ? 'Active' : 'Completed'}</span>
                      </div>
                    </td>
                    {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(cohort)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100" title="Edit">
                          <Edit2 size={14} style={{ color: '#64748b' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(cohort.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50" title="Delete">
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                );
              })}
              {cohorts.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center" style={{ color: '#94a3b8', fontSize: '14px' }}>No cohorts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Cohort"
          message="This will permanently delete this cohort and all associated apprentices. This action cannot be undone."
          confirmLabel="Delete Cohort"
          loading={deleting}
        />
      </div>
    </div>
  );
};

export default Cohorts;
