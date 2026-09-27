import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dhaka Tesla Pool - Share a seat. Split the fare.',
  description: 'Dhaka Tesla Pool EV ride-sharing platform MVP - Banani rush hour story implementation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0b0e14] text-gray-100 min-h-screen selection:bg-tesla-red selection:text-white">
        {children}
      </body>
    </html>
  );
}
