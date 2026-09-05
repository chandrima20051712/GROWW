import './globals.css';
import { Source_Serif_4, IBM_Plex_Mono, Inter } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';

const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', weight: ['500', '600', '700'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '600'] });

export const metadata = {
  title: 'GROWW — a market bulletin, not a ticker',
  description: "Track what actually changed since you last checked, not just what's moving right now.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
