'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { Notification } from '@/lib/types';
import toast from 'react-hot-toast';

const TYPE_STYLE: Record<string, string> = {
  announcement: 'bg-purple-500/20 text-purple-300',
  material: 'bg-blue-500/20 text-blue-300',
  assessment: 'bg-orange-500/20 text-orange-300',
  grade: 'bg-green-500/20 text-green-300',
  info: 'bg-white/10 text-dark-300',
};

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const user = await getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error('Gagal memuat notifikasi');
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const markRead = async (notification: Notification) => {
    if (notification.is_read) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllRead = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      toast.error('Gagal menandai semua notifikasi');
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('Semua notifikasi ditandai sudah dibaca');
    }
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifikasi</h1>
          <p className="text-sm text-dark-400 mt-1">
            {unread > 0 ? `${unread} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            Tandai semua dibaca
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const content = (
              <>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${TYPE_STYLE[n.type] || TYPE_STYLE.info}`}>
                    {n.type}
                  </span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                <p className="mt-2 font-medium text-white">{n.title}</p>
                <p className="text-sm text-dark-300 mt-1">{n.message}</p>
                <p className="text-xs text-dark-500 mt-2">
                  {new Date(n.created_at).toLocaleString('id-ID')}
                </p>
              </>
            );

            return (
              <div
                key={n.id}
                className={`glass-card transition-colors ${!n.is_read ? 'border-blue-500/30' : ''}`}
                onClick={() => markRead(n)}
              >
                {n.link ? (
                  <Link href={n.link} className="block">{content}</Link>
                ) : (
                  content
                )}
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="glass-card text-center py-12 text-dark-400">Belum ada notifikasi</div>
          )}
        </div>
      )}
    </div>
  );
}
