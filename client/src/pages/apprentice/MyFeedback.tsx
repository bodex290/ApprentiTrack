import { useState, useEffect } from 'react';
import { getMyFeedback } from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import { MessageSquare, FileText, BookOpen, Tag, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';

interface KSBRef {
  code: string;
  type: string;
  description: string;
}

interface Evidence {
  description: string | null;
  status: string;
  submitted_at: string;
  module_name: string | null;
  work_project: string | null;
  file_url: string | null;
  ksbs: KSBRef[];
}

interface Feedback {
  id: number;
  submission_id: number;
  submission_title: string;
  coach_name: string;
  rating: number;
  comments: string;
  created_at: string;
  evidence: Evidence;
}

const statusColour: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
};

export default function MyFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    getMyFeedback().then(r => setFeedback(r.data)).finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <LoadingScreen message="Loading feedback..." />;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Feedback</h1>
        <p className="text-gray-500 mt-1">{feedback.length} feedback items from your coaches</p>
      </div>

      {feedback.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
          <p>No feedback received yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map(fb => {
            const ev = fb.evidence;
            const open = expanded[fb.id];
            return (
              <div key={fb.id} className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                {/* ── Evidence details header ── */}
                <button
                  onClick={() => toggle(fb.id)}
                  className="w-full text-left px-5 pt-5 pb-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <FileText size={18} style={{ color: '#3b82f6' }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{fb.submission_title}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColour[ev.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {ev.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            Submitted {new Date(ev.submitted_at).toLocaleDateString()}
                          </span>
                          {ev.module_name && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <BookOpen size={11} /> {ev.module_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400 mt-1">
                      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </button>

                {/* ── Expanded evidence body ── */}
                {open && (
                  <div className="px-5 pb-4 pl-[3.75rem] space-y-2 text-sm border-b border-gray-100">
                    {ev.description && (
                      <p className="text-gray-700 whitespace-pre-line">{ev.description}</p>
                    )}
                    {ev.work_project && (
                      <p className="text-gray-500 flex items-center gap-1">
                        <Briefcase size={13} className="shrink-0" /> Work project: {ev.work_project}
                      </p>
                    )}
                    {ev.ksbs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ev.ksbs.map(k => (
                          <span
                            key={k.code}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700"
                            title={k.description}
                          >
                            <Tag size={10} /> {k.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Coach feedback ── */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                        <MessageSquare size={18} style={{ color: '#8b5cf6' }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{fb.coach_name}</h4>
                        <span className="text-xs text-gray-400">{new Date(fb.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-yellow-500 text-sm">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</div>
                  </div>
                  <p className="text-sm text-gray-700 pl-12">{fb.comments}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
