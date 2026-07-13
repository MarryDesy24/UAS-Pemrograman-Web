import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'FUSION - Platform Pembelajaran Sekolah',
  description: 'Platform Manajemen Pembelajaran Sekolah Terintegrasi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-dark-900 text-dark-200 font-body antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(30, 41, 59, 0.95)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#e2e8f0',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#e2e8f0',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
