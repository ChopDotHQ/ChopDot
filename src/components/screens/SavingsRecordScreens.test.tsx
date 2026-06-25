// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddContribution } from './AddContribution';
import { SavingsTab } from './SavingsTab';
import { WithdrawFunds } from './WithdrawFunds';

describe('legacy savings record screens', () => {
  afterEach(() => {
    cleanup();
  });

  it('frames adding money as an external contribution record', () => {
    render(
      <AddContribution
        potName="Emergency Fund"
        baseCurrency="DOT"
        currentBalance={750}
        yieldRate={12.5}
        defiProtocol="Acala"
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Record Contribution')).toBeTruthy();
    expect(screen.getByText('Recorded so far')).toBeTruthy();
    expect(screen.getByText('Amount to record')).toBeTruthy();
    expect(screen.getByText('How it moved')).toBeTruthy();
    expect(screen.getByText('External wallet transfer')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+DOT 100' }));
    expect(screen.getByText(/It does not move or hold money/i)).toBeTruthy();
    expect(screen.queryByText(/APY|yield|Direct on-chain deposit/i)).toBeNull();
  });

  it('frames withdrawal as a record, not money movement by ChopDot', () => {
    render(
      <WithdrawFunds
        potName="Emergency Fund"
        baseCurrency="DOT"
        yourBalance={750}
        totalPooled={750}
        yieldRate={12.5}
        defiProtocol="Acala"
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Record Withdrawal')).toBeTruthy();
    expect(screen.getByText('Recorded balance in Emergency Fund')).toBeTruthy();
    expect(screen.getAllByText('Amount to record').length).toBeGreaterThan(0);
    expect(screen.getByText('After external transfer')).toBeTruthy();
    expect(screen.getByText(/does not custody funds, send withdrawals, or guarantee settlement/i)).toBeTruthy();
    expect(screen.queryByText(/APY|yield|Network fee|Funds will be withdrawn/i)).toBeNull();
  });

  it('frames the savings tab as a shared record, not custody or yield', () => {
    render(
      <SavingsTab
        members={[
          { id: 'owner', name: 'You' },
          { id: 'leo', name: 'Leo' },
        ]}
        currentUserId="owner"
        baseCurrency="DOT"
        contributions={[
          {
            id: 'contribution-1',
            memberId: 'owner',
            amount: 100,
            date: '2026-06-20T12:00:00.000Z',
          },
        ]}
        totalPooled={750}
        yieldRate={12.5}
        defiProtocol="Acala"
        goalAmount={5000}
        goalDescription="Build a 6-month emergency fund"
        onAddContribution={vi.fn()}
        onWithdraw={vi.fn()}
      />,
    );

    expect(screen.getByText('Recorded total')).toBeTruthy();
    expect(screen.getByText('ChopDot role')).toBeTruthy();
    expect(screen.getByText('Record only')).toBeTruthy();
    expect(screen.getByText('No custody')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record contribution' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record withdrawal' })).toBeTruthy();
    expect(screen.getByText(/Money moves outside the app/i)).toBeTruthy();
    expect(screen.getByText('You recorded contribution')).toBeTruthy();
    expect(screen.queryByText(/APY|yield|Acala|Add Funds/i)).toBeNull();
    expect(screen.queryByText(/^Withdraw$/i)).toBeNull();
  });
});
