import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyModules } from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import { BookOpen, Calendar, FileText, ChevronDown, ChevronRight, CheckCircle, Clock, Circle, Target } from 'lucide-react';

interface Assessment {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
}

interface ModuleKSB {
  id: number;
  code: string;
  type: string;
  description: string;
  status: 'evidenced' | 'in_progress' | 'not_started';
}

interface Progress {
  total: number;
  evidenced: number;
  in_progress: number;
  not_started: number;
}

interface Module {
  id: number;
  code: string;
  title: string;
  credits: number;
  assessments: Assessment[];
  ksbs: ModuleKSB[];
  progress: Progress;
}

interface ModulesResponse {
  modules: Module[];
  overall_progress: Progress;
}

const ksbTypeColor: Record<string, { bg: string; text: string }> = {
  Knowledge: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  Skill: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
  Behaviour: { bg: 'rgba(168,85,247,0.1)', text: '#a855f7' },
};

const statusConfig = {
  evidenced: { icon: CheckCircle, color: '#22c55e', label: 'Evidenced', bg: 'rgba(34,197,94,0.1)' },
  in_progress: { icon: Clock, color: '#f59e0b', label: 'In Progress', bg: 'rgba(245,158,11,0.1)' },
  not_started: { icon: Circle, color: '#94a3b8', label: 'Not Started', bg: 'rgba(148,163,184,0.1)' },
};

function ProgressBar({ progress }: { progress: Progress }) {
  if (progress.total === 0) return null;
  const evPct = (progress.evidenced / progress.total) * 100;
  const ipPct = (progress.in_progress / progress.total) * 100;
  return (
    <div className="w-full flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
        <div className="h-full flex">
          <div style={{ width: `${evPct}%`, background: '#22c55e' }} />
          <div style={{ width: `${ipPct}%`, background: '#f59e0b' }} />
        </div>
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {progress.evidenced}/{progress.total}
      </span>
    </div>
  );
}

export default function MyModules() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ModulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    getMyModules().then(r => {
      setData(r.data);
      // Auto-expand module from URL query param
      const moduleParam = searchParams.get('module');
      if (moduleParam) {
        const id = Number(moduleParam);
        if (r.data.modules.some((m: Module) => m.id === id)) {
          setExpandedId(id);
        }
        // Clean up the URL param
        setSearchParams({}, { replace: true });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading modules..." />;
  if (!data) return <div className="p-8 text-gray-500">Failed to load modules.</div>;

  const { modules, overall_progress } = data;
  const overallPct = overall_progress.total > 0 ? Math.round((overall_progress.evidenced / overall_progress.total) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modules & KSB Progress</h1>
        <p className="text-gray-500 mt-1">Your programme modules and KSB coverage progress</p>
      </div>

      {/* Overall KSB Progress */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
            <Target size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Overall KSB Coverage</h2>
            <p className="text-sm text-gray-500">{overallPct}% of all KSBs evidenced</p>
          </div>
        </div>
        <div className="mb-3">
          <ProgressBar progress={overall_progress} />
        </div>
        <div className="flex gap-4">
          {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => {
            const count = overall_progress[key as keyof Progress] as number;
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <Icon size={13} style={{ color: cfg.color }} />
                <span className="text-xs" style={{ color: cfg.color }}>{count} {cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module cards */}
      <div className="space-y-4">
        {modules.map(m => {
          const isExpanded = expandedId === m.id;
          const Chevron = isExpanded ? ChevronDown : ChevronRight;
          const modPct = m.progress.total > 0 ? Math.round((m.progress.evidenced / m.progress.total) * 100) : 0;

          return (
            <div key={m.id} className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              {/* Module header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <Chevron size={16} className="text-gray-400 flex-shrink-0" />
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <BookOpen size={20} style={{ color: '#3b82f6' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{m.code}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#64748b' }}>
                      {m.credits} credits
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{m.title}</p>
                  {/* Inline progress bar */}
                  <div className="mt-2 max-w-xs">
                    <ProgressBar progress={m.progress} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-lg font-bold" style={{ color: modPct === 100 ? '#22c55e' : modPct > 0 ? '#f59e0b' : '#94a3b8' }}>
                    {modPct}%
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t" style={{ borderColor: '#f1f5f9' }}>
                  {/* KSBs — primary section */}
                  <div className="pt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      KSBs ({m.ksbs.length})
                    </h4>
                    {m.ksbs.length === 0 ? (
                      <p className="text-sm text-gray-400">No KSBs are mapped to this module.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {m.ksbs.map(k => {
                          const tc = ksbTypeColor[k.type] || ksbTypeColor.Knowledge;
                          const sc = statusConfig[k.status];
                          const StatusIcon = sc.icon;
                          return (
                            <div key={k.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#f8fafc' }}>
                              <StatusIcon size={16} style={{ color: sc.color }} className="mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-mono font-semibold text-gray-900">{k.code}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: tc.bg, color: tc.text }}>{k.type}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{k.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Assessments */}
                  <div className="pt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Assessments ({m.assessments.length})
                    </h4>
                    {m.assessments.length === 0 ? (
                      <p className="text-sm text-gray-400">No assessments listed</p>
                    ) : (
                      <div className="space-y-2">
                        {m.assessments.map(a => (
                          <div key={a.id} className="p-3 rounded-lg" style={{ background: '#f8fafc' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <FileText size={14} className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-800">{a.title}</span>
                            </div>
                            {a.description && <p className="text-xs text-gray-500 ml-6">{a.description}</p>}
                            {a.due_date && (
                              <div className="flex items-center gap-1 ml-6 mt-1">
                                <Calendar size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-400">Due: {new Date(a.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
