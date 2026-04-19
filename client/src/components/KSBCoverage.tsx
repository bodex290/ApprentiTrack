import { useEffect, useState } from 'react';
import { Plus, BookOpen, Edit2, Trash2, ShieldCheck, Brain, Wrench } from 'lucide-react';
import { getKSBs, createKSB, updateKSB, deleteKSB, getKSBCoverage, getKSBCoverageByType } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { FormField, FormInput, FormSelect, FormTextarea, SubmitButton } from './FormFields';
import LoadingScreen from './LoadingScreen';

interface KSB {
  id: number;
  code: string;
  type: string;
  description: string;
}

interface KSBCoverageItem {
  id: number;
  code: string;
  type: string;
  description: string;
  apprentices_evidenced: number;
  total_apprentices: number;
  coverage_pct: number;
}

interface TypeSummary {
  type: string;
  total: number;
  evidenced: number;
}

const emptyForm = { code: '', type: 'Knowledge', description: '' };

const typeIcon = (type: string) => {
  if (type === 'Knowledge') return <Brain size={16} style={{ color: '#8b5cf6' }} />;
  if (type === 'Skill') return <Wrench size={16} style={{ color: '#3b82f6' }} />;
  return <ShieldCheck size={16} style={{ color: '#f59e0b' }} />;
};

const typeColor = (type: string): string => {
  if (type === 'Knowledge') return '#8b5cf6';
  if (type === 'Skill') return '#3b82f6';
  return '#f59e0b';
};

const typeBg = (type: string): string => {
  if (type === 'Knowledge') return '#8b5cf615';
  if (type === 'Skill') return '#3b82f615';
  return '#f59e0b15';
};

const KSBCoverage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [coverage, setCoverage] = useState<KSBCoverageItem[]>([]);
  const [typeSummary, setTypeSummary] = useState<TypeSummary[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editKSB, setEditKSB] = useState<KSB | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const load = () => {
    Promise.all([
      getKSBCoverage().then((res) => setCoverage(res.data)),
      getKSBCoverageByType().then((res) => setTypeSummary(res.data)),
    ]).finally(() => setPageLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { code: form.code, type: form.type, description: form.description };
      if (editKSB) {
        await updateKSB(editKSB.id, payload);
      } else {
        await createKSB(payload);
      }
      setShowModal(false);
      setEditKSB(null);
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (k: KSBCoverageItem) => {
    setEditKSB({ id: k.id, code: k.code, type: k.type, description: k.description });
    setForm({ code: k.code, type: k.type, description: k.description });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      await deleteKSB(deleteTarget);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const filtered = filterType === 'All' ? coverage : coverage.filter((k) => k.type === filterType);

  // Calculate overall stats
  const totalKSBs = coverage.length;
  const evidencedKSBs = coverage.filter((k) => k.apprentices_evidenced > 0).length;
  const overallPct = totalKSBs ? Math.round((evidencedKSBs / totalKSBs) * 100) : 0;

  if (pageLoading) return <LoadingScreen message="Loading KSB coverage..." />;

  return (
    <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: '28px', color: '#0f172a' }}>KSB Coverage</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Knowledge, Skills &amp; Behaviours tracking and evidence coverage</p>
          </div>
          <button
            onClick={() => { setEditKSB(null); setForm(emptyForm); setShowModal(true); }}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{ background: '#3b82f6', color: 'white', fontSize: '14px', display: isAdmin ? undefined : 'none' }}
          >
            <Plus size={18} /> Add KSB
          </button>
        </div>

        {/* Modal */}
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditKSB(null); }} title={editKSB ? 'Edit KSB' : 'Add KSB'}>
          <form onSubmit={handleSubmit}>
            <FormField label="Code">
              <FormInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. K1, S3, B2" />
            </FormField>
            <FormField label="Type">
              <FormSelect required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="Knowledge">Knowledge</option>
                <option value="Skill">Skill</option>
                <option value="Behaviour">Behaviour</option>
              </FormSelect>
            </FormField>
            <FormField label="Description">
              <FormTextarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="KSB description text" />
            </FormField>
            <SubmitButton disabled={saving}>{saving ? 'Saving…' : editKSB ? 'Update KSB' : 'Create KSB'}</SubmitButton>
          </form>
        </Modal>

        {/* Summary Cards – Type Breakdown + Overall */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* Overall */}
          <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" stroke="#e2e8f0" />
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" stroke="#10b981" strokeLinecap="round"
                    strokeDasharray={`${overallPct * 0.975} 100`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold" style={{ fontSize: '14px', color: '#0f172a' }}>{overallPct}%</span>
                </div>
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: '16px', color: '#0f172a' }}>Overall Coverage</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{evidencedKSBs} / {totalKSBs} KSBs evidenced</div>
              </div>
            </div>
          </div>

          {/* Per Type */}
          {typeSummary.map((ts) => {
            const pct = ts.total ? Math.round((ts.evidenced / ts.total) * 100) : 0;
            const color = typeColor(ts.type);
            return (
              <div key={ts.type} className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" stroke="#e2e8f0" />
                      <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" stroke={color} strokeLinecap="round"
                        strokeDasharray={`${pct * 0.975} 100`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-bold" style={{ fontSize: '14px', color: '#0f172a' }}>{pct}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2" style={{ fontSize: '16px', color: '#0f172a' }}>
                      {typeIcon(ts.type)} {ts.type}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{ts.evidenced} / {ts.total} evidenced</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Type Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['All', 'Knowledge', 'Skill', 'Behaviour'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                fontSize: '13px',
                background: filterType === t ? '#0f172a' : 'white',
                color: filterType === t ? 'white' : '#64748b',
                border: filterType === t ? 'none' : '1px solid #e2e8f0',
              }}
            >
              {t} {t === 'All' ? `(${coverage.length})` : `(${coverage.filter((k) => k.type === t).length})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <h2 className="font-semibold" style={{ fontSize: '16px', color: '#0f172a' }}>
              {filterType === 'All' ? 'All KSBs' : `${filterType} KSBs`}
              <span className="ml-2 font-normal" style={{ color: '#94a3b8', fontSize: '13px' }}>{filtered.length} items</span>
            </h2>
          </div>
          <table className="w-full">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                {['Code', 'Type', 'Description', 'Evidence Coverage', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                  <th key={h} className="text-left px-6 py-4" style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => (
                <tr key={k.id} className="transition-colors duration-150 hover:bg-slate-50" style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: typeBg(k.type) }}>
                        {typeIcon(k.type)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{k.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full" style={{ fontSize: '12px', fontWeight: '500', background: typeBg(k.type), color: typeColor(k.type) }}>
                      {k.type}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ fontSize: '14px', color: '#475569', maxWidth: '420px' }}>{k.description}</td>
                  <td className="px-6 py-4" style={{ minWidth: '200px' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${k.coverage_pct}%`, background: k.coverage_pct >= 75 ? '#10b981' : k.coverage_pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', minWidth: '40px' }}>{k.coverage_pct}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      {k.apprentices_evidenced} / {k.total_apprentices} apprentices
                    </div>
                  </td>
                  {isAdmin && (
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(k)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100" title="Edit">
                        <Edit2 size={14} style={{ color: '#64748b' }} />
                      </button>
                      <button onClick={() => setDeleteTarget(k.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50" title="Delete">
                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center" style={{ color: '#94a3b8', fontSize: '14px' }}>No KSBs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete KSB"
          message="This will permanently delete this KSB and remove all associated evidence mappings. This action cannot be undone."
          confirmLabel="Delete KSB"
          loading={deleting}
        />
      </div>
    </div>
  );
};

export default KSBCoverage;
