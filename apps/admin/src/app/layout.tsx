import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Guryeeye Admin', template: '%s · Guryeeye Admin' },
  description: 'Guryeeye platform administration — hotels, rentals and sales',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
