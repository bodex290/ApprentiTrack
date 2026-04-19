import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPortfolio } from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import { CheckCircle, Clock, Circle, ChevronDown, ChevronRight, FileText, MessageSquare, Plus, BookOpen, Briefcase, Calendar } from 'lucide-react';

interface Evidence {
  submission_id: number;
  title: string | null;
  description: string | null;
  status: string;
  module_name: string | null;
  work_project: string | null;
  created_at: string | null;
  notes: string | null;
  feedback: { coach_name: string; rating: number; comments: string }[];
}

interface PortfolioKSB {
  id: number;
  code: string;
  type: string;
  description: string;
  coverage_status: 'evidenced' | 'in_progress' | 'not_started';
  evidence: Evidence[];
}

const statusConfig = {
  evidenced: { icon: CheckCircle, color: '#22c55e', label: 'Evidenced', bg: 'rgba(34,197,94,0.1)' },
  in_progress: { icon: Clock, color: '#f59e0b', label: 'In Progress', bg: 'rgba(245,158,11,0.1)' },
  not_started: { icon: Circle, color: '#94a3b8', label: 'Not Started', bg: 'rgba(148,163,184,0.1)' },
};

export default function MyPortfolio() {
  const navigate = useNavigate();
  const [ksbs, setKsbs] = useState<PortfolioKSB[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    getMyPortfolio().then(r => setKsbs(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading portfolio..." />;

  const filtered = ksbs.filter(k =>
    (filterType === 'all' || k.type === filterType) &&
    (filterStatus === 'all' || k.coverage_status === filterStatus)
  );

  const summary = {
    evidenced: ksbs.filter(k => k.coverage_status === 'evidenced').length,
    in_progress: ksbs.filter(k => k.coverage_status === 'in_progress').length,
    not_started: ksbs.filter(k => k.coverage_status === 'not_started').length,
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Portfolio</h1>
        <p className="text-gray-500 mt-1">Your KSB journal — evidence entries organised by each KSB</p>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 mb-6">
        {(Object.entries(summary) as [keyof typeof statusConfig, number][]).map(([key, count]) => {
          const cfg = statusConfig[key];
          const Icon = cfg.icon;
          return (
            <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: cfg.bg }}>
              <Icon size={14} style={{ color: cfg.color }} />
              <span className="text-sm font-medium" style={{ color: cfg.color }}>{count} {cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="all">All Types</option>
          <option value="Knowledge">Knowledge</option>
          <option value="Skill">Skill</option>
          <option value="Behaviour">Behaviour</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="all">All Statuses</option>
          <option value="evidenced">Evidenced</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
        </select>
      </div>

      {/* KSB List */}
      <div className="space-y-2">
        {filtered.map(ksb => {
          const cfg = statusConfig[ksb.coverage_status];
          const Icon = cfg.icon;
          const isExpanded = expandedId === ksb.id;
          const Chevron = isExpanded ? ChevronDown : ChevronRight;

          return (
            <div key={ksb.id} className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : ksb.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <Chevron size={16} className="text-gray-400 flex-shrink-0" />
                <Icon size={16} style={{ color: cfg.color }} className="flex-shrink-0" />
                <span className="font-mono text-sm font-semibold text-gray-900 w-10">{ksb.code}</span>
                <span className="text-sm text-gray-700 flex-1">{ksb.description}</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                  background: ksb.type === 'Knowledge' ? 'rgba(59,130,246,0.1)' : ksb.type === 'Skill' ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                  color: ksb.type === 'Knowledge' ? '#3b82f6' : ksb.type === 'Skill' ? '#22c55e' : '#a855f7',
                }}>
                  {ksb.type}
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: '#f1f5f9' }}>
                  {/* Add Entry button */}
                  <div className="flex justify-end pt-3 mb-2">
                    <button
                      onClick={() => navigate(`/my/submit?ksb=${ksb.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                      style={{ background: '#22c55e' }}
                    >
                      <Plus size={14} />
                      Add Entry
                    </button>
                  </div>

                  {ksb.evidence.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No evidence entries yet. Click "Add Entry" to start building your evidence for this KSB.</p>
                  ) : (
                    <div className="space-y-3">
                      {ksb.evidence.map(ev => (
                        <div key={ev.submission_id} className="p-4 rounded-lg" style={{ background: '#f8fafc' }}>
                          {/* Header: title + status + timestamp */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900">
                                {ev.title || 'Untitled Entry'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs px-2 py-0.5 rounded capitalize" style={{
                                background: ev.status === 'accepted' ? 'rgba(34,197,94,0.1)' : ev.status === 'submitted' ? 'rgba(59,130,246,0.1)' : 'rgba(148,163,184,0.1)',
                                color: ev.status === 'accepted' ? '#22c55e' : ev.status === 'submitted' ? '#3b82f6' : '#94a3b8',
                              }}>{ev.status}</span>
                            </div>
                          </div>

                          {/* Timestamp */}
                          {ev.created_at && (
                            <div className="flex items-center gap-1 mb-2 ml-6">
                              <Calendar size={11} className="text-gray-400" />
                              <span className="text-xs text-gray-400">{formatDate(ev.created_at)}</span>
                            </div>
                          )}

                          {/* Description — the main journal entry */}
                          {ev.description && (
                            <p className="text-sm text-gray-600 ml-6 mb-2 whitespace-pre-line">{ev.description}</p>
                          )}

                          {/* Tags: module + work project */}
                          {(ev.module_name || ev.work_project) && (
                            <div className="flex flex-wrap gap-2 ml-6 mb-2">
                              {ev.module_name && (
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                                  <BookOpen size={10} /> {ev.module_name}
                                </span>
                              )}
                              {ev.work_project && (
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706' }}>
                                  <Briefcase size={10} /> {ev.work_project}
                                </span>
                              )}
                            </div>
                          )}

                          {ev.notes && <p className="text-xs text-gray-500 ml-6 mb-2">{ev.notes}</p>}

                          {/* Coach feedback */}
                          {ev.feedback.length > 0 && (
                            <div className="ml-6 space-y-1 pt-2 border-t" style={{ borderColor: '#e2e8f0' }}>
                              {ev.feedback.map((fb, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <MessageSquare size={12} className="text-purple-400 mt-0.5" />
                                  <div>
                                    <span className="text-xs font-medium text-purple-600">{fb.coach_name}</span>
                                    <span className="text-xs text-gray-400 mx-1">•</span>
                                    <span className="text-xs text-yellow-600">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
                                    <p className="text-xs text-gray-500">{fb.comments}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
