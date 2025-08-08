'use client';
import { useTheme } from 'next-themes';
import Button from './ui/button';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className='' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Button variant="outline" className={className} onClick={()=>setTheme(dark?'light':'dark')} title="تبديل الوضع">
      {dark ? <Sun className="inline-block w-4 h-4" /> : <Moon className="inline-block w-4 h-4" />} 
      <span className="mr-2">{dark ? 'نهاري' : 'ليلي'}</span>
    </Button>
  );
}
