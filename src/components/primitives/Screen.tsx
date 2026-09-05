import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
}

export function Screen({ children, className = '' }: ScreenProps) {
  return (
    <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors h-full overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

interface ScreenHeaderProps {
  title?: React.ReactNode;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function ScreenHeader({ title, onBack, rightAction, className = '' }: ScreenHeaderProps) {
  return (
    <header className={`px-6 pt-12 pb-4 flex items-center bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a] shadow-sm z-10 transition-colors shrink-0 ${className}`}>
      <div className="w-10 flex shrink-0">
        {onBack && (
          <Button variant="icon" onClick={onBack} className="-ml-2" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </Button>
        )}
      </div>
      <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white truncate px-2">
        {title}
      </h1>
      <div className="w-10 flex shrink-0 justify-end">
        {rightAction}
      </div>
    </header>
  );
}

interface ScreenContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ScreenContent({ children, className = '' }: ScreenContentProps) {
  return (
    <div className={`flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}
