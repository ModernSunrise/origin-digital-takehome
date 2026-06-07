import type { Metadata } from 'next';
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { CurrentUserProvider } from './_components/current-user';
import { SiteHeader } from './_components/site-header';
import { ToastProvider } from './_components/toast';

const mono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const sans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'DevHub — tech talks worth a lunch break',
  description: 'Internal tech-talk & lunch-and-learn hub. Save your seat at the next talk.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <CurrentUserProvider>
          <ToastProvider>
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
              <SiteHeader />
              <main className="flex-1 pb-24">{children}</main>
              <footer className="border-t border-line py-6 font-mono text-xs text-faint">
                devhub · in-memory by design · one rule-set, two consumers (HTTP + MCP)
              </footer>
            </div>
          </ToastProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
