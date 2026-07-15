'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/lib/types';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_type: 'academic' | 'exam' | 'holiday' | 'assignment' | 'other';
  classroom_id?: string;
  created_by: string;
  created_at: string;
  classroom_nama?: string;
}

const EVENT_TYPES = [
  { value: 'academic', label: 'Akademik', color: 'bg-blue-500' },
  { value: 'exam', label: 'Ujian', color: 'bg-red-500' },
  { value: 'holiday', label: 'Libur', color: 'bg-green-500' },
  { value: 'assignment', label: 'Tugas', color: 'bg-yellow-500' },
  { value: 'other', label: 'Lainnya', color: 'bg-purple-500' },
];

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function KalenderPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [classrooms, setClassrooms] = useState<{ id: string; nama: string }[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: formatDateStr(new Date()),
    event_type: 'academic' as CalendarEvent['event_type'],
    classroom_id: '',
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      await fetchEvents();
      await fetchClassrooms(currentUser);
      setLoading(false);
    };
    init();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (data) {
      const enriched = await Promise.all(data.map(async (e) => {
        let classroom_nama = '';
        if (e.classroom_id) {
          const { data: c } = await supabase.from('classrooms').select('nama').eq('id', e.classroom_id).single();
          classroom_nama = c?.nama || '';
        }
        return { ...e, classroom_nama };
      }));
      setEvents(enriched);
    }
  };

  const fetchClassrooms = async (currentUser: User | null) => {
    if (!currentUser) return;
    if (currentUser.role === 'admin') {
      const { data } = await supabase.from('classrooms').select('id, nama').order('nama');
      setClassrooms(data || []);
    } else if (currentUser.role === 'guru') {
      const { data } = await supabase.from('classrooms').select('id, nama').eq('guru_id', currentUser.id).order('nama');
      setClassrooms(data || []);
    } else {
      const { data: memberData } = await supabase.from('classroom_members').select('classroom_id').eq('student_id', currentUser.id);
      const ids = memberData?.map((m) => m.classroom_id) || [];
      if (ids.length > 0) {
        const { data } = await supabase.from('classrooms').select('id, nama').in('id', ids);
        setClassrooms(data || []);
      }
    }
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter((e) => e.event_date === dateStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      title: formData.title,
      description: formData.description || null,
      event_date: formData.event_date,
      event_type: formData.event_type,
      classroom_id: formData.classroom_id || null,
      created_by: user.id,
    };

    if (editingEvent) {
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
      if (error) {
        toast.error('Gagal mengupdate event');
      } else {
        toast.success('Event berhasil diupdate');
        setShowModal(false);
        setEditingEvent(null);
        fetchEvents();
      }
    } else {
      const { error } = await supabase.from('calendar_events').insert(payload);
      if (error) {
        toast.error('Gagal membuat event');
      } else {
        toast.success('Event berhasil dibuat');
        setShowModal(false);
        fetchEvents();
      }
    }

    setFormData({ title: '', description: '', event_date: formatDateStr(new Date()), event_type: 'academic', classroom_id: '' });
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      event_type: event.event_type,
      classroom_id: event.classroom_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus event ini?')) return;
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus event');
    } else {
      toast.success('Event berhasil dihapus');
      fetchEvents();
    }
  };

  const openCreateModal = (dateStr?: string) => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      event_date: dateStr || formatDateStr(new Date()),
      event_type: 'academic',
      classroom_id: '',
    });
    setShowModal(true);
  };

  const navigateMonth = (delta: number) => {
    const newDate = new Date(year, month + delta, 1);
    setCurrentDate(newDate);
  };

  const canManage = user?.role === 'admin' || user?.role === 'guru';
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Kalender Akademik</h1>
        {canManage && (
          <button onClick={() => openCreateModal()} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
            + Tambah Event
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 glass-card">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-white">
                {MONTHS_ID[month]} {year}
              </h2>
              <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_ID.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-dark-400 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = getEventsForDate(dateStr);
                const isToday = dateStr === formatDateStr(new Date());
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative min-h-[3rem] md:min-h-[4rem] p-1 md:p-2 rounded-lg text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-500/30 border border-blue-500/50'
                        : isToday
                        ? 'bg-white/10 border border-white/20'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className={`text-xs md:text-sm font-medium ${isToday ? 'text-blue-400' : 'text-white'}`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const t = EVENT_TYPES.find((t) => t.value === ev.event_type);
                          return (
                            <div key={ev.id} className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${t?.color || 'bg-gray-500'}`} />
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] md:text-[10px] text-dark-400">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
              {EVENT_TYPES.map((t) => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                  <span className="text-xs text-dark-400">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Detail Panel */}
          <div className="glass-card">
            <h3 className="font-semibold text-white mb-4">
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Event Hari Ini'}
            </h3>

            {(selectedDate ? selectedEvents : getEventsForDate(formatDateStr(new Date()))).length > 0 ? (
              <div className="space-y-3">
                {(selectedDate ? selectedEvents : getEventsForDate(formatDateStr(new Date()))).map((event) => {
                  const t = EVENT_TYPES.find((t) => t.value === event.event_type);
                  return (
                    <div key={event.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${t?.color || 'bg-gray-500'}`} />
                            <span className="text-xs text-dark-400">{t?.label}</span>
                          </div>
                          <h4 className="font-medium text-white text-sm">{event.title}</h4>
                          {event.description && (
                            <p className="text-xs text-dark-400 mt-1 line-clamp-2">{event.description}</p>
                          )}
                          {event.classroom_nama && (
                            <p className="text-xs text-blue-400 mt-1">{event.classroom_nama}</p>
                          )}
                        </div>
                        {canManage && event.created_by === user?.id && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleEdit(event)} className="p-1 hover:bg-white/10 rounded text-dark-400 hover:text-white">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(event.id)} className="p-1 hover:bg-white/10 rounded text-dark-400 hover:text-red-400">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-dark-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-dark-400">
                  {selectedDate ? 'Tidak ada event pada tanggal ini' : 'Tidak ada event hari ini'}
                </p>
              </div>
            )}

            {/* Upcoming Events */}
            {!selectedDate && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-white mb-3">Event Mendatang</h4>
                {events.filter((e) => e.event_date >= formatDateStr(new Date())).slice(0, 5).length > 0 ? (
                  <div className="space-y-2">
                    {events.filter((e) => e.event_date >= formatDateStr(new Date())).slice(0, 5).map((event) => {
                      const t = EVENT_TYPES.find((t) => t.value === event.event_type);
                      return (
                        <div key={event.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${t?.color || 'bg-gray-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{event.title}</p>
                            <p className="text-xs text-dark-400">
                              {new Date(event.event_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-dark-400 text-center py-2">Tidak ada event mendatang</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Create/Edit Event */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingEvent ? 'Edit Event' : 'Tambah Event'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Judul Event *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  placeholder="Contoh: UTS Semester Ganjil"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white resize-none"
                  rows={3}
                  placeholder="Deskripsi singkat event..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Jenis Event *</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as CalendarEvent['event_type'] })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {classrooms.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Kelas (opsional)</label>
                  <select
                    value={formData.classroom_id}
                    onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  >
                    <option value="">Semua Kelas</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingEvent(null); }} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  {editingEvent ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
