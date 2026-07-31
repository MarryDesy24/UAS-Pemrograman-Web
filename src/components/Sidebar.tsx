'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { useSidebar } from '@/app/(auth)/layout';

interface SidebarProps {
  user: {
    role: UserRole;
    nama: string;
  };
}

const adminMenu = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Guru', href: '/dashboard/guru', icon: 'users' },
  { name: 'Siswa', href: '/dashboard/siswa', icon: 'users' },
  { name: 'Kelas', href: '/dashboard/kelas', icon: 'academic' },
  { name: 'Mata Pelajaran', href: '/dashboard/mata-pelajaran', icon: 'book' },
  { name: 'Kalender', href: '/dashboard/kalender', icon: 'calendar' },
];

const guruMenu = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Kelas Saya', href: '/dashboard/kelas', icon: 'academic' },
  { name: 'Materi', href: '/dashboard/materi', icon: 'folder' },
  { name: 'Assessment', href: '/dashboard/assessment', icon: 'clipboard' },
  { name: 'Penilaian', href: '/dashboard/penilaian', icon: 'star' },
  { name: 'Pengumuman', href: '/dashboard/pengumuman', icon: 'megaphone' },
  { name: 'Kalender', href: '/dashboard/kalender', icon: 'calendar' },
];

const siswaMenu = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Kelas Saya', href: '/dashboard/kelas', icon: 'academic' },
  { name: 'Materi', href: '/dashboard/materi', icon: 'folder' },
  { name: 'Tugas', href: '/dashboard/tugas', icon: 'clipboard' },
  { name: 'Nilai', href: '/dashboard/nilai', icon: 'star' },
  { name: 'Pengumuman', href: '/dashboard/pengumuman', icon: 'megaphone' },
  { name: 'Kalender', href: '/dashboard/kalender', icon: 'calendar' },
];

function getMenuByRole(role: UserRole) {
  switch (role) {
    case 'admin': return adminMenu;
    case 'guru': return guruMenu;
    case 'siswa': return siswaMenu;
    default: return [];
  }
}

function getIcon(iconName: string) {
  switch (iconName) {
    case 'home':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'users':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'academic':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'book':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'document':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'folder':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case 'star':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const menu = getMenuByRole(user.role);
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Desktop sidebar - always visible on lg+ */}
      <aside className="hidden lg:flex w-64 h-screen glass-strong flex-col fixed left-0 top-0 z-40">
        <SidebarContent user={user} menu={menu} pathname={pathname} />
      </aside>

      {/* Mobile sidebar - toggleable */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 glass-strong flex flex-col z-50 transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent user={user} menu={menu} pathname={pathname} onNavClick={() => setOpen(false)} />
      </aside>
    </>
  );
}

function SidebarContent({
  user,
  menu,
  pathname,
  onNavClick,
}: {
  user: { role: UserRole; nama: string };
  menu: { name: string; href: string; icon: string }[];
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-white/10">
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]">
            <img src="/logo.svg" alt="FUSION Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">FUSION</h1>
            <p className="text-xs text-dark-400 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        {menu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-dark-300 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-blue-400' : 'text-dark-400'}>
                {getIcon(item.icon)}
              </span>
              <span className="font-medium text-sm">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 md:p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 glass rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
            <span className="text-white font-semibold text-sm">
              {user.nama.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.nama}</p>
            <p className="text-xs text-dark-400 truncate capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    </>
  );
}
