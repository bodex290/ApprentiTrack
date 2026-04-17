import { useState, useEffect } from 'react';
import { getMySubmissions } from '../../services/api';
import { FileText, MessageSquare, Clock, BookOpen, Briefcase, ChevronDown, ChevronRight, Tag } from 'lucide-react';

interface KSBDetail {
  ksb_id: number;
  code: string;
  type: string;
  description: string | null;
  notes: string | null;
}

interface Submission {
  id: number;
  title: string | null;
  description: string | null;
  status: string;
  file_url: string | null;
  assessment_id: number | null;
  module_id: number | null;
  module_name: string | null;
  work_project: string | null;
  submitted_at: string | null;
  created_at: string;
  ksbs: KSBDetail[];
  feedback: { coach_name: string; rating: number; comments: string; created_at: string }[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8' },
  submitted: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  reviewed: { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6' },
  accepted: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
  rejected: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
};

const ksbTypeColor: Record<string, { bg: string; text: string }> = {
  Knowledge: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  Skill: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
  Behaviour: { bg: 'rgba(168,85,247,0.1)', text: '#a855f7' },
};

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    getMySubmissions().then(r => setSubmissions(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading submissions…</div>;

  const filtered = filterStatus === 'all' ? submissions : submissions.filter(s => s.status === filterStatus);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
          <p className="text-gray-500 mt-1">{submissions.length} evidence entries</p>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>No submissions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const sc = statusColors[sub.status] || statusColors.draft;
            const isExpanded = expandedId === sub.id;
            const Chevron = isExpanded ? ChevronDown : ChevronRight;

            return (
              <div key={sub.id} className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                {/* Clickable header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="w-full flex items-start gap-3 p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <Chevron size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <FileText size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{sub.title || 'Untitled Entry'}</h3>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {new Date(sub.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {sub.module_name && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#3b82f6' }}>
                          <BookOpen size={11} /> {sub.module_name}
                        </span>
                      )}
                      {sub.work_project && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#d97706' }}>
                          <Briefcase size={11} /> {sub.work_project}
                        </span>
                      )}
                    </div>
                    {/* KSB code chips in header */}
                    {sub.ksbs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {sub.ksbs.map(k => {
                          const tc = ksbTypeColor[k.type] || ksbTypeColor.Knowledge;
                          return (
                            <span key={k.ksb_id} className="text-xs font-mono px-2 py-0.5 rounded font-medium" style={{ background: tc.bg, color: tc.text }}>
                              {k.code}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Feedback indicator */}
                  {sub.feedback.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-purple-500 flex-shrink-0 mt-1">
                      <MessageSquare size={13} /> {sub.feedback.length}
                    </span>
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t px-5 pb-5" style={{ borderColor: '#f1f5f9' }}>
                    {/* Description */}
                    {sub.description && (
                      <div className="pt-4 pb-3">
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{sub.description}</p>
                      </div>
                    )}

                    {/* Two-column: KSBs + Feedback */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                      {/* KSB Details */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          KSBs Covered ({sub.ksbs.length})
                        </h4>
                        {sub.ksbs.length === 0 ? (
                          <p className="text-sm text-gray-400">No KSBs linked</p>
                        ) : (
                          <div className="space-y-2">
                            {sub.ksbs.map(k => {
                              const tc = ksbTypeColor[k.type] || ksbTypeColor.Knowledge;
                              return (
                                <div key={k.ksb_id} className="p-3 rounded-lg" style={{ background: '#f8fafc' }}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Tag size={12} style={{ color: tc.text }} />
                                    <span className="text-sm font-mono font-bold" style={{ color: tc.text }}>{k.code}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: tc.bg, color: tc.text }}>{k.type}</span>
                                  </div>
                                  {k.description && (
                                    <p className="text-xs text-gray-600 mt-1">{k.description}</p>
                                  )}
                                  {k.notes && (
                                    <p className="text-xs text-gray-500 mt-1 italic">Note: {k.notes}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Feedback */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Coach Feedback ({sub.feedback.length})
                        </h4>
                        {sub.feedback.length === 0 ? (
                          <div className="p-4 rounded-lg text-center" style={{ background: '#f8fafc' }}>
                            <MessageSquare size={20} className="mx-auto mb-2 text-gray-300" />
                            <p className="text-sm text-gray-400">No feedback yet</p>
                            {sub.status === 'submitted' && (
                              <p className="text-xs text-gray-400 mt-1">Awaiting coach review</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sub.feedback.map((fb, i) => (
                              <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm font-medium text-purple-700">{fb.coach_name}</span>
                                  <span className="text-xs text-yellow-600">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{fb.comments}</p>
                                {fb.created_at && (
                                  <p className="text-xs text-gray-400 mt-2">
                                    {new Date(fb.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
