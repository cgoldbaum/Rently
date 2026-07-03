import { Manrope, Newsreader, Courier_Prime } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ClientRoot from './ClientRoot';

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem('themePreference');
    var isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export const metadata = {
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
};

// Sans geométrica y limpia para UI/cuerpo (reemplaza a Nunito redondeada).
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

// Serif editorial para títulos y frases destacadas.
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
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
    <html lang="es" className={`${manrope.variable} ${newsreader.variable} ${courierPrime.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
