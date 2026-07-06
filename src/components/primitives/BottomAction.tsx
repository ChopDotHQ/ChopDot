import React from 'react';

interface BottomActionProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomAction({ children, className = '' }: BottomActionProps) {
  return (
    <div className={`p-6 flex flex-col space-y-3 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 transition-colors relative z-20 ${className}`}>
      {children}
    </div>
  );
}
