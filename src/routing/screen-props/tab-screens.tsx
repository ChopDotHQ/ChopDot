import React from 'react';
import type { AppRouterProps } from './types';
import { ActivityHome } from '../../components/screens/ActivityHome';
import { PotsHome } from '../../components/screens/PotsHome';
import { PeopleHome } from '../../components/screens/PeopleHome';
import { YouTab } from '../../components/screens/YouTab';

export type RouterContext = AppRouterProps;

export function renderActivityHome(ctx: RouterContext): React.ReactElement | null {
    const {
        nav: { push },
        data: {
            pots,
            totalOwed,
            totalOwing,
            pendingExpenses,
            activities,
        },
        userState: { walletConnected, notifications },
        actions: {
            setCurrentPotId,
            setCurrentExpenseId,
            setShowNotifications,
            setShowWalletSheet,
            showToast,
        },
        flags: { DEMO_MODE, POLKADOT_APP_ENABLED },
    } = ctx;

    return (
        <ActivityHome
            totalOwed={totalOwed}
            totalOwing={totalOwing}
            activities={activities}
            pendingExpenses={pendingExpenses}
            topPersonToSettle={undefined}
            hasPendingAttestations={pendingExpenses.length > 0}
            onActivityClick={(activity) => {
                if (activity.type === 'expense') {
                    const pot = pots.find((p) =>
                        p.expenses.some((e) => e.id === activity.id),
                    );
                    if (pot) {
                        setCurrentPotId(pot.id);
                        setCurrentExpenseId(activity.id);
                        push({
                            type: 'expense-detail',
                            expenseId: activity.id,
                        });
                    }
                } else if (activity.type === 'attestation') {
                    const expenseId =
                        activity.id.split('-attestation-')[0];
                    const pot = pots.find((p) =>
                        p.expenses.some((e) => e.id === expenseId),
                    );
                    if (pot) {
                        setCurrentPotId(pot.id);
                        setCurrentExpenseId(expenseId!);
                        push({ type: 'expense-detail', expenseId: expenseId! });
                    }
                } else if (activity.type === 'pot_created') {
                    const potId = activity.id.replace('pot-created-', '');
                    const pot = pots.find((p) => p.id === potId);
                    if (pot) {
                        setCurrentPotId(pot.id);
                        push({ type: 'pot-home', potId: pot.id });
                    }
                } else {
                    showToast(
                        `${activity.type} activities coming soon`,
                        'info',
                    );
                }
            }}
            onNotificationClick={() => {
                setShowNotifications(true);
            }}
            onWalletClick={() => {
                if (DEMO_MODE) {
                    showToast('Wallet disabled in demo', 'info');
                    return;
                }
                if (!POLKADOT_APP_ENABLED) {
                    showToast('Wallet feature disabled', 'info');
                    return;
                }
                setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            onRefresh={async () => {
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000),
                );
            }}
            notificationCount={
                notifications.filter((n) => !n.read).length
            }
        />
    );
}

