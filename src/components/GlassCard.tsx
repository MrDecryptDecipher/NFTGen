import React from 'react';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className }) => {
  return (
    <div
      className={clsx(
        'backdrop-blur-lg bg-white/10 rounded-2xl border border-white/20',
        'shadow-xl p-4 sm:p-5 md:p-6 transition-all duration-300',
        'hover:bg-white/20 hover:shadow-2xl',
        className
      )}
    >
      {children}
    </div>
  );
};