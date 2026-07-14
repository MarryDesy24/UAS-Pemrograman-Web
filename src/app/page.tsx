'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [phase, setPhase] = useState<'logo' | 'loading' | 'exit'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('loading'), 1500);
    const t2 = setTimeout(() => setPhase('exit'), 3500);
    const t3 = setTimeout(() => router.replace('/login'), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [router]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-900 bg-mesh transition-opacity duration-700 ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />

      {/* Logo */}
      <div className={`relative transition-all duration-1000 ${phase !== 'logo' ? 'scale-110' : 'scale-100'}`}>
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <img
          src="/logo.png"
          alt="FUSION Logo"
          className="w-56 h-56 md:w-72 md:h-72 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]"
        />
      </div>

      {/* Walking student + loading */}
      <div className={`mt-10 flex flex-col items-center gap-6 transition-all duration-700 ${phase !== 'logo' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Walking student */}
        <div className="relative h-14 w-24">
          <svg viewBox="0 0 96 60" className="h-full w-full" fill="none">
            {/* Head */}
            <circle cx="48" cy="12" r="7" fill="#60a5fa">
              <animate attributeName="cy" values="12;10;12" dur="0.5s" repeatCount="indefinite" />
            </circle>
            {/* Backpack */}
            <rect x="39" y="19" width="6" height="10" rx="2" fill="#3b82f6" opacity="0.7">
              <animate attributeName="y" values="19;17;19" dur="0.5s" repeatCount="indefinite" />
            </rect>
            {/* Body */}
            <line x1="48" y1="19" x2="48" y2="38" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
            {/* Left arm - swinging */}
            <line x1="48" y1="24" x2="36" y2="32" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="x2" values="36;42;36" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="32;26;32" dur="0.6s" repeatCount="indefinite" />
            </line>
            {/* Right arm - swinging */}
            <line x1="48" y1="24" x2="60" y2="32" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="x2" values="60;54;60" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="32;26;32" dur="0.6s" repeatCount="indefinite" />
            </line>
            {/* Left leg - walking */}
            <line x1="48" y1="38" x2="38" y2="54" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="x2" values="38;50;38" dur="0.6s" repeatCount="indefinite" />
            </line>
            {/* Right leg - walking */}
            <line x1="48" y1="38" x2="58" y2="54" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="x2" values="58;46;58" dur="0.6s" repeatCount="indefinite" />
            </line>
          </svg>
          {/* Ground shadow */}
          <div className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
          <span className="w-3 h-3 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
          <span className="w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>

        <p className="text-sm text-dark-400 tracking-[0.2em] uppercase font-medium">Memuat FUSION...</p>
      </div>
    </div>
  );
}
