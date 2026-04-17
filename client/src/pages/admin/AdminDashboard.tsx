import { useEffect, useState } from 'react';
import { getSystemStats } from '../../services/api';
import {
  Users, GraduationCap, BookOpen, Target, FileText,
  AlertTriangle, Shield, ScrollText,
} from 'lucide-react';

interface SystemStats {
  total_users: number;
  total_admins: number;
  total_coaches: number;
  total_apprentice_users: number;
  total_apprentices: number;
  total_cohorts: number;
  total_modules: number;
  total_ksbs: number;
  total_submissions: number;
  open_interventions: number;
  total_audit_entries: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemStats()
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-red-500">Failed to load stats.</div>;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: '#3b82f6' },
    { label: 'Admins', value: stats.total_admins, icon: Shield, color: '#f59e0b' },
    { label: 'Coaches', value: stats.total_coaches, icon: Users, color: '#8b5cf6' },
    { label: 'Apprentices', value: stats.total_apprentice_users, icon: GraduationCap, color: '#22c55e' },
    { label: 'Cohorts', value: stats.total_cohorts, icon: GraduationCap, color: '#06b6d4' },
    { label: 'Modules', value: stats.total_modules, icon: BookOpen, color: '#ec4899' },
    { label: 'KSBs', value: stats.total_ksbs, icon: Target, color: '#14b8a6' },
    { label: 'Submissions', value: stats.total_submissions, icon: FileText, color: '#6366f1' },
    { label: 'Open Interventions', value: stats.open_interventions, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Audit Entries', value: stats.total_audit_entries, icon: ScrollText, color: '#78716c' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">System overview and statistics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: `${card.color}15` }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
