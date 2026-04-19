import { useEffect, useState, useCallback } from 'react';
import { getAuditLog } from '../../services/api';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';

interface AuditEntry {
  id: number;
  timestamp: string;
  user_id: number | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  detail: string | null;
  ip_address: string | null;
}

const PAGE_SIZE = 25;

const ACTION_COLORS: Record<string, string> = {
  login: '#22c55e',
  create_user: '#3b82f6',
  update_user: '#f59e0b',
  delete_user: '#ef4444',
  update_submission_status: '#8b5cf6',
  submit_evidence: '#06b6d4',
  create_feedback: '#ec4899',
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState<string>('');

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (filterAction) params.action = filterAction;
    getAuditLog(params as { limit?: number; offset?: number; action?: string })
      .then((res) => setEntries(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filterAction]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const actionBadge = (action: string) => {
    const color = ACTION_COLORS[action] || '#94a3b8';
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: `${color}15`, color }}
      >
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText size={24} /> Audit Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track system actions and user activity</p>
        </div>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All actions</option>
          <option value="login">Login</option>
          <option value="create_user">Create User</option>
          <option value="update_user">Update User</option>
          <option value="delete_user">Delete User</option>
          <option value="update_submission_status">Update Submission Status</option>
          <option value="submit_evidence">Submit Evidence</option>
          <option value="create_feedback">Create Feedback</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Timestamp</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">User ID</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Target</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Detail</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-sm text-slate-400">Loading audit log...</span>
                </div>
              </td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No audit entries found.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4">{actionBadge(e.action)}</td>
                  <td className="py-2.5 px-4 text-gray-700">{e.user_id ?? '—'}</td>
                  <td className="py-2.5 px-4 text-gray-700">
                    {e.target_type ? `${e.target_type} #${e.target_id}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-gray-600 max-w-xs truncate">{e.detail || '—'}</td>
                  <td className="py-2.5 px-4 text-gray-400 font-mono text-xs">{e.ip_address || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={entries.length < PAGE_SIZE}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
