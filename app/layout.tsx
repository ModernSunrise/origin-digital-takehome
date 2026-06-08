import type { Metadata } from 'next';
import { Space_Grotesk, Newsreader } from 'next/font/google';
import './globals.css';
import { CurrentUserProvider } from './_components/current-user';
import { ToastProvider } from './_components/toast';
import { TalkFormProvider } from './_components/talk-form-modal';
import { SiteHeader } from './_components/site-header';

const sans = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const serif = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Greenroom — tech talks worth a lunch break',
  description: 'Schedule internal tech talks and manage seat registrations.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="antialiased">
        <CurrentUserProvider>
          <ToastProvider>
            <TalkFormProvider>
              <div className="mx-auto max-w-[var(--container-max)] px-[var(--gutter)] pb-24">
                <SiteHeader />
                <main>{children}</main>
              </div>
            </TalkFormProvider>
          </ToastProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
