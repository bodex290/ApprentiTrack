import { useEffect, useState, useCallback } from 'react';
import {
  Users, FileCheck, Target, CheckCircle, AlertCircle, Star,
  TrendingUp, BarChart3, Shield, Maximize2, X, Lightbulb, FileBarChart, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  ScatterChart, Scatter, ZAxis,
  LineChart, Line,
} from 'recharts';
import {
  getDashboardSummary,
  getSubmissionsByModule,
  getKSBCoverageByType,
  getApprenticeProgress,
  getSubmissionTrends,
  getCohortComparison,
  getKSBHeatmap,
  getApprenticeScatter,
  getInterventionAnalysis,
  getChartAnalysis,
} from '../services/api';

/* ── Types ── */
interface SummaryData {
  total_apprentices: number;
  total_submissions: number;
  ksb_coverage_pct: number;
  ksbs_evidenced: number;
  total_ksbs: number;
  open_interventions: number;
  avg_feedback_rating: number | null;
}
interface TrendPoint { month: string; draft: number; submitted: number; reviewed: number; accepted: number; total: number; }
interface CohortRow { cohort: string; apprentices: number; submissions: number; accepted: number; ksb_coverage_pct: number; interventions: number; avg_submissions: number; avg_rating: number | null; }
interface ScatterPoint { name: string; submissions: number; accepted: number; ksb_coverage_pct: number; avg_rating: number | null; cohort: string; }
interface HeatCell { module: string; ksb: string; ksb_type: string; value: number; }
interface SeverityRow { severity: string; open: number; in_progress: number; resolved: number; total: number; }
interface MonthlyIntervention { month: string; low: number; medium: number; high: number; total: number; }

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const STATUS_AREA_COLORS: Record<string, string> = { accepted: '#10b981', reviewed: '#3b82f6', submitted: '#f59e0b', draft: '#94a3b8' };
const SEVERITY_COLORS: Record<string, string> = { low: '#3b82f6', medium: '#f59e0b', high: '#ef4444' };

const tooltipStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' };

/** Format "2024-10" → "Oct '24" */
const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
};

const axisLabel = (text: string, angle = 0) => ({
  value: text, fontSize: 11, fill: '#94a3b8', fontWeight: 500 as const,
  ...(angle ? { angle, position: 'insideLeft' as const, dx: -5 } : { position: 'insideBottom' as const, offset: -5 }),
});

interface InsightItem { label: string; value: string; detail?: string; color?: string; }
interface AnalysisData {
  insights: InsightItem[];
  summary: string;
  recommendations: string[];
  breakdown?: { label: string; values: Record<string, string | number> }[];
}

