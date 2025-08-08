import './styles/globals.css';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from './components/ui/toast';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <ToastProvider>{children}</ToastProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
