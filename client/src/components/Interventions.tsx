import { AlertTriangle, Play, CheckCircle, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getInterventions, updateIntervention, createIntervention, deleteIntervention, getApprentices } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { FormField, FormInput, FormSelect, FormTextarea, SubmitButton } from './FormFields';

type FilterTab = 'all' | 'open' | 'in_progress' | 'resolved';

interface Intervention {
  id: number;
  apprentice_id: number;
  reason: string;
  detail: string | null;
  severity: string;
  status: string;
  raised_by: string;
  assigned_to: string | null;
  action_notes: string | null;
  resolution_notes: string | null;
  started_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

interface Apprentice {
  id: number;
  first_name: string;
  last_name: string;
}

const emptyCreateForm = { apprentice_id: '', reason: '', severity: 'medium', detail: '', raised_by: '' };
const emptyStartForm = { assigned_to: '', action_notes: '' };
const emptyResolveForm = { resolution_notes: '' };

const Interventions = () => {
  const { user } = useAuth();
  const isCoach = user?.role === 'coach';
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [apprentices, setApprentices] = useState<Apprentice[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  // Start Investigation modal
  const [startTarget, setStartTarget] = useState<Intervention | null>(null);
  const [startForm, setStartForm] = useState(emptyStartForm);

  // Resolve modal
  const [resolveTarget, setResolveTarget] = useState<Intervention | null>(null);
  const [resolveForm, setResolveForm] = useState(emptyResolveForm);

  const [saving, setSaving] = useState(false);

  // Delete / Re-open confirm dialogs
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [reopenTarget, setReopenTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = () => {
    getInterventions().then((res) => setInterventions(res.data));
  };

  useEffect(() => {
    load();
    getApprentices({ limit: 100 }).then((res) => setApprentices(res.data.items));
  }, []);

  const getApprenticeName = (id: number) => {
    const a = apprentices.find((ap) => ap.id === id);
    return a ? `${a.first_name} ${a.last_name}` : `Apprentice #${id}`;
  };

  /* ── Create ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createIntervention({
        apprentice_id: Number(createForm.apprentice_id),
        reason: createForm.reason,
        severity: createForm.severity,
        detail: createForm.detail || null,
        raised_by: createForm.raised_by || null,
      });
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  /* ── Start Investigation ── */
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTarget) return;
    setSaving(true);
    try {
      await updateIntervention(startTarget.id, {
        status: 'in_progress',
        assigned_to: startForm.assigned_to || null,
        action_notes: startForm.action_notes || null,
      });
      setStartTarget(null);
      setStartForm(emptyStartForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  /* ── Resolve ── */
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setSaving(true);
    try {
      await updateIntervention(resolveTarget.id, {
        status: 'resolved',
        resolution_notes: resolveForm.resolution_notes || null,
      });
      setResolveTarget(null);
      setResolveForm(emptyResolveForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  /* ── Re-open ── */
  const handleReopen = async () => {
    if (reopenTarget === null) return;
    setReopening(true);
    try {
      await updateIntervention(reopenTarget, { status: 'open' });
      setReopenTarget(null);
      load();
    } finally {
      setReopening(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      await deleteIntervention(deleteTarget);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const c: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
    return c[severity] || '#64748b';
  };
  const getSeverityBg = (severity: string) => {
    const c: Record<string, string> = { high: '#ef444415', medium: '#f59e0b15', low: '#3b82f615' };
    return c[severity] || '#64748b15';
  };
  const getStatusColor = (status: string) => {
    const c: Record<string, string> = { open: '#ef4444', in_progress: '#f59e0b', resolved: '#10b981' };
    return c[status] || '#64748b';
  };
  const getStatusBg = (status: string) => {
    const c: Record<string, string> = { open: '#ef444415', in_progress: '#f59e0b15', resolved: '#10b98115' };
    return c[status] || '#64748b15';
  };

  const filteredInterventions = interventions.filter((i) => activeTab === 'all' || i.status === activeTab);
  const openHighSeverity = interventions.filter((i) => i.status === 'open' && i.severity === 'high').length;

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: '28px', color: '#0f172a' }}>Interventions</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Monitor and manage apprentice support interventions</p>
          </div>
          {isCoach && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{ background: '#ef4444', color: 'white', fontSize: '14px' }}
          >
            <Plus size={18} /> Raise Intervention
          </button>
          )}
        </div>

        {/* ── Create Modal ── */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Raise Intervention">
          <form onSubmit={handleCreate}>
            <FormField label="Apprentice">
              <FormSelect required value={createForm.apprentice_id} onChange={(e) => setCreateForm({ ...createForm, apprentice_id: e.target.value })}>
                <option value="">Select apprentice…</option>
                {apprentices.map((a) => (
                  <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Reason">
              <FormInput required value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="e.g. Missed submission deadline" />
            </FormField>
            <FormField label="Severity">
              <FormSelect value={createForm.severity} onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </FormSelect>
            </FormField>
            <FormField label="Detail (optional)">
              <FormTextarea value={createForm.detail} onChange={(e) => setCreateForm({ ...createForm, detail: e.target.value })} placeholder="Additional context…" />
            </FormField>
            <FormField label="Raised By (optional)">
              <FormInput value={createForm.raised_by} onChange={(e) => setCreateForm({ ...createForm, raised_by: e.target.value })} placeholder="Coach name" />
            </FormField>
            <SubmitButton disabled={saving}>{saving ? 'Saving…' : 'Raise Intervention'}</SubmitButton>
          </form>
        </Modal>

        {/* ── Start Investigation Modal ── */}
        <Modal open={!!startTarget} onClose={() => setStartTarget(null)} title="Start Investigation">
          {startTarget && (
            <form onSubmit={handleStart}>
              <div className="rounded-lg p-4 mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="font-medium mb-1" style={{ fontSize: '14px', color: '#0f172a' }}>
                  {getApprenticeName(startTarget.apprentice_id)}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{startTarget.reason}</div>
              </div>
              <FormField label="Assigned To">
                <FormInput required value={startForm.assigned_to} onChange={(e) => setStartForm({ ...startForm, assigned_to: e.target.value })} placeholder="e.g. Dr. Patel, Ms. Chen" />
              </FormField>
              <FormField label="Action Plan / Notes">
                <FormTextarea required value={startForm.action_notes} onChange={(e) => setStartForm({ ...startForm, action_notes: e.target.value })} placeholder="Describe the planned actions to address this intervention…" />
              </FormField>
              <SubmitButton disabled={saving}>{saving ? 'Starting…' : 'Begin Investigation'}</SubmitButton>
            </form>
          )}
        </Modal>

        {/* ── Resolve Modal ── */}
        <Modal open={!!resolveTarget} onClose={() => setResolveTarget(null)} title="Resolve Intervention">
          {resolveTarget && (
            <form onSubmit={handleResolve}>
              <div className="rounded-lg p-4 mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="font-medium mb-1" style={{ fontSize: '14px', color: '#0f172a' }}>
                  {getApprenticeName(resolveTarget.apprentice_id)}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{resolveTarget.reason}</div>
                {resolveTarget.assigned_to && (
                  <div className="mt-2" style={{ fontSize: '13px', color: '#3b82f6' }}>
                    Assigned to: {resolveTarget.assigned_to}
                  </div>
                )}
              </div>
              <FormField label="Resolution Notes">
                <FormTextarea required value={resolveForm.resolution_notes} onChange={(e) => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })} placeholder="Describe how this intervention was resolved…" />
              </FormField>
              <SubmitButton disabled={saving}>{saving ? 'Resolving…' : 'Mark as Resolved'}</SubmitButton>
            </form>
          )}
        </Modal>

        {/* Alert Banner */}
        {openHighSeverity > 0 && (
          <div className="rounded-xl p-4 mb-6 flex items-center gap-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ef4444' }}>
              <AlertTriangle size={20} style={{ color: 'white' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold mb-1" style={{ fontSize: '14px', color: '#991b1b' }}>
                {openHighSeverity} High-Severity Open Intervention{openHighSeverity !== 1 ? 's' : ''}
              </div>
              <p style={{ fontSize: '13px', color: '#7f1d1d' }}>Immediate attention required for critical apprentice support cases</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === 'all' ? interventions.length : interventions.filter((i) => i.status === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
                style={{
                  background: isActive ? '#3b82f6' : 'white',
                  color: isActive ? 'white' : '#64748b',
                  border: `1px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {tab.label}
                <span className="px-2 py-0.5 rounded-full" style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9',
                  fontSize: '12px',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Intervention Cards */}
        <div className="space-y-4">
          {filteredInterventions.map((intervention) => {
            const isResolved = intervention.status === 'resolved';
            return (
              <div
                key={intervention.id}
                className="rounded-xl p-6 transition-all duration-200 hover:shadow-md"
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  opacity: isResolved ? 0.7 : 1,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold" style={{ fontSize: '16px', color: '#0f172a' }}>
                        {getApprenticeName(intervention.apprentice_id)}
                      </h3>
                      <span className="px-3 py-1 rounded-full" style={{
                        background: getSeverityBg(intervention.severity),
                        color: getSeverityColor(intervention.severity),
                        fontSize: '12px', fontWeight: '500', textTransform: 'capitalize',
                      }}>
                        {intervention.severity}
                      </span>
                      <span className="px-3 py-1 rounded-full" style={{
                        background: getStatusBg(intervention.status),
                        color: getStatusColor(intervention.status),
                        fontSize: '12px', fontWeight: '500', textTransform: 'capitalize',
                      }}>
                        {intervention.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mb-2" style={{ fontSize: '15px', color: '#0f172a', fontWeight: '500' }}>
                      {intervention.reason}
                    </p>
                    {intervention.detail && (
                      <p className="mb-2" style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        {intervention.detail}
                      </p>
                    )}

                    {/* In-progress info */}
                    {intervention.status !== 'open' && intervention.assigned_to && (
                      <div className="rounded-lg p-3 mb-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: '13px' }}>
                          <span style={{ color: '#3b82f6', fontWeight: '500' }}>Assigned to: {intervention.assigned_to}</span>
                          {intervention.started_at && (
                            <span style={{ color: '#94a3b8' }}>
                              Started {new Date(intervention.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {intervention.action_notes && (
                          <p className="mt-2" style={{ fontSize: '13px', color: '#64748b' }}>{intervention.action_notes}</p>
                        )}
                      </div>
                    )}

                    {/* Resolution info */}
                    {isResolved && intervention.resolution_notes && (
                      <div className="rounded-lg p-3 mb-2" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div className="font-medium mb-1" style={{ fontSize: '12px', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolution</div>
                        <p style={{ fontSize: '13px', color: '#166534' }}>{intervention.resolution_notes}</p>
                        {intervention.resolved_at && (
                          <p className="mt-1" style={{ fontSize: '12px', color: '#4ade80' }}>
                            Resolved {new Date(intervention.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4" style={{ fontSize: '13px', color: '#94a3b8' }}>
                      {intervention.raised_by && <span>Raised by {intervention.raised_by}</span>}
                      {intervention.created_at && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(intervention.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isCoach && (
                  <div className="flex gap-2 ml-6 flex-shrink-0">
                    {intervention.status === 'open' && (
                      <button
                        onClick={() => { setStartTarget(intervention); setStartForm(emptyStartForm); }}
                        className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                        style={{ background: '#3b82f6', color: 'white', fontSize: '13px', fontWeight: '500' }}
                      >
                        <Play size={14} /> Start
                      </button>
                    )}
                    {intervention.status === 'in_progress' && (
                      <button
                        onClick={() => { setResolveTarget(intervention); setResolveForm(emptyResolveForm); }}
                        className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                        style={{ background: '#10b981', color: 'white', fontSize: '13px', fontWeight: '500' }}
                      >
                        <CheckCircle size={14} /> Resolve
                      </button>
                    )}
                    {isResolved && (
                      <button
                        onClick={() => setReopenTarget(intervention.id)}
                        className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                        style={{ background: '#f59e0b', color: 'white', fontSize: '13px', fontWeight: '500' }}
                      >
                        <RotateCcw size={14} /> Re-open
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(intervention.id)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={15} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredInterventions.length === 0 && (
            <div className="rounded-xl p-12 text-center" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No interventions in this category.</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Intervention"
          message="This will permanently delete this intervention flag. This action cannot be undone."
          confirmLabel="Delete"
          loading={deleting}
        />

        {/* Re-open Confirmation */}
        <ConfirmDialog
          open={reopenTarget !== null}
          onClose={() => setReopenTarget(null)}
          onConfirm={handleReopen}
          title="Re-open Intervention"
          message='This intervention will be returned to "Open" status and any resolution will be cleared.'
          confirmLabel="Re-open"
          confirmColor="#f59e0b"
          loading={reopening}
        />
      </div>
    </div>
  );
};

export default Interventions;
