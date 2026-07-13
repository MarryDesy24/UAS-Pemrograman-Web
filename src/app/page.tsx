import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-dark-900 bg-mesh relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

      <div className="text-center space-y-8 px-4 relative z-10 animate-slide-up">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-glow mb-6">
            <span className="text-white font-heading font-bold text-3xl">F</span>
          </div>
          <h1 className="text-6xl font-heading font-bold text-white">
            FUSION
          </h1>
          <p className="text-xl text-dark-300 max-w-2xl">
            Future Unified School Integrated Online Network
          </p>
          <p className="text-lg text-dark-400">
            Platform Manajemen Pembelajaran Sekolah Terintegrasi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary px-8 py-4 text-lg"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="btn-secondary px-8 py-4 text-lg"
          >
            Daftar
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mt-16">
          <div className="glass-card-hover">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-white">Modul Ajar</h3>
            <p className="text-sm text-dark-400 mt-2">Buat dan kelola modul pembelajaran lengkap</p>
          </div>

          <div className="glass-card-hover">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-white">Assessment Digital</h3>
            <p className="text-sm text-dark-400 mt-2">Pretest, post-test, quiz, LKPD, dan tugas</p>
          </div>

          <div className="glass-card-hover">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-white">Dashboard</h3>
            <p className="text-sm text-dark-400 mt-2">Pantau progress belajar siswa secara real-time</p>
          </div>
        </div>
      </div>
    </main>
  );
}
