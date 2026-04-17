import { useEffect, useState } from 'react';
import { Plus, BookOpen, ArrowLeft, Target, FileText, Edit2, Trash2 } from 'lucide-react';
import { getModules, getModuleDetail, createModule, updateModule, deleteModule } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { FormField, FormInput, SubmitButton } from './FormFields';

interface ModuleItem {
  id: number;
  code: string;
  title: string;
  credits: number | null;
  created_at: string | null;
}

interface Assessment {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
}

interface MappedKSB {
  id: number;
  code: string;
  type: string;
  description: string;
  submission_count: number;
}

interface ModuleDetail {
  id: number;
  code: string;
  title: string;
  credits: number | null;
  assessments: Assessment[];
  submissions: { id: number; title: string; status: string; apprentice_id: number; assessment_id: number }[];
  mapped_ksbs: MappedKSB[];
}

const TYPE_COLORS: Record<string, string> = {
  Knowledge: '#3b82f6',
  Skill: '#10b981',
  Behaviour: '#8b5cf6',
};

const emptyForm = { code: '', title: '', credits: '' };

const Modules = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editModule, setEditModule] = useState<ModuleItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    getModules()
      .then((res) => setModules(res.data))
      .catch((err) => console.error('Failed to load modules:', err));
  };

  useEffect(load, []);

  const openDetail = async (id: number) => {
    setLoading(true);
    try {
      const res = await getModuleDetail(id);
      setSelectedDetail(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        title: form.title,
        credits: form.credits ? Number(form.credits) : null,
      };
      if (editModule) {
        await updateModule(editModule.id, payload);
      } else {
        await createModule(payload);
      }
      setShowModal(false);
      setEditModule(null);
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (mod: ModuleItem) => {
    setEditModule(mod);
    setForm({ code: mod.code, title: mod.title, credits: mod.credits?.toString() || '' });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      await deleteModule(deleteTarget);
      if (selectedDetail?.id === deleteTarget) setSelectedDetail(null);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const totalCredits = modules.reduce((s, m) => s + (m.credits || 0), 0);

  /* ─── Detail View ─── */
  if (selectedDetail) {
    return (
      <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
        <div className="max-w-[1600px] mx-auto">
          {/* Back button */}
          <button
            onClick={() => setSelectedDetail(null)}
            className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg transition-all hover:bg-white"
            style={{ fontSize: '14px', color: '#64748b' }}
          >
            <ArrowLeft size={16} /> Back to Modules
          </button>

          {/* Module Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full font-semibold" style={{ background: '#10b98115', color: '#10b981', fontSize: '13px' }}>
                  {selectedDetail.code}
                </span>
                {selectedDetail.credits && (
                  <span className="px-3 py-1 rounded-full" style={{ background: '#3b82f615', color: '#3b82f6', fontSize: '12px' }}>
                    {selectedDetail.credits} credits
                  </span>
                )}
              </div>
              <h1 className="font-semibold" style={{ fontSize: '28px', color: '#0f172a' }}>
                {selectedDetail.title}
              </h1>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10b98115' }}>
                  <BookOpen size={18} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ fontSize: '22px', color: '#0f172a' }}>{selectedDetail.assessments.length}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Assessments</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#3b82f615' }}>
                  <FileText size={18} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ fontSize: '22px', color: '#0f172a' }}>{selectedDetail.submissions.length}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Submissions</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#8b5cf615' }}>
                  <Target size={18} style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ fontSize: '22px', color: '#0f172a' }}>{selectedDetail.mapped_ksbs.length}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>KSBs Mapped</div>
                </div>
              </div>
            </div>
          </div>

          {/* Assessments */}
          <div className="rounded-xl mb-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h2 className="font-semibold" style={{ fontSize: '16px', color: '#0f172a' }}>Assessments</h2>
            </div>
            {selectedDetail.assessments.length === 0 ? (
              <div className="px-6 py-10 text-center" style={{ color: '#94a3b8', fontSize: '14px' }}>
                No assessments for this module.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {selectedDetail.assessments.map((a) => (
                  <div key={a.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium" style={{ fontSize: '14px', color: '#0f172a' }}>{a.title}</div>
                      {a.description && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{a.description}</div>}
                    </div>
                    {a.due_date && (
                      <span className="px-3 py-1 rounded-full" style={{ background: '#f59e0b15', color: '#f59e0b', fontSize: '12px', fontWeight: '500' }}>
                        Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mapped KSBs */}
          <div className="rounded-xl" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h2 className="font-semibold" style={{ fontSize: '16px', color: '#0f172a' }}>KSBs Mapped to This Module</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                KSBs linked through evidence submissions against this module's assessments
              </p>
            </div>
            {selectedDetail.mapped_ksbs.length === 0 ? (
              <div className="px-6 py-10 text-center" style={{ color: '#94a3b8', fontSize: '14px' }}>
                No KSBs have been mapped to this module yet. KSBs appear here when submissions link to them.
              </div>
            ) : (
              <table className="w-full">
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    {['Code', 'Type', 'Description', 'Evidence Count'].map((h) => (
                      <th key={h} className="text-left px-6 py-3" style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDetail.mapped_ksbs.map((ksb, idx) => {
                    const color = TYPE_COLORS[ksb.type] || '#64748b';
                    return (
                      <tr key={ksb.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full font-medium" style={{ background: `${color}15`, color, fontSize: '13px' }}>
                            {ksb.code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full" style={{ background: `${color}10`, color, fontSize: '12px', fontWeight: '500' }}>
                            {ksb.type}
                          </span>
                        </td>
                        <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>
                          {ksb.description}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold" style={{ fontSize: '14px', color: '#0f172a' }}>
                            {ksb.submission_count}
                          </span>
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}> submission{ksb.submission_count !== 1 ? 's' : ''}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── List View ─── */
  return (
    <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: '28px', color: '#0f172a' }}>Modules</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Manage programme modules and assessments. Click a module to view mapped KSBs.</p>
          </div>
          <button
            onClick={() => { setEditModule(null); setForm(emptyForm); setShowModal(true); }}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{ background: '#10b981', color: 'white', fontSize: '14px', display: isAdmin ? undefined : 'none' }}
          >
            <Plus size={18} /> Add Module
          </button>
        </div>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Module"
          message="This will permanently delete this module and all its assessments. This action cannot be undone."
          confirmLabel="Delete Module"
          loading={deleting}
        />

        {/* Create / Edit Modal */}
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditModule(null); }} title={editModule ? 'Edit Module' : 'Add Module'}>
          <form onSubmit={handleSubmit}>
            <FormField label="Code">
              <FormInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MOD101" />
            </FormField>
            <FormField label="Title">
              <FormInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Software Development" />
            </FormField>
            <FormField label="Credits (optional)">
              <FormInput type="number" min="0" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder="e.g. 20" />
            </FormField>
            <SubmitButton disabled={saving}>{saving ? 'Saving…' : editModule ? 'Update Module' : 'Create Module'}</SubmitButton>
          </form>
        </Modal>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#10b98115' }}>
                <BookOpen size={22} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: '28px', color: '#0f172a' }}>{modules.length}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Total Modules</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#3b82f615' }}>
                <BookOpen size={22} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: '28px', color: '#0f172a' }}>{totalCredits}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Total Credits</div>
              </div>
            </div>
          </div>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.id}
              className="rounded-xl p-6 transition-all duration-200 hover:shadow-md cursor-pointer group flex flex-col"
              style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              onClick={() => openDetail(mod.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10b98115' }}>
                  <BookOpen size={18} style={{ color: '#10b981' }} />
                </div>
                <span className="px-3 py-1 rounded-full font-medium" style={{ background: '#10b98115', color: '#10b981', fontSize: '12px' }}>
                  {mod.code}
                </span>
              </div>
              <h3 className="font-semibold mb-2" style={{ fontSize: '16px', color: '#0f172a' }}>{mod.title}</h3>
              <div className="flex items-center gap-4 mb-4" style={{ fontSize: '13px', color: '#94a3b8' }}>
                {mod.credits !== null && <span>{mod.credits} credits</span>}
                <span className="text-blue-500 group-hover:underline">View KSBs →</span>
              </div>
              {/* Action buttons – bottom right */}
              <div className="flex-1" />
              {isAdmin && (
              <div className="flex justify-end gap-1 pt-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderTop: '1px solid #f1f5f9' }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(mod)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
                  title="Edit"
                >
                  <Edit2 size={14} style={{ color: '#64748b' }} />
                </button>
                <button
                  onClick={() => setDeleteTarget(mod.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 size={14} style={{ color: '#ef4444' }} />
                </button>
              </div>
              )}
            </div>
          ))}
          {modules.length === 0 && (
            <div className="col-span-3 rounded-xl p-12 text-center" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No modules yet. Click "Add Module" to create one.</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-4 rounded-xl bg-white shadow-lg" style={{ fontSize: '14px', color: '#64748b' }}>
              Loading module details…
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modules;
