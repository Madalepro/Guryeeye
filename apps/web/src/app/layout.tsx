import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/toast';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Guryeeye — Hotels, Rentals & Sales', template: '%s · Guryeeye' },
  description: 'Hotel management, property rentals, real estate sales and platform analytics in one workspace.',
};

export const viewport: Viewport = { themeColor: '#186257' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
