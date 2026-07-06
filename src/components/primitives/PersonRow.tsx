import React from 'react';
import { getInitials } from '../../utils';

interface PersonRowProps {
  name: string;
  isCurrentUser?: boolean;
  subtitle?: React.ReactNode;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const PersonRow: React.FC<PersonRowProps> = ({ 
  name, 
  isCurrentUser = false, 
  subtitle, 
  rightElement, 
  onClick,
  className = '' 
}) => {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component 
      onClick={onClick}
      className={`flex justify-between items-center w-full text-left ${onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''} ${className}`}
    >
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 mr-3 shrink-0 transition-colors">
          {getInitials(name)}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white text-sm flex items-center">
            {name} {isCurrentUser && <span className="text-gray-500 ml-1 font-normal">(You)</span>}
          </span>
          {subtitle && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {rightElement && (
        <div className="ml-3 shrink-0 flex items-center">
          {rightElement}
        </div>
      )}
    </Component>
  );
}
