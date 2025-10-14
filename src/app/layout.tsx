import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { Poppins } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'SoulSync',
  description: 'A cute, fun app for long distance couples.',
};

const poppins = Poppins({ subsets: ['latin'], weight: ['400','600','700'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={poppins.className}>
      <head>
      </head>
      <body className="antialiased">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
