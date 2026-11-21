import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { NotificationProvider } from '../context/notification-context';
import { LiveNotificationToast } from '../components/layout/live-notification-toast';

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
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <AuthProvider>
          <NotificationProvider>
            <LiveNotificationToast />
            {children}
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
