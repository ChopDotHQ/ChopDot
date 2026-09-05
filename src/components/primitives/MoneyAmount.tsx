import React from 'react';
import { formatMoney } from '../../utils';

interface MoneyAmountProps {
  amount: number;
  currency?: string;
  className?: string;
  signDisplay?: 'auto' | 'always' | 'never';
}

export function MoneyAmount({ 
  amount, 
  currency = 'USD', 
  className = '',
  signDisplay = 'auto'
}: MoneyAmountProps) {
  let displayAmount = amount;
  let sign = '';
  
  if (signDisplay === 'always' && amount > 0) {
    sign = '+';
  } else if (signDisplay === 'never') {
    displayAmount = Math.abs(amount);
  }

  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      {sign}{formatMoney(displayAmount, currency)}
    </span>
  );
}
