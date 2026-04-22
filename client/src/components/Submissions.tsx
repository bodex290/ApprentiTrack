import { useEffect, useState } from 'react';
import { FileText, Clock, Eye, CheckCircle, Trash2, MessageSquare, Star, ChevronDown, Pencil } from 'lucide-react';
import { getSubmissions, getSubmissionsByStatus, updateSubmission, getApprentices, getFeedback, createFeedback, deleteFeedback } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { FormField, FormSelect, SubmitButton } from './FormFields';
import LoadingScreen from './LoadingScreen';

interface Submission {
  id: number;
  title: string;
  status: string;
  submitted_at: string | null;
  created_at: string | null;
  apprentice_id: number;
  assessment_id: number;
}

interface FeedbackItem {
  id: number;
  submission_id: number;
  coach_name: string;
  rating: number | null;
  comments: string | null;
  created_at: string | null;
}

interface Apprentice { id: number; first_name: string; last_name: string; }

const STATUS_COLORS: Record<string, string> = { draft: '#64748b', submitted: '#f59e0b', reviewed: '#3b82f6', accepted: '#10b981' };
const STATUS_BG: Record<string, string> = { draft: '#64748b15', submitted: '#f59e0b15', reviewed: '#3b82f615', accepted: '#10b98115' };
const STATUS_ICONS: Record<string, typeof FileText> = { draft: FileText, submitted: Clock, reviewed: Eye, accepted: CheckCircle };

const PAGE_SIZE = 20;

