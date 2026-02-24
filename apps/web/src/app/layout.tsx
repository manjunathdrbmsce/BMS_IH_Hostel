import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BMS Hostel - Admin Portal',
  description: 'Enterprise Hostel Management Platform - Administration Console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
