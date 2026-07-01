import { Nunito, Courier_Prime } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ClientRoot from './ClientRoot';

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem('themePreference');
    var isDark = pref === 'dark' || ((!pref || pref === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export const metadata = {
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
};

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier-prime',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${nunito.variable} ${courierPrime.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
