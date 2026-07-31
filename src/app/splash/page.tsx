'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'logo' | 'loading' | 'exit'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('loading'), 1200);
    const t2 = setTimeout(() => setPhase('exit'), 3200);
    const t3 = setTimeout(() => router.replace('/login'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [router]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-900 bg-mesh transition-opacity duration-700 ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />

      {/* Logo */}
      <div className={`relative transition-all duration-1000 ${phase === 'logo' ? 'scale-100 opacity-100' : 'scale-110 opacity-100'}`}>
        {/* Pulsing rings */}
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 animate-ring-pulse" />
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ring-pulse" style={{ animationDelay: '1.2s' }} />
        {/* Soft glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/25 to-purple-500/25 rounded-full blur-3xl animate-breathe" />

        <div className="relative z-10 animate-bolt-in">
          <img
            src="/Logo sobat fusion.png"
            alt="FUSION Logo"
            className="w-56 h-56 md:w-72 md:h-72 object-contain drop-shadow-[0_0_30px_rgba(99,102,241,0.5)]"
          />
          {/* Shine sweep */}
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
            <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shine" />
          </div>
        </div>
      </div>

      {/* Walking student + loading dots */}
      <div className={`mt-10 flex flex-col items-center gap-6 transition-all duration-700 ${phase !== 'logo' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Walking student silhouette */}
        <div className="relative h-12 w-20">
          <svg viewBox="0 0 80 50" className="h-full w-full" fill="none">
            {/* Head */}
            <circle cx="40" cy="10" r="6" fill="#60a5fa" className="animate-bounce" style={{ animationDuration: '0.6s' }} />
            {/* Body */}
            <line x1="40" y1="16" x2="40" y2="32" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
            {/* Arms */}
            <line x1="40" y1="20" x2="30" y2="28" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="x2" values="30;34;30" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="y2" values="28;24;28" dur="0.8s" repeatCount="indefinite" />
            </line>
            <line x1="40" y1="20" x2="50" y2="28" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="x2" values="50;46;50" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="y2" values="28;24;28" dur="0.8s" repeatCount="indefinite" />
            </line>
            {/* Left leg */}
            <line x1="40" y1="32" x2="32" y2="46" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="x2" values="32;38;32" dur="0.8s" repeatCount="indefinite" />
            </line>
            {/* Right leg */}
            <line x1="40" y1="32" x2="48" y2="46" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="x2" values="48;42;48" dur="0.8s" repeatCount="indefinite" />
            </line>
            {/* Backpack hint */}
            <rect x="34" y="18" width="4" height="8" rx="1" fill="#3b82f6" opacity="0.6">
              <animate attributeName="y" values="18;17;18" dur="0.8s" repeatCount="indefinite" />
            </rect>
          </svg>
          {/* Walking ground line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>

        <p className="text-sm text-dark-400 tracking-wider uppercase">Memuat FUSION...</p>
      </div>
    </div>
  );
}