export function renderPotsHome(ctx: RouterContext): React.ReactElement | null {
    const {
        nav: { push, reset },
        data: {
            pots,
            balances,
        },
        uiState: { pendingInvites },
        userState: { walletConnected, notifications },
        actions: {
            setCurrentPotId,
            setSelectedCounterpartyId,
            setShowNotifications,
            setShowWalletSheet,
            setShowChoosePot,
            setShowScanQR,
            acceptInvite,
            declineInvite,
            showToast,
            joinProcessingRef,
        },
        flags: { DEMO_MODE, POLKADOT_APP_ENABLED },
    } = ctx;

    const potSummaries = pots.filter(p => !p.archived).map((pot) => {
        const myExpenses = pot.expenses
            .filter((e) => e.paidBy === 'owner')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalExpenses = pot.expenses.reduce(
            (sum, e) => sum + e.amount,
            0,
        );

        const myShare = pot.expenses.reduce((sum, e) => {
            const split = e.split.find(
                (s) => s.memberId === 'owner',
            );
            return sum + (split?.amount || 0);
        }, 0);

        const net = myExpenses - myShare;

        return {
            id: pot.id,
            name: pot.name,
            type: pot.type,
            myExpenses,
            totalExpenses,
            net,
            budget: pot.budget,
            budgetEnabled: pot.budgetEnabled,
            totalPooled: pot.totalPooled,
            yieldRate: pot.yieldRate,
        };
    });

    return (
        <PotsHome
            pots={potSummaries}
            youOwe={balances.youOwe.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
            owedToYou={balances.owedToYou.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
            onCreatePot={() => push({ type: 'create-pot' })}
            onPotClick={(potId) => {
                setCurrentPotId(potId);
                push({ type: 'pot-home', potId });
            }}
            pendingInvites={pendingInvites}
            onAcceptInvite={(token) => {
                joinProcessingRef.current = false;
                acceptInvite(token);
            }}
            onDeclineInvite={(token: string) => {
                joinProcessingRef.current = false;
                declineInvite(token);
            }}
            onSettleWithPerson={(personId) => {
                setSelectedCounterpartyId(personId);
                push({ type: 'settle-home' });
            }}
            onRemindSent={() => {
                showToast('Reminder sent.');
            }}
            onNotificationClick={() => {
                setShowNotifications(true);
            }}
            onWalletClick={() => {
                if (DEMO_MODE) {
                    showToast('Wallet disabled in demo', 'info');
                    return;
                }
                if (!POLKADOT_APP_ENABLED) {
                    showToast('Wallet feature disabled', 'info');
                    return;
                }
                setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            notificationCount={
                notifications.filter((n) => !n.read).length
            }
            onQuickAddExpense={() => {
                if (pots.length === 0) {
                    showToast('Create a pot first!', 'info');
                    return;
                }
                if (pots.length === 1) {
                    const pid = pots[0]!.id;
                    setCurrentPotId(pid);
                    push({ type: 'pot-home', potId: pid });
                } else {
                    setShowChoosePot(true);
                }
            }}
            onQuickSettle={() => {
                if (
                    balances.youOwe.length === 0 &&
                    balances.owedToYou.length === 0
                ) {
                    showToast('Nothing to settle yet', 'info');
                    return;
                }
                reset({ type: 'people-home' });
            }}
            onQuickScan={() => {
                setShowScanQR(true);
            }}
            onQuickRequest={() => {
                if (balances.owedToYou.length === 0) {
                    showToast('Nobody owes you money yet', 'info');
                    return;
                }
                push({ type: 'request-payment' });
            }}
        />
    );
}

export function renderPeopleHome(ctx: RouterContext): React.ReactElement | null {
    const {
        nav: { push },
        data: {
            hasLoadedInitialData,
            people,
            balances,
        },
        userState: { walletConnected, notifications },
        actions: {
            setSelectedCounterpartyId,
            setShowNotifications,
            setShowWalletSheet,
            setWalletConnected,
            showToast,
        },
        flags: { DEMO_MODE, POLKADOT_APP_ENABLED },
    } = ctx;

    return (
        <PeopleHome
            isLoading={!hasLoadedInitialData}
            youOwe={balances.youOwe.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
            owedToYou={balances.owedToYou.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
            people={people.map(p => ({
                ...p,
                balance: Number(balances.byPerson.get(p.id) || '0')
            }))}
            onSettle={(personId) => {
                setSelectedCounterpartyId(personId);
                push({ type: 'settle-home' });
            }}
            onPersonClick={(person) => {
                push({ type: 'member-detail', memberId: person.id });
            }}
            onNotificationClick={() => {
                setShowNotifications(true);
            }}
            onWalletClick={() => {
                if (DEMO_MODE) {
                    showToast('Wallet disabled in demo', 'info');
                    return;
                }
                if (!POLKADOT_APP_ENABLED) {
                    showToast('Wallet feature disabled', 'info');
                    return;
                }
                setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            notificationCount={
                notifications.filter((n) => !n.read).length
            }
            onConnectWallet={() => setWalletConnected(true)}
        />
    );
}

export function renderYouTab(ctx: RouterContext): React.ReactElement | null {
    const {
        nav: { push },
        data: { youTabInsights },
        userState: { user, walletConnected, notifications },
        uiState: { theme },
        actions: {
            setShowMyQR,
            setShowScanQR,
            setShowNotifications,
            setShowWalletSheet,
            setTheme,
            handleLogout,
            handleDeleteAccount,
            showToast,
        },
        flags: { DEMO_MODE, POLKADOT_APP_ENABLED },
    } = ctx;

    return (
        <YouTab
            onShowQR={() => {
                setShowMyQR(true);
            }}
            onScanQR={() => {
                setShowScanQR(true);
            }}
            onReceive={() => {
                if (!walletConnected && user?.status !== 'connected') {
                    if (!walletConnected) {
                        showToast('Connect wallet first', 'info');
                        return;
                    }
                }
                push({ type: 'receive-qr' });
            }}
            onPaymentMethods={() => {
                push({ type: 'payment-methods' });
            }}
            onViewInsights={() => {
                push({ type: 'insights' });
            }}
            onSettings={() => {
                push({ type: 'settings' });
            }}
            onCrustStorage={() => {
                push({ type: 'crust-storage' });
            }}
            onNotificationClick={() => {
                setShowNotifications(true);
            }}
            onWalletClick={() => {
                if (DEMO_MODE) {
                    showToast('Wallet disabled in demo', 'info');
                    return;
                }
                if (!POLKADOT_APP_ENABLED) {
                    showToast('Wallet feature disabled', 'info');
                    return;
                }
                setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            notificationCount={
                notifications.filter((n) => !n.read).length
            }
            insights={youTabInsights}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            userName={user?.name || 'You'}
            userEmail={user?.email}
            isGuest={user?.isGuest || false}
        />
    );
}
