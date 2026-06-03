import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "每日推理挑战",
  description: "每天解开三道逻辑推理谜题，还原案件真相。",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "侦探事务所" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c1917",
};

// Read the user's theme preference from localStorage *before* React mounts
// and set `data-theme` on <html>. Without this, the page would flash light
// briefly on every load when the user prefers dark.
const themeBootstrap = `
(function() {
  try {
    var pref = 'auto';
    var raw = localStorage.getItem('settings-v1');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed.theme === 'light' || parsed.theme === 'dark') pref = parsed.theme;
    }
    var resolved = pref;
    if (pref === 'auto') {
      resolved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning` — the theme bootstrap script writes
    // `data-theme` and `style.color-scheme` to <html> before React hydrates,
    // so SSR output diverges from the post-bootstrap DOM. The mismatch is
    // intentional and limited to these two attributes on <html>.
    <html lang="zh-CN" className={`${notoSansSC.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="h-full font-sans overflow-hidden bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-200">
        {children}
      </body>
    </html>
  );
}