const ChartCard = ({ title, icon: Icon, iconColor, children, className = '', loading, error, chartId, expandedChart, onToggleExpand, analysis, analysisLoading: aLoading }: {
  title: string; icon: typeof TrendingUp; iconColor: string; children: React.ReactNode; className?: string;
  loading?: boolean; error?: string | null;
  chartId?: string; expandedChart?: string | null; onToggleExpand?: (id: string) => void;
  analysis?: AnalysisData; analysisLoading?: boolean;
}) => {
  const isExpanded = chartId != null && chartId === expandedChart;
  const isDimmed = expandedChart != null && chartId != null && !isExpanded;

  /* ── Full-screen overlay when this chart is expanded ── */
  if (isExpanded) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(2px)' }}
          onClick={() => onToggleExpand?.('')}
        />
        {/* Full-screen panel — 3-section layout */}
        <div
          className="fixed z-50 flex overflow-hidden"
          style={{ top: 0, right: 0, bottom: 0, left: '256px', background: '#f8fafc' }}
        >
          {/* Left: Chart + Analysis (scrollable) */}
          <div className="flex-1 overflow-auto" style={{ padding: '24px 32px' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${iconColor}15` }}>
                <Icon size={22} style={{ color: iconColor }} />
              </div>
              <h2 className="text-xl font-semibold flex-1" style={{ color: '#0f172a' }}>{title}</h2>
              <button
                onClick={() => onToggleExpand?.('')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
              >
                <X size={16} /> Close
              </button>
            </div>

            {/* Section 1: Chart */}
            <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-400">Loading\u2026</span>
                  </div>
                </div>
              ) : error ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <AlertCircle size={24} className="text-red-400" />
                    <span className="text-sm text-red-500">{error}</span>
                  </div>
                </div>
              ) : children}
            </div>

            {/* Section 2: Detailed Analysis */}
            {aLoading && !analysis && (
              <div className="bg-white rounded-xl p-8 flex items-center justify-center" style={{ border: '1px solid #e2e8f0' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-sm text-slate-400">Generating AI analysis…</span>
                </div>
              </div>
            )}
            {analysis && (
              <div className="space-y-5 pb-8">
                {/* Summary narrative */}
                <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #e2e8f0' }}>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#334155' }}>
                    <FileBarChart size={16} style={{ color: iconColor }} /> Analysis Summary
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{analysis.summary}</p>
                </div>

                {/* Key Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysis.insights.map((ins, i) => (
                    <div key={i} className="bg-white rounded-xl p-4" style={{ border: '1px solid #e2e8f0' }}>
                      <div className="text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{ins.label}</div>
                      <div className="text-2xl font-bold mb-0.5" style={{ color: ins.color || '#0f172a' }}>{ins.value}</div>
                      {ins.detail && <div className="text-xs" style={{ color: '#94a3b8' }}>{ins.detail}</div>}
                    </div>
                  ))}
                </div>

                {/* Data Breakdown Table */}
                {analysis.breakdown && analysis.breakdown.length > 0 && (
                  <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #e2e8f0' }}>
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: '#334155' }}>
                      <Target size={16} style={{ color: iconColor }} /> Detailed Breakdown
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                            <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#475569' }}>Item</th>
                            {Object.keys(analysis.breakdown[0].values).map(k => (
                              <th key={k} className="text-right py-2 px-3 font-semibold" style={{ color: '#475569' }}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.breakdown.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td className="py-2.5 pr-4 font-medium" style={{ color: '#0f172a' }}>{row.label}</td>
                              {Object.values(row.values).map((v, j) => (
                                <td key={j} className="text-right py-2.5 px-3" style={{ color: '#475569' }}>{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #e2e8f0' }}>
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: '#334155' }}>
                      <ArrowRight size={16} style={{ color: '#10b981' }} /> Recommendations
                    </h3>
                    <ul className="space-y-3">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#475569' }}>
                          <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${iconColor}15`, color: iconColor }}>{i + 1}</span>
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Key Insights vertical bar */}
          {analysis && analysis.insights.length > 0 && (
            <div className="w-[280px] flex-shrink-0 border-l overflow-auto" style={{ borderColor: '#e2e8f0', background: 'white', padding: '24px 20px' }}>
              <div className="flex items-center gap-2 mb-5">
                <Lightbulb size={16} style={{ color: '#f59e0b' }} />
                <h3 className="font-semibold text-sm" style={{ color: '#334155' }}>Key Insights</h3>
              </div>
              <div className="space-y-3">
                {analysis.insights.map((ins, i) => (
                  <div key={i} className="p-3.5 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div className="text-[11px] font-medium mb-1" style={{ color: '#64748b' }}>{ins.label}</div>
                    <div className="text-lg font-bold" style={{ color: ins.color || '#0f172a' }}>{ins.value}</div>
                    {ins.detail && <div className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{ins.detail}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Placeholder */}
        <div className={className} style={{ visibility: 'hidden' }} />
      </>
    );
  }

  return (
    <div
      className={`rounded-xl transition-all duration-500 ease-in-out ${
        isDimmed ? 'opacity-[0.3] scale-[0.97] blur-[0.5px]' : 'hover:shadow-md'
      } ${className}`}
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div className="p-6">
        <h2
          className={`font-semibold mb-4 flex items-center gap-2 select-none ${
            chartId ? 'cursor-pointer group' : ''
          }`}
          style={{ fontSize: '16px', color: '#0f172a' }}
          onClick={() => chartId && onToggleExpand?.(chartId)}
        >
          <Icon size={18} style={{ color: iconColor }} />
          <span className="flex-1">{title}</span>
          {chartId && (
            <span className="flex items-center gap-1 text-xs font-normal text-gray-300 group-hover:text-gray-500 transition-all duration-300">
              <Maximize2 size={14} /> <span className="hidden sm:inline">Expand</span>
            </span>
          )}
        </h2>
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading…</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <AlertCircle size={24} className="text-red-400" />
              <span className="text-sm text-red-500">{error}</span>
            </div>
          </div>
        ) : children}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [moduleData, setModuleData] = useState<{ module: string; submissions: number }[]>([]);
  const [ksbTypeData, setKsbTypeData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [progressData, setProgressData] = useState<Record<string, unknown>[]>([]);
  const [apprenticeNames, setApprenticeNames] = useState<string[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [scatter, setScatter] = useState<ScatterPoint[]>([]);
  const [heatCells, setHeatCells] = useState<HeatCell[]>([]);
  const [heatModules, setHeatModules] = useState<string[]>([]);
  const [heatKsbs, setHeatKsbs] = useState<string[]>([]);
  const [sevRows, setSevRows] = useState<SeverityRow[]>([]);
  const [monthlyInt, setMonthlyInt] = useState<MonthlyIntervention[]>([]);

  /* loading / error tracking per chart section */
  const [loading, setLoading] = useState<Record<string, boolean>>({
    summary: true, trends: true, ksbType: true, modules: true,
    cohorts: true, scatter: true, severity: true, monthlyInt: true,
    progress: true, heatmap: true,
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Record<string, AnalysisData>>({});
  const [analysisLoading, setAnalysisLoading] = useState<Record<string, boolean>>({});

  const fetchAnalysis = useCallback((chartId: string) => {
    if (analysisCache[chartId] || analysisLoading[chartId]) return;
    setAnalysisLoading(p => ({ ...p, [chartId]: true }));
    getChartAnalysis(chartId)
      .then(r => {
        setAnalysisCache(p => ({ ...p, [chartId]: r.data }));
      })
      .catch(() => { /* analysis is optional – chart still works */ })
      .finally(() => setAnalysisLoading(p => ({ ...p, [chartId]: false })));
  }, [analysisCache, analysisLoading]);

  const toggleChart = useCallback((id: string) => {
    setExpandedChart(prev => {
      const next = prev === id || id === '' ? null : id;
      if (next) fetchAnalysis(next);
      return next;
    });
  }, [fetchAnalysis]);

  /* Close on Escape key */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedChart(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Lock body scroll when expanded */
  useEffect(() => {
    document.body.style.overflow = expandedChart ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [expandedChart]);

  const done = (key: string) => setLoading(p => ({ ...p, [key]: false }));
  const fail = (key: string, msg = 'Failed to load data') => {
    setErrors(p => ({ ...p, [key]: msg }));
    setLoading(p => ({ ...p, [key]: false }));
  };

  useEffect(() => {
    getDashboardSummary().then(r => { setSummary(r.data); done('summary'); }).catch(() => fail('summary'));
    getSubmissionsByModule().then(r => {
      setModuleData(r.data.map((m: { code: string; statuses: Record<string, number> }) => {
        const total = Object.values(m.statuses).reduce((a: number, b: number) => a + b, 0);
        return { module: m.code, submissions: total };
      }));
      done('modules');
    }).catch(() => fail('modules'));
    getKSBCoverageByType().then(r => {
      const typeColors: Record<string, string> = { Knowledge: '#3b82f6', Skill: '#10b981', Behaviour: '#8b5cf6' };
      setKsbTypeData(r.data.map((t: { type: string; total: number; evidenced: number }) => ({
        name: t.type, value: t.total > 0 ? Math.round((t.evidenced / t.total) * 100) : 0, color: typeColors[t.type] || '#64748b',
      })));
      done('ksbType');
    }).catch(() => fail('ksbType'));
    getApprenticeProgress().then(r => {
      const names = r.data.map((a: { name: string }) => a.name.split(' ')[0]);
      setApprenticeNames(names);
      const merged: Record<string, unknown> = { period: 'Current' };
      r.data.forEach((a: { name: string; ksb_coverage_pct: number }) => {
        merged[a.name.split(' ')[0].toLowerCase()] = a.ksb_coverage_pct;
      });
      setProgressData([merged]);
      done('progress');
    }).catch(() => fail('progress'));
    getSubmissionTrends().then(r => { setTrends(r.data); done('trends'); }).catch(() => fail('trends'));
    getCohortComparison().then(r => { setCohorts(r.data); done('cohorts'); }).catch(() => fail('cohorts'));
    getApprenticeScatter().then(r => { setScatter(r.data); done('scatter'); }).catch(() => fail('scatter'));
    getKSBHeatmap().then(r => {
      setHeatCells(r.data.grid);
      setHeatModules(r.data.modules.map((m: { code: string }) => m.code));
      setHeatKsbs(r.data.ksbs.map((k: { code: string }) => k.code));
      done('heatmap');
    }).catch(() => fail('heatmap'));
    getInterventionAnalysis().then(r => {
      setSevRows(r.data.by_severity);
      setMonthlyInt(r.data.monthly);
      done('severity'); done('monthlyInt');
    }).catch(() => { fail('severity'); fail('monthlyInt'); });
  }, []);

  if (loading.summary) {
    return <div className="p-8 flex items-center justify-center" style={{ minHeight: '100vh' }}><div className="flex flex-col items-center gap-3"><div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" /><span className="text-slate-400">Loading dashboard…</span></div></div>;
  }

  if (errors.summary || !summary) {
    return <div className="p-8 flex items-center justify-center" style={{ minHeight: '100vh' }}><div className="flex flex-col items-center gap-2"><AlertCircle size={32} className="text-red-400" /><span className="text-red-500">Failed to load dashboard summary</span></div></div>;
  }

  const metrics = [
    { label: 'Apprentices', value: String(summary.total_apprentices), icon: Users, color: '#3b82f6' },
    { label: 'Submissions', value: String(summary.total_submissions), icon: FileCheck, color: '#10b981' },
    { label: 'KSB Coverage', value: `${summary.ksb_coverage_pct}%`, icon: Target, color: '#8b5cf6' },
    { label: 'KSBs Evidenced', value: `${summary.ksbs_evidenced}/${summary.total_ksbs}`, icon: CheckCircle, color: '#06b6d4' },
    { label: 'Open Interventions', value: String(summary.open_interventions), icon: AlertCircle, color: '#ef4444' },
    { label: 'Avg Feedback', value: summary.avg_feedback_rating ? `${summary.avg_feedback_rating}/5` : 'N/A', icon: Star, color: '#f59e0b' },
  ];

  const maxHeatVal = Math.max(1, ...heatCells.map(c => c.value));
  const heatColor = (val: number) => {
    if (val === 0) return '#f8fafc';
    const intensity = Math.min(val / maxHeatVal, 1);
    const r = Math.round(59 + (255 - 59) * (1 - intensity));
    const g = Math.round(130 + (255 - 130) * (1 - intensity));
    const b = Math.round(246 + (255 - 246) * (1 - intensity));
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="p-8" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="font-semibold mb-1" style={{ fontSize: '28px', color: '#0f172a' }}>Dashboard</h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Overview of apprenticeship progress and key metrics</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="rounded-xl p-5 transition-all duration-200 hover:shadow-md" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `3px solid ${m.color}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${m.color}15` }}>
                    <Icon size={20} style={{ color: m.color }} />
                  </div>
                </div>
                <div className="font-semibold mb-0.5" style={{ fontSize: '24px', color: '#0f172a' }}>{m.value}</div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{m.label}</div>
              </div>
            );
          })}
        </div>

        {/* All Charts — click any to expand */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ChartCard chartId="trends" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['trends']} analysisLoading={analysisLoading['trends']} title="Submission Trends Over Time" icon={TrendingUp} iconColor="#3b82f6" loading={loading.trends} error={errors.trends}>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Month')} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Submissions', -90)} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMonth} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="accepted" stackId="1" stroke={STATUS_AREA_COLORS.accepted} fill={`${STATUS_AREA_COLORS.accepted}40`} name="Accepted" />
                  <Area type="monotone" dataKey="reviewed" stackId="1" stroke={STATUS_AREA_COLORS.reviewed} fill={`${STATUS_AREA_COLORS.reviewed}40`} name="Reviewed" />
                  <Area type="monotone" dataKey="submitted" stackId="1" stroke={STATUS_AREA_COLORS.submitted} fill={`${STATUS_AREA_COLORS.submitted}40`} name="Submitted" />
                  <Area type="monotone" dataKey="draft" stackId="1" stroke={STATUS_AREA_COLORS.draft} fill={`${STATUS_AREA_COLORS.draft}40`} name="Draft" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No trend data yet</div>
            )}
          </ChartCard>

          <ChartCard chartId="ksbType" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['ksbType']} analysisLoading={analysisLoading['ksbType']} title="KSB Coverage by Type" icon={Target} iconColor="#8b5cf6" loading={loading.ksbType} error={errors.ksbType}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={ksbTypeData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={2} dataKey="value">
                  {ksbTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => `${val}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {ksbTypeData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard chartId="modules" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['modules']} analysisLoading={analysisLoading['modules']} title="Submissions by Module" icon={BarChart3} iconColor="#10b981" loading={loading.modules} error={errors.modules}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={moduleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Total Submissions')} />
                <YAxis dataKey="module" type="category" width={80} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="submissions" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard chartId="cohorts" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['cohorts']} analysisLoading={analysisLoading['cohorts']} title="Cohort Comparison" icon={Users} iconColor="#06b6d4" loading={loading.cohorts} error={errors.cohorts}>
            {cohorts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cohorts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="cohort" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Count', -90)} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="submissions" fill="#3b82f6" name="Submissions" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accepted" fill="#10b981" name="Accepted" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="interventions" fill="#ef4444" name="Interventions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No cohort data</div>
            )}
          </ChartCard>
          <ChartCard chartId="scatter" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['scatter']} analysisLoading={analysisLoading['scatter']} title="Apprentice Performance" icon={TrendingUp} iconColor="#f59e0b" loading={loading.scatter} error={errors.scatter}>
            {scatter.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="submissions" name="Submissions" tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Total Submissions')} />
                  <YAxis dataKey="ksb_coverage_pct" name="KSB Coverage %" tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('KSB Coverage %', -90)} />
                  <ZAxis dataKey="accepted" range={[60, 400]} name="Accepted" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload as ScatterPoint;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border text-xs" style={{ borderColor: '#e2e8f0' }}>
                          <p className="font-semibold" style={{ color: '#0f172a' }}>{d.name}</p>
                          <p style={{ color: '#64748b' }}>{d.cohort}</p>
                          <p>Submissions: <b>{d.submissions}</b></p>
                          <p>KSB Coverage: <b>{d.ksb_coverage_pct}%</b></p>
                          <p>Accepted: <b>{d.accepted}</b></p>
                          {d.avg_rating && <p>Avg Rating: <b>{d.avg_rating}/5</b></p>}
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatter} fill="#8b5cf6" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No data</div>
            )}
          </ChartCard>

          <ChartCard chartId="severity" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['severity']} analysisLoading={analysisLoading['severity']} title="Interventions by Severity" icon={Shield} iconColor="#ef4444" loading={loading.severity} error={errors.severity}>
            {sevRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sevRows} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Flags Raised')} />
                  <YAxis dataKey="severity" type="category" width={70} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="open" stackId="a" fill="#ef4444" name="Open" />
                  <Bar dataKey="in_progress" stackId="a" fill="#f59e0b" name="In Progress" />
                  <Bar dataKey="resolved" stackId="a" fill="#10b981" name="Resolved" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No intervention data</div>
            )}
          </ChartCard>
          <ChartCard chartId="monthlyInt" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['monthlyInt']} analysisLoading={analysisLoading['monthlyInt']} title="Intervention Trend (Monthly)" icon={AlertCircle} iconColor="#ef4444" loading={loading.monthlyInt} error={errors.monthlyInt}>
            {monthlyInt.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyInt}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Month')} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={axisLabel('Flags', -90)} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="high" stroke={SEVERITY_COLORS.high} strokeWidth={2} name="High" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="medium" stroke={SEVERITY_COLORS.medium} strokeWidth={2} name="Medium" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="low" stroke={SEVERITY_COLORS.low} strokeWidth={2} name="Low" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No intervention trend data</div>
            )}
          </ChartCard>

          <ChartCard chartId="progress" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['progress']} analysisLoading={analysisLoading['progress']} title="Apprentice KSB Coverage (%)" icon={CheckCircle} iconColor="#06b6d4" loading={loading.progress} error={errors.progress}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={progressData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} label={axisLabel('Coverage %', -90)} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                {apprenticeNames.map((name, i) => (
                  <Bar key={name} dataKey={name.toLowerCase()} fill={COLORS[i % COLORS.length]} name={name} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          {heatCells.length > 0 && (
          <ChartCard chartId="heatmap" expandedChart={expandedChart} onToggleExpand={toggleChart} analysis={analysisCache['heatmap']} analysisLoading={analysisLoading['heatmap']} title="KSB Evidence by Module (Heatmap)" icon={BarChart3} iconColor="#8b5cf6" className="col-span-2" loading={loading.heatmap} error={errors.heatmap}>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2" style={{ color: '#64748b', fontWeight: 600, minWidth: 80 }}>Module</th>
                    {heatKsbs.map(k => (
                      <th key={k} className="px-2 py-2 text-center" style={{ color: '#64748b', fontWeight: 500, minWidth: 38 }} title={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatModules.map(mod => (
                    <tr key={mod}>
                      <td className="px-3 py-1.5 font-medium" style={{ color: '#0f172a' }}>{mod}</td>
                      {heatKsbs.map(ksb => {
                        const cell = heatCells.find(c => c.module === mod && c.ksb === ksb);
                        const val = cell?.value || 0;
                        return (
                          <td key={ksb} className="px-2 py-1.5 text-center" title={`${mod} × ${ksb}: ${val}`}>
                            <div className="w-8 h-8 rounded flex items-center justify-center mx-auto transition-all" style={{ background: heatColor(val), color: val > 0 ? '#1e3a5f' : '#cbd5e1', fontWeight: val > 0 ? 600 : 400 }}>
                              {val}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: '#64748b' }}>
              <span>Evidence count:</span>
              {[{ label: '0', v: 0 }, { label: 'Low', v: maxHeatVal * 0.33 }, { label: 'Med', v: maxHeatVal * 0.66 }, { label: 'High', v: maxHeatVal }].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded" style={{ background: heatColor(l.v) }} /> <span>{l.label}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