const Submissions = () => {
  const { user } = useAuth();
  const isCoach = user?.role === 'coach';
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [apprentices, setApprentices] = useState<Apprentice[]>([]);

  // Status change modal
  const [statusTarget, setStatusTarget] = useState<Submission | null>(null);
  const [newStatus, setNewStatus] = useState('');

  // Feedback modal
  const [feedbackTarget, setFeedbackTarget] = useState<Submission | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [feedbackForm, setFeedbackForm] = useState({ rating: '', comments: '' });
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [deleteFeedbackId, setDeleteFeedbackId] = useState<number | null>(null);
  const [feedbackCounts, setFeedbackCounts] = useState<Record<number, number>>({});
  const [pageLoading, setPageLoading] = useState(true);

  const load = (p = page) => {
    getSubmissions({ limit: PAGE_SIZE, offset: p * PAGE_SIZE })
      .then((res) => {
        setSubmissions(res.data.items);
        setTotal(res.data.total);
        // Load feedback counts for all submissions
        getFeedback()
          .then((fbRes) => {
            const counts: Record<number, number> = {};
            (fbRes.data as FeedbackItem[]).forEach((fb) => {
              counts[fb.submission_id] = (counts[fb.submission_id] || 0) + 1;
            });
            setFeedbackCounts(counts);
          })
          .catch(() => {});
      })
      .catch((err) => console.error('Failed to load submissions:', err));
    getSubmissionsByStatus()
      .then((res) => setStatusCounts(res.data))
      .catch((err) => console.error('Failed to load status counts:', err));
  };

  useEffect(() => {
    Promise.all([
      load(page),
      getApprentices({ limit: 100 })
        .then((res) => setApprentices(res.data.items))
        .catch((err) => console.error('Failed to load apprentices:', err)),
    ]).finally(() => setPageLoading(false));
  }, [page]);

  const getApprenticeName = (id: number) => {
    const a = apprentices.find(ap => ap.id === id);
    return a ? `${a.first_name} ${a.last_name}` : `#${id}`;
  };

  const handleStatusChange = async () => {
    if (!statusTarget || !newStatus) return;
    setSaving(true);
    try {
      await updateSubmission(statusTarget.id, { status: newStatus });
      setStatusTarget(null);
      setNewStatus('');
      load();
    } finally {
      setSaving(false);
    }
  };

  // ── Feedback handlers ──
  const openFeedbackModal = (sub: Submission) => {
    setFeedbackTarget(sub);
    setFeedbackForm({ rating: '', comments: '' });
    getFeedback(sub.id)
      .then((res) => setFeedbackList(res.data))
      .catch(() => setFeedbackList([]));
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTarget) return;
    setSavingFeedback(true);
    try {
      await createFeedback({
        submission_id: feedbackTarget.id,
        coach_name: '', // auto-populated by backend
        rating: feedbackForm.rating ? Number(feedbackForm.rating) : null,
        comments: feedbackForm.comments || null,
      });
      setFeedbackForm({ rating: '', comments: '' });
      // Reload feedback for this submission
      const res = await getFeedback(feedbackTarget.id);
      setFeedbackList(res.data);
      // Update counts
      setFeedbackCounts(prev => ({ ...prev, [feedbackTarget.id]: res.data.length }));
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (deleteFeedbackId === null) return;
    try {
      await deleteFeedback(deleteFeedbackId);
      setDeleteFeedbackId(null);
      if (feedbackTarget) {
        const res = await getFeedback(feedbackTarget.id);
        setFeedbackList(res.data);
        setFeedbackCounts(prev => ({ ...prev, [feedbackTarget.id]: res.data.length }));
      }
    } catch {
      console.error('Failed to delete feedback');
    }
  };

  const statusCards = ['draft', 'submitted', 'reviewed', 'accepted'].map((s) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    count: statusCounts[s] || 0,
    icon: STATUS_ICONS[s] || FileText,
    color: STATUS_COLORS[s] || '#64748b',
  }));

  if (pageLoading) return <LoadingScreen message="Loading submissions…" />;

  return (
    <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: '28px', color: '#0f172a' }}>Submissions</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Review apprentice submissions and provide feedback</p>
          </div>
        </div>

        {/* Status Change Modal */}
        <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title="Change Status">
          {statusTarget && (
            <div>
              <div className="rounded-lg p-4 mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="font-medium" style={{ fontSize: '14px', color: '#0f172a' }}>{statusTarget.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Current: {statusTarget.status}</div>
              </div>
              <FormField label="New Status">
                <FormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="">Select status…</option>
                  {['draft', 'submitted', 'reviewed', 'accepted'].filter(s => s !== statusTarget.status).map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </FormSelect>
              </FormField>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || saving}
                className="w-full py-2.5 rounded-lg font-medium transition-all duration-200"
                style={{
                  background: !newStatus || saving ? '#94a3b8' : '#3b82f6',
                  color: 'white', fontSize: '14px',
                  cursor: !newStatus || saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Updating…' : 'Update Status'}
              </button>
            </div>
          )}
        </Modal>

        {/* Status Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statusCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="rounded-xl p-6 transition-all duration-200 hover:shadow-md" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                    <Icon size={22} style={{ color: card.color }} />
                  </div>
                  <div className="font-semibold" style={{ fontSize: '32px', color: '#0f172a' }}>{card.count}</div>
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{card.label}</div>
              </div>
            );
          })}
        </div>

        {/* Submissions Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <h2 className="font-semibold" style={{ fontSize: '16px', color: '#0f172a' }}>All Submissions</h2>
          </div>
          <table className="w-full">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                {['Title', 'Apprentice', 'Assessment', 'Status', 'Date', ...(isCoach ? ['Actions'] : ['Feedback'])].map((h) => (
                  <th key={h} className="text-left px-6 py-4" style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, index) => (
                <tr key={sub.id} className="transition-colors duration-150 hover:bg-slate-50" style={{ background: index % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#3b82f615' }}>
                        <FileText size={18} style={{ color: '#3b82f6' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{sub.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>{getApprenticeName(sub.apprentice_id)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full" style={{ background: '#64748b15', color: '#64748b', fontSize: '12px', fontWeight: '500' }}>ASS-{sub.assessment_id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1.5 rounded-full inline-block"
                      style={{
                        background: STATUS_BG[sub.status] || '#64748b15',
                        color: STATUS_COLORS[sub.status] || '#64748b',
                        fontSize: '12px', fontWeight: '500', textTransform: 'capitalize',
                      }}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ fontSize: '14px', color: '#64748b' }}>
                    {sub.submitted_at
                      ? new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : sub.created_at
                        ? new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {isCoach ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setStatusTarget(sub); setNewStatus(''); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-md"
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            border: 'none',
                          }}
                          title="Change submission status"
                        >
                          <Pencil size={12} />
                          Status
                          <ChevronDown size={12} />
                        </button>
                        <button
                          onClick={() => openFeedbackModal(sub)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-md relative"
                          style={{
                            background: '#f59e0b15',
                            color: '#f59e0b',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            border: '1px solid #f59e0b30',
                          }}
                          title="View / add feedback"
                        >
                          <MessageSquare size={12} />
                          Feedback
                          {(feedbackCounts[sub.id] || 0) > 0 && (
                            <span className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#f59e0b', color: 'white', fontSize: '10px', fontWeight: '600' }}>
                              {feedbackCounts[sub.id]}
                            </span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => openFeedbackModal(sub)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-amber-50 relative" title="Feedback">
                          <MessageSquare size={14} style={{ color: '#f59e0b' }} />
                          {(feedbackCounts[sub.id] || 0) > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#f59e0b', color: 'white', fontSize: '10px', fontWeight: '600' }}>
                              {feedbackCounts[sub.id]}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center" style={{ color: '#94a3b8', fontSize: '14px' }}>No submissions yet.</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: page === 0 ? '#f1f5f9' : '#3b82f6',
                    color: page === 0 ? '#94a3b8' : 'white',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: (page + 1) * PAGE_SIZE >= total ? '#f1f5f9' : '#3b82f6',
                    color: (page + 1) * PAGE_SIZE >= total ? '#94a3b8' : 'white',
                    cursor: (page + 1) * PAGE_SIZE >= total ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Modal */}
        <Modal open={!!feedbackTarget} onClose={() => { setFeedbackTarget(null); load(); }} title={feedbackTarget ? `Feedback – ${feedbackTarget.title}` : 'Feedback'}>
          {feedbackTarget && (
            <div>
              {/* Submission info */}
              <div className="rounded-lg p-4 mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="font-medium" style={{ fontSize: '14px', color: '#0f172a' }}>{feedbackTarget.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Apprentice: {getApprenticeName(feedbackTarget.apprentice_id)} · Status: {feedbackTarget.status}
                </div>
              </div>

              {/* Existing feedback */}
              {feedbackList.length > 0 && (
                <div className="mb-4">
                  <div className="font-medium mb-2" style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous Feedback</div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {feedbackList.map((fb) => (
                      <div key={fb.id} className="rounded-lg p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{fb.coach_name}</span>
                            {fb.rating && (
                              <span className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={12} fill={s <= fb.rating! ? '#f59e0b' : 'none'} style={{ color: s <= fb.rating! ? '#f59e0b' : '#cbd5e1' }} />
                                ))}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {fb.created_at ? new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </span>
                            {isCoach && (
                            <button onClick={() => setDeleteFeedbackId(fb.id)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50" title="Delete">
                              <Trash2 size={12} style={{ color: '#ef4444' }} />
                            </button>
                            )}
                          </div>
                        </div>
                        {fb.comments && <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{fb.comments}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New feedback form – coaches only */}
              {isCoach && (
              <div style={{ borderTop: feedbackList.length > 0 ? '1px solid #e2e8f0' : 'none', paddingTop: feedbackList.length > 0 ? '16px' : '0' }}>
                <div className="font-medium mb-3" style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add Feedback</div>
                <form onSubmit={handleFeedbackSubmit}>
                  <FormField label="Rating (1–5)">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFeedbackForm({ ...feedbackForm, rating: feedbackForm.rating === String(val) ? '' : String(val) })}
                          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                          style={{
                            background: feedbackForm.rating === String(val) ? '#f59e0b' : '#f8fafc',
                            color: feedbackForm.rating === String(val) ? 'white' : '#64748b',
                            border: `1px solid ${feedbackForm.rating === String(val) ? '#f59e0b' : '#e2e8f0'}`,
                            fontWeight: '600', fontSize: '14px',
                            cursor: 'pointer',
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Comments">
                    <textarea
                      value={feedbackForm.comments}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
                      placeholder="Write your feedback…"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg transition-all focus:outline-none"
                      style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '14px',
                        color: '#0f172a', resize: 'vertical',
                      }}
                    />
                  </FormField>
                  <SubmitButton disabled={savingFeedback || (!feedbackForm.rating && !feedbackForm.comments)}>
                    {savingFeedback ? 'Submitting…' : 'Submit Feedback'}
                  </SubmitButton>
                </form>
              </div>
              )}
            </div>
          )}
        </Modal>

        {/* Delete Feedback Confirmation */}
        <ConfirmDialog
          open={deleteFeedbackId !== null}
          onClose={() => setDeleteFeedbackId(null)}
          onConfirm={handleDeleteFeedback}
          title="Delete Feedback"
          message="This will permanently delete this feedback entry. This action cannot be undone."
          confirmLabel="Delete Feedback"
          loading={false}
        />

      </div>
    </div>
  );
};

export default Submissions;