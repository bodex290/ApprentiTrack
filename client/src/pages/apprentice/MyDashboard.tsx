import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyDashboard } from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import { TrendingUp, FileText, Target, BookOpen, CheckCircle, Clock, Circle } from 'lucide-react';

interface ModuleSummary {
  id: number;
  code: string;
  title: string;
  credits: number | null;
  total_ksbs: number;
  evidenced_ksbs: number;
  in_progress_ksbs: number;
  not_started_ksbs: number;
  submissions: number;
}

interface DashboardData {
  apprentice_id: number;
  name: string;
  cohort_id: number;
  employer: string;
  total_submissions: number;
  submission_statuses: Record<string, number>;
  total_ksbs: number;
  ksbs_evidenced: number;
  ksbs_in_progress: number;
  ksbs_not_started: number;
  ksb_coverage_pct: number;
  modules: ModuleSummary[];
}

export default function MyDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading dashboard..." />;
  if (!data) return <div className="p-8 text-red-500">Failed to load dashboard</div>;

  const statCards = [
    { label: 'KSB Coverage', value: `${data.ksb_coverage_pct}%`, sub: `${data.ksbs_evidenced} / ${data.total_ksbs} evidenced`, icon: Target, color: '#22c55e' },
    { label: 'Total Submissions', value: data.total_submissions, sub: 'evidence items', icon: FileText, color: '#3b82f6' },
    { label: 'Accepted', value: data.submission_statuses['accepted'] || 0, sub: 'approved evidence', icon: TrendingUp, color: '#8b5cf6' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {data.name}</h1>
        <p className="text-gray-500 mt-1">Track your apprenticeship progress and KSB coverage</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{card.label}</span>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Coverage Progress Bar – three-way breakdown */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall KSB Coverage</h2>
        {/* Stacked bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex" style={{ background: '#f1f5f9' }}>
          {data.ksbs_evidenced > 0 && (
            <div
              className="h-4 transition-all duration-500"
              style={{ width: `${(data.ksbs_evidenced / data.total_ksbs) * 100}%`, background: '#22c55e' }}
            />
          )}
          {data.ksbs_in_progress > 0 && (
            <div
              className="h-4 transition-all duration-500"
              style={{ width: `${(data.ksbs_in_progress / data.total_ksbs) * 100}%`, background: '#f59e0b' }}
            />
          )}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <CheckCircle size={14} style={{ color: '#22c55e' }} /> {data.ksbs_evidenced} Evidenced
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock size={14} style={{ color: '#f59e0b' }} /> {data.ksbs_in_progress} In Progress
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Circle size={14} style={{ color: '#94a3b8' }} /> {data.ksbs_not_started} Not Started
          </span>
        </div>
      </div>

      {/* Submission Breakdown */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            { key: 'draft', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
            { key: 'submitted', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
            { key: 'reviewed', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { key: 'accepted', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
            { key: 'rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          ]).map(({ key, color, bg }) => (
            <div key={key} className="text-center p-3 rounded-lg" style={{ background: bg, border: `1px solid ${color}20` }}>
              <div className="text-xl font-bold" style={{ color }}>{data.submission_statuses[key] || 0}</div>
              <div className="text-xs font-medium capitalize mt-1" style={{ color }}>{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Overview */}
      {data.modules && data.modules.length > 0 && (
        <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Module Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.modules.map(m => {
              const evPct = m.total_ksbs > 0 ? (m.evidenced_ksbs / m.total_ksbs) * 100 : 0;
              const ipPct = m.total_ksbs > 0 ? (m.in_progress_ksbs / m.total_ksbs) * 100 : 0;
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/my/modules?module=${m.id}`)}
                  className="rounded-lg p-4 cursor-pointer transtion-all duration-200 hover:shadow-md hover:border-blue-300"
                  style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}
                  title={`View ${m.code} details`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <BookOpen size={16} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{m.code}</h3>
                      <p className="text-xs text-gray-500 truncate">{m.title}</p>
                    </div>
                  </div>
                  {m.credits != null && (
                    <p className="text-xs text-gray-400 mb-2">{m.credits} credits</p>
                  )}
                  {/* KSB stacked progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>KSB Coverage</span>
                      <span>{m.evidenced_ksbs}/{m.total_ksbs}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ background: '#e2e8f0' }}>
                      {m.evidenced_ksbs > 0 && (
                        <div className="h-2 transition-all duration-500" style={{ width: `${evPct}%`, background: '#22c55e' }} />
                      )}
                      {m.in_progress_ksbs > 0 && (
                        <div className="h-2 transition-all duration-500" style={{ width: `${ipPct}%`, background: '#f59e0b' }} />
                      )}
                    </div>
                  </div>
                  {/* Mini legend */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#22c55e' }} />{m.evidenced_ksbs} evidenced</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#f59e0b' }} />{m.in_progress_ksbs} in progress</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#94a3b8' }} />{m.not_started_ksbs} not started</span>
                  </div>
                  <div className="text-xs text-gray-500">{m.submissions} submission{m.submissions !== 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
