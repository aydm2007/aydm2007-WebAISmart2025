'use client';
import * as React from 'react';

type Variant = 'default'|'outline'|'secondary'|'ghost'|'destructive';
const variants: Record<Variant,string> = {
  default:'bg-indigo-600 hover:bg-indigo-700 text-white',
  outline:'border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
  secondary:'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100',
  ghost:'hover:bg-slate-100 dark:hover:bg-slate-800',
  destructive:'bg-red-600 hover:bg-red-700 text-white'
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant='default', className='', ...props }: ButtonProps) {
  const cls = `${variants[variant]} px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`;
  return <button className={cls} {...props} />;
}
export default Button;
