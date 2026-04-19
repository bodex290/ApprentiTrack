import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getMyModules, getMyKSBs, submitMyEvidence } from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import { Send, CheckCircle, AlertCircle, BookOpen, Briefcase, Search, X, FileText, Link as LinkIcon, Tag } from 'lucide-react';

interface Assessment {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
}

interface Module {
  id: number;
  code: string;
  title: string;
  assessments: Assessment[];
}

interface KSB {
  id: number;
  code: string;
  type: string;
  description: string;
}

const ksbColor = (type: string) => ({
  bg: type === 'Knowledge' ? 'rgba(59,130,246,0.1)' : type === 'Skill' ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
  text: type === 'Knowledge' ? '#3b82f6' : type === 'Skill' ? '#22c55e' : '#a855f7',
  border: type === 'Knowledge' ? 'rgba(59,130,246,0.25)' : type === 'Skill' ? 'rgba(34,197,94,0.25)' : 'rgba(168,85,247,0.25)',
});

export default function SubmitEvidence() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preSelectedKsb = searchParams.get('ksb');

  const [modules, setModules] = useState<Module[]>([]);
  const [ksbs, setKsbs] = useState<KSB[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form state — journal-entry style
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<number | ''>('');
  const [assessmentId, setAssessmentId] = useState<number | ''>('');
  const [workProject, setWorkProject] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedKsbs, setSelectedKsbs] = useState<number[]>([]);
  const [status, setStatus] = useState<'draft' | 'submitted'>('submitted');
  const [ksbFilter, setKsbFilter] = useState('');
  const [ksbTypeFilter, setKsbTypeFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([getMyModules(), getMyKSBs()])
      .then(([mRes, kRes]) => {
        setModules(mRes.data.modules);
        setKsbs(kRes.data);
        // Pre-select KSB from URL param (e.g. from portfolio "Add Entry" button)
        if (preSelectedKsb) {
          const ksbId = Number(preSelectedKsb);
          if (kRes.data.some((k: KSB) => k.id === ksbId)) {
            setSelectedKsbs([ksbId]);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [preSelectedKsb]);

  const toggleKsb = (id: number) => {
    setSelectedKsbs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Get assessments for the selected module
  const selectedModule = modules.find(m => m.id === moduleId);
  const assessmentOptions = selectedModule?.assessments ?? [];

  // Reset assessment when module changes
  const handleModuleChange = (val: string) => {
    setModuleId(val ? Number(val) : '');
    setAssessmentId('');
  };

  // Filtered KSBs for the sidebar
  const filteredKsbs = useMemo(() => {
    return ksbs.filter(k => {
      const matchesType = ksbTypeFilter === 'all' || k.type === ksbTypeFilter;
      const matchesSearch = !ksbFilter || k.code.toLowerCase().includes(ksbFilter.toLowerCase()) || k.description.toLowerCase().includes(ksbFilter.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [ksbs, ksbFilter, ksbTypeFilter]);

  // Selected KSB objects for the summary
  const selectedKsbObjects = useMemo(() => ksbs.filter(k => selectedKsbs.includes(k.id)), [ksbs, selectedKsbs]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!description.trim()) {
      setError('Please write a description for your evidence entry.');
      return;
    }
    if (selectedKsbs.length === 0) {
      setError('Select at least one KSB this evidence relates to.');
      return;
    }

    setSubmitting(true);
    try {
      await submitMyEvidence({
        title: title.trim() || null,
        description: description.trim(),
        module_id: moduleId || null,
        assessment_id: assessmentId || null,
        work_project: workProject.trim() || null,
        file_url: fileUrl.trim() || null,
        status,
        ksb_ids: selectedKsbs,
      });
      setSuccess('Evidence entry saved successfully!');
      // Reset form
      setTitle('');
      setDescription('');
      setModuleId('');
      setAssessmentId('');
      setWorkProject('');
      setFileUrl('');
      setSelectedKsbs([]);
      setKsbFilter('');
      setKsbTypeFilter('all');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading form..." />;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Evidence Entry</h1>
        <p className="text-gray-500 mt-1">
          Add a journal entry to your KSB portfolio — describe how you have evidenced a skill, behaviour, or knowledge area
        </p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle size={16} style={{ color: '#22c55e' }} />
          <span className="text-sm" style={{ color: '#22c55e' }}>{success}</span>
          <button
            onClick={() => navigate('/my/portfolio')}
            className="ml-auto text-xs font-medium px-3 py-1 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
          >
            View Portfolio
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {/* Two-column layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ─── LEFT COLUMN: Form (3/5 width) ─── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Title */}
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={14} className="text-gray-400" />
                Title <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sprint retrospective - improved CI/CD pipeline"
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-200"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>

            {/* Description — main journal entry content */}
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Description *</label>
              <p className="text-xs text-gray-400 mb-2">Describe how you have evidenced this KSB — what you did, how, and what you learned</p>
              <textarea
                required
                rows={8}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="During our sprint retrospective on 15/01/2025, I identified a bottleneck in the deployment pipeline and proposed switching to GitHub Actions for CI/CD..."
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-200 resize-vertical"
                style={{ borderColor: '#e5e7eb', minHeight: '160px' }}
              />
            </div>

            {/* Module & Work Project — side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Module */}
              <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} className="text-blue-500" />
                  <label className="text-sm font-medium text-gray-700">Uni Module <span className="text-gray-400 font-normal">(optional)</span></label>
                </div>
                <select
                  value={moduleId}
                  onChange={e => handleModuleChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-200"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <option value="">None</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.code} – {m.title}</option>
                  ))}
                </select>

                {selectedModule && assessmentOptions.length > 0 && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">Assessment</label>
                    <select
                      value={assessmentId}
                      onChange={e => setAssessmentId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-200"
                      style={{ borderColor: '#e5e7eb' }}
                    >
                      <option value="">None</option>
                      {assessmentOptions.map(a => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Work Project */}
              <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={14} className="text-amber-500" />
                  <label className="text-sm font-medium text-gray-700">Work Project <span className="text-gray-400 font-normal">(optional)</span></label>
                </div>
                <input
                  type="text"
                  value={workProject}
                  onChange={e => setWorkProject(e.target.value)}
                  placeholder="e.g. IoT Monitoring Dashboard"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-200"
                  style={{ borderColor: '#e5e7eb' }}
                />
                <p className="text-xs text-gray-400 mt-1">Name of the workplace project this relates to</p>
              </div>
            </div>

            {/* File URL */}
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <LinkIcon size={14} className="text-gray-400" />
                File URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-200"
                style={{ borderColor: '#e5e7eb' }}
              />
              <p className="text-xs text-gray-400 mt-1">Link to supporting evidence (Google Drive, OneDrive, GitHub, etc.)</p>
            </div>

            {/* Status & Submit */}
            <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="submitted" checked={status === 'submitted'} onChange={() => setStatus('submitted')} className="accent-green-500" />
                  <span className="text-sm text-gray-700">Submit for review</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="draft" checked={status === 'draft'} onChange={() => setStatus('draft')} className="accent-gray-500" />
                  <span className="text-sm text-gray-700">Save as draft</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all"
                style={{ background: submitting ? '#15803d' : '#22c55e', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                <Send size={16} />
                {submitting ? 'Saving…' : status === 'draft' ? 'Save Draft' : 'Submit Entry'}
              </button>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: KSB Selector (2/5 width, sticky) ─── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 space-y-4">

              {/* Selected KSBs summary */}
              <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Tag size={14} className="text-green-500" />
                    Selected KSBs *
                  </label>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                    background: selectedKsbs.length > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: selectedKsbs.length > 0 ? '#22c55e' : '#ef4444',
                  }}>
                    {selectedKsbs.length} selected
                  </span>
                </div>

                {selectedKsbObjects.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No KSBs selected yet — pick from the list below</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedKsbObjects.map(k => {
                      const c = ksbColor(k.type);
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => toggleKsb(k.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all hover:opacity-80"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                          title={`${k.description} — click to remove`}
                        >
                          <span className="font-mono font-bold">{k.code}</span>
                          <X size={12} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* KSB Picker with search & type filter */}
              <div className="rounded-xl" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <div className="p-4 space-y-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={ksbFilter}
                      onChange={e => setKsbFilter(e.target.value)}
                      placeholder="Search KSBs…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-green-200"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </div>
                  {/* Type filter tabs */}
                  <div className="flex gap-1">
                    {['all', 'Knowledge', 'Skill', 'Behaviour'].map(t => {
                      const isActive = ksbTypeFilter === t;
                      const c = t === 'all' ? { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' } : ksbColor(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setKsbTypeFilter(t)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                          style={{
                            background: isActive ? c.bg : 'transparent',
                            color: isActive ? c.text : '#94a3b8',
                            border: isActive ? `1px solid ${c.border}` : '1px solid transparent',
                          }}
                        >
                          {t === 'all' ? 'All' : t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* KSB list */}
                <div className="max-h-[420px] overflow-auto p-2">
                  {filteredKsbs.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No KSBs match your filter</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredKsbs.map(k => {
                        const isSelected = selectedKsbs.includes(k.id);
                        const c = ksbColor(k.type);
                        return (
                          <label
                            key={k.id}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                            style={isSelected ? { background: c.bg, border: `1px solid ${c.border}` } : { border: '1px solid transparent' }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleKsb(k.id)}
                              className="mt-0.5 accent-green-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-gray-900">{k.code}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                                  background: c.bg, color: c.text,
                                }}>{k.type}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{k.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
