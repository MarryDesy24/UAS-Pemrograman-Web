'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ActivityLog, User } from '@/lib/types';
import toast from 'react-hot-toast';

export default function AktivitasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<(ActivityLog & { actor_nama?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const current = await getCurrentUser();
    setUser(current);

    if (!current) {
      setLoading(false);
      return;
    }

    let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(150);

    if (current.role === 'siswa') {
      query = query.eq('actor_id', current.id);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Gagal memuat riwayat aktivitas');
      setLoading(false);
      return;
    }

    const actorIds = Array.from(new Set((data || []).map((l) => l.actor_id).filter(Boolean))) as string[];
    let actors: { id: string; nama: string }[] = [];
    if (actorIds.length > 0) {
      const { data: userData } = await supabase.from('users').select('id, nama').in('id', actorIds);
      actors = userData || [];
    }

    setLogs(
      (data || []).map((log) => ({
        ...log,
        actor_nama: actors.find((a) => a.id === log.actor_id)?.nama || 'Sistem',
      }))
    );
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Riwayat Aktivitas</h1>
        <p className="text-sm text-dark-400 mt-1">
          {user?.role === 'siswa' ? 'Aktivitas Anda di FUSION.' : 'Aktivitas terbaru pengguna FUSION.'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {['Waktu', 'Pengguna', 'Aksi', 'Entitas', 'Deskripsi'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-dark-300 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{log.actor_nama}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-300 capitalize">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-300 capitalize">{log.entity_type}</td>
                  <td className="px-6 py-4 text-sm text-dark-300">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="text-center py-12 text-dark-400">Belum ada aktivitas</div>
          )}
        </div>
      )}
    </div>
  );
}
