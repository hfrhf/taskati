import type { Metadata } from "next";
import { Tajawal, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  weight: ["400", "500", "700"],
  subsets: ["arabic"],
  variable: "--font-tajawal",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "ديجي‌تاسك - إدارة المهام الفاخرة",
  description: "منصة فاخرة لإدارة المهام وتتبع الإنتاجية اليومية لفريق العمل",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} ${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ديجي‌تاسك" />
        <link rel="apple-touch-icon" href="/digitask-icon-192.png" />
        <meta name="theme-color" content="#111827" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('taskini-theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
                try {
                  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
                    localStorage.setItem('pwa-installed', 'true');
                    console.log('[PWA Script] Detected standalone mode on load');
                  }
                } catch (e) {}
              })();
              
              if ('serviceWorker' in navigator) {
                var registerSW = function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[PWA Script] ServiceWorker registered successfully');
                  }).catch(function(err) {
                    console.log('[PWA Script] ServiceWorker registration failed:', err);
                  });
                };
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  registerSW();
                } else {
                  window.addEventListener('load', registerSW);
                }
              }

              window.addEventListener('beforeinstallprompt', function(e) {
                console.log('[PWA Script] beforeinstallprompt event caught globally!');
                e.preventDefault();
                window.deferredPrompt = e;
                try {
                  localStorage.setItem('pwa-installed', 'false');
                } catch(err) {}
                window.dispatchEvent(new CustomEvent('pwa-prompt-available', { detail: e }));
              });

              window.addEventListener('appinstalled', function(e) {
                console.log('[PWA Script] appinstalled event caught globally!');
                window.deferredPrompt = null;
                try {
                  localStorage.setItem('pwa-installed', 'true');
                } catch(err) {}
                window.dispatchEvent(new CustomEvent('pwa-installed-status', { detail: true }));
              });
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col selection:bg-theme-accent selection:text-theme-panel">
        {children}
      </body>
    </html>
  );
}
