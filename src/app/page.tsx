import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-dark-900 bg-mesh relative overflow-hidden">
      {/* 3D Floating Particles */}
      <div className="absolute inset-0 perspective-[1000px] pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(${Math.random() > 0.5 ? '59, 130, 246' : '168, 85, 247'}, ${Math.random() * 0.5 + 0.2})`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 4}s`,
              transform: `translateZ(${Math.random() * 100}px) rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Background glow orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[150px]" />

      <div className="text-center space-y-10 px-4 relative z-10 animate-slide-up max-w-5xl mx-auto">
        {/* 3D Logo */}
        <div className="flex justify-center">
          <div className="relative" style={{ perspective: '1000px' }}>
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-2xl animate-pulse" />
            
            {/* Main logo container */}
            <div
              className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-glow"
              style={{
                transformStyle: 'preserve-3d',
                animation: 'logoFloat 6s ease-in-out infinite, logoRotate 20s linear infinite',
              }}
            >
              {/* Front face */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"
                style={{ transform: 'translateZ(4px)' }}
              >
                <span className="text-white font-heading font-bold text-4xl">F</span>
              </div>
              
              {/* Back face */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center"
                style={{ transform: 'rotateY(180deg) translateZ(4px)' }}
              >
                <span className="text-white font-heading font-bold text-4xl">U</span>
              </div>
              
              {/* Left face */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-500 flex items-center justify-center"
                style={{ transform: 'rotateY(-90deg) translateZ(4px)' }}
              >
                <span className="text-white font-heading font-bold text-4xl">S</span>
              </div>
              
              {/* Right face */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center"
                style={{ transform: 'rotateY(90deg) translateZ(4px)' }}
              >
                <span className="text-white font-heading font-bold text-4xl">I</span>
              </div>
            </div>
          </div>
        </div>

        {/* Title with 3D text effect */}
        <div className="space-y-4">
          <h1
            className="text-7xl md:text-8xl font-heading font-bold text-white relative"
            style={{
              textShadow: '0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(59, 130, 246, 0.3), 0 4px 0 #1e40af',
              animation: 'textGlow 3s ease-in-out infinite alternate',
            }}
          >
            FUSION
          </h1>
          <p className="text-xl md:text-2xl text-dark-300 max-w-2xl mx-auto">
            Future Unified School Integrated Online Network
          </p>
          <p className="text-lg text-dark-400">
            Platform Manajemen Pembelajaran Sekolah Terintegrasi
          </p>
        </div>

        {/* 3D Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ perspective: '500px' }}>
          <Link
            href="/login"
            className="btn-primary px-10 py-4 text-lg relative overflow-hidden group"
            style={{ transformStyle: 'preserve-3d', transition: 'transform 0.3s ease' }}
          >
            <span className="relative z-10">Masuk</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            href="/register"
            className="btn-secondary px-10 py-4 text-lg relative overflow-hidden group"
            style={{ transformStyle: 'preserve-3d', transition: 'transform 0.3s ease' }}
          >
            <span className="relative z-10">Daftar</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </div>

        {/* 3D Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mt-20" style={{ perspective: '1000px' }}>
          {/* Card 1 */}
          <div
            className="glass-card-hover relative group cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(2deg) rotateY(-2deg)',
              transition: 'all 0.5s ease',
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 shadow-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-2">Modul Ajar</h3>
              <p className="text-dark-400 leading-relaxed">Buat dan kelola modul pembelajaran lengkap dengan materi interaktif</p>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="glass-card-hover relative group cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(2deg) rotateY(0deg)',
              transition: 'all 0.5s ease',
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-5 shadow-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-2">Assessment Digital</h3>
              <p className="text-dark-400 leading-relaxed">Pretest, post-test, quiz, LKPD, dan tugas dengan penilaian otomatis</p>
            </div>
          </div>

          {/* Card 3 */}
          <div
            className="glass-card-hover relative group cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(2deg) rotateY(2deg)',
              transition: 'all 0.5s ease',
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-5 shadow-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-2">Dashboard</h3>
              <p className="text-dark-400 leading-relaxed">Pantau progress belajar siswa secara real-time dengan analitik</p>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
