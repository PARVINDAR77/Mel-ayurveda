import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MELAYURVEDA CRM – Enterprise Lead & Operations System',
  description: 'Enterprise Ayurvedic CRM System for MELAYURVEDA INDIA PVT. LTD.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
