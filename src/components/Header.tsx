'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { signOut } from '@/lib/auth';
import { User } from '@/lib/types';
import { useSidebar } from '@/app/(auth)/layout';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setOpen } = useSidebar();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Berhasil keluar');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Gagal keluar');
    }
  };

  return (
    <header className="glass border-b border-white/10 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger for mobile */}
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-white font-heading truncate max-w-[200px] md:max-w-none">
              Selamat datang, {user.nama}
            </h2>
            <p className="text-xs md:text-sm text-dark-400 capitalize">{user.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-2 md:px-3 py-2 text-sm text-dark-300 hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
              <span className="text-white font-medium text-sm">
                {user.nama.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden sm:inline text-white text-sm truncate max-w-[100px]">{user.nama}</span>
            <svg
              className={`w-4 h-4 text-dark-400 transition-transform duration-300 hidden sm:block ${showDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-2xl shadow-glass py-2 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white">{user.nama}</p>
                <p className="text-xs text-dark-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  router.push('/dashboard/ganti-password');
                }}
                className="w-full px-4 py-3 text-left text-sm text-dark-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Ganti Password
              </button>
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
