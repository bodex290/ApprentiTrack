import { Search, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApprenticeProgress, getCohorts, createApprentice, updateApprentice, deleteApprentice } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { FormField, FormInput, FormSelect, SubmitButton } from './FormFields';
import LoadingScreen from './LoadingScreen';

interface ApprenticeRow {
  id: number;
  name: string;
  email: string;
  employer: string;
  cohort_id: number;
  ksb_coverage_pct: number;
  open_interventions: number;
}

interface Cohort {
  id: number;
  name: string;
}

const emptyForm = { first_name: '', last_name: '', email: '', cohort_id: '', employer: '' };

const Apprentices = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
  const [apprentices, setApprentices] = useState<ApprenticeRow[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageloading, setPageLoading] = useState(true);

  const load = () => {
    Promise.all([
      getApprenticeProgress().then((res) => setApprentices(res.data)),
      getCohorts().then((res) => setCohorts(res.data)),
    ]).finally(() => setPageLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        cohort_id: Number(form.cohort_id),
        employer: form.employer || null,
      };
      if (editId) {
        await updateApprentice(editId, payload);
      } else {
        await createApprentice(payload);
      }
      setShowModal(false);
      setEditId(null);
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: ApprenticeRow) => {
    const [first, ...rest] = a.name.split(' ');
    setEditId(a.id);
    setForm({
      first_name: first,
      last_name: rest.join(' '),
      email: a.email,
      cohort_id: String(a.cohort_id),
      employer: a.employer || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      await deleteApprentice(deleteTarget);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return '#10b981';
    if (coverage >= 60) return '#3b82f6';
    return '#f59e0b';
  };

  const getStatusInfo = (a: ApprenticeRow) => {
    if (a.open_interventions > 0) return { label: 'review', color: '#f59e0b' };
    return { label: 'active', color: '#10b981' };
  };

  const filteredApprentices = apprentices.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCohort = !selectedCohort || a.cohort_id === selectedCohort;
    return matchesSearch && matchesCohort;
  });

  if (pageloading) return <LoadingScreen message="Loading apprentices..." />;

  return (
    <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: '28px', color: '#0f172a' }}>Apprentices</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Manage and monitor apprentice progress</p>
          </div>
          <button
            onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{ background: '#3b82f6', color: 'white', fontSize: '14px', display: isAdmin ? undefined : 'none' }}
          >
            <Plus size={18} /> Add Apprentice
          </button>
        </div>

        {/* Modal */}
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? 'Edit Apprentice' : 'Add Apprentice'}>
          <form onSubmit={handleSubmit}>
            <FormField label="First Name">
              <FormInput required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="John" />
            </FormField>
            <FormField label="Last Name">
              <FormInput required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" />
            </FormField>
            <FormField label="Email">
              <FormInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john.doe@example.com" />
            </FormField>
            <FormField label="Cohort">
              <FormSelect required value={form.cohort_id} onChange={(e) => setForm({ ...form, cohort_id: e.target.value })}>
                <option value="">Select cohort…</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Employer (optional)">
              <FormInput value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} placeholder="Acme Ltd" />
            </FormField>
            <SubmitButton disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Apprentice' : 'Create Apprentice'}</SubmitButton>
          </form>
        </Modal>

        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search apprentices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg transition-all duration-200 outline-none"
              style={{ background: 'white', border: '1px solid #e2e8f0', fontSize: '14px', color: '#0f172a' }}
            />
          </div>
          <div className="flex gap-2">
            {cohorts.map((cohort) => {
              const isSelected = selectedCohort === cohort.id;
              return (
                <button
                  key={cohort.id}
                  onClick={() => setSelectedCohort(isSelected ? null : cohort.id)}
                  className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                  style={{
                    background: isSelected ? '#3b82f6' : 'white',
                    color: isSelected ? 'white' : '#64748b',
                    border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                    fontSize: '13px', fontWeight: '500',
                  }}
                >
                  {cohort.name}
                  {isSelected && <X size={14} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <table className="w-full">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                {['Apprentice', 'Email', 'Employer', 'Cohort', 'KSB Coverage', 'Status', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                  <th key={h} className="text-left px-6 py-4" style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredApprentices.map((apprentice, index) => {
                const status = getStatusInfo(apprentice);
                return (
                  <tr key={apprentice.id} className="transition-colors duration-150 hover:bg-slate-50" style={{ background: index % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${getCoverageColor(apprentice.ksb_coverage_pct)}, ${getCoverageColor(apprentice.ksb_coverage_pct)}dd)` }}>
                          <span className="text-white font-semibold" style={{ fontSize: '13px' }}>{getInitials(apprentice.name)}</span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{apprentice.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>{apprentice.email}</td>
                    <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>{apprentice.employer}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full" style={{ background: '#3b82f615', color: '#3b82f6', fontSize: '12px', fontWeight: '500' }}>
                        {cohorts.find(c => c.id === apprentice.cohort_id)?.name || `Cohort ${apprentice.cohort_id}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0', maxWidth: '120px' }}>
                          <div className="h-full transition-all duration-500" style={{ width: `${apprentice.ksb_coverage_pct}%`, background: getCoverageColor(apprentice.ksb_coverage_pct) }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>{apprentice.ksb_coverage_pct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                        <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>{status.label}</span>
                      </div>
                    </td>
                    {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(apprentice)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100" title="Edit">
                          <Edit2 size={14} style={{ color: '#64748b' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(apprentice.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50" title="Delete">
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                );
              })}
              {filteredApprentices.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center" style={{ color: '#94a3b8', fontSize: '14px' }}>No apprentices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Apprentice"
          message="This will permanently delete this apprentice and all their submissions. This action cannot be undone."
          confirmLabel="Delete Apprentice"
          loading={deleting}
        />
      </div>
    </div>
  );
};

export default Apprentices;
