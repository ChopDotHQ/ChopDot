
import React from 'react';
import { usePotSync } from '../hooks/usePotSync';
import type { Pot } from '../schema/pot';

export function PotViewExample({ potId, userId }: { potId: string; userId: string }) {
  const { 
    pot, 
    isLoading, 
    isSyncing, 
    isOnline, 
    error,
    addExpense
  } = usePotSync(potId, userId);

  if (isLoading) {
    return <div>Loading pot...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!pot) {
    return <div>Pot not found</div>;
  }

  return (
    <div>
      <h1>{pot.name}</h1>
      
      {/* Sync status indicator */}
      <div className="sync-status">
        {isSyncing && <span>Syncing...</span>}
        {!isOnline && <span>Offline</span>}
        {isOnline && !isSyncing && <span>✓ Synced</span>}
      </div>

      {/* Members list */}
      <div>
        <h2>Members</h2>
        {pot.members.map(member => (
          <div key={member.id}>
            {member.name} ({member.role})
          </div>
        ))}
      </div>

      {/* Expenses list */}
      <div>
        <h2>Expenses</h2>
        {pot.expenses.map(expense => (
          <div key={expense.id}>
            {expense.memo} - ${expense.amount} (paid by {expense.paidBy})
          </div>
        ))}
      </div>

      {/* Add expense button */}
      <button onClick={() => {
        addExpense({
          id: 'exp-' + Date.now(),
          amount: 50.00,
          currency: 'USD',
          paidBy: userId,
          memo: 'New expense',
          date: new Date().toISOString(),
          createdAt: Date.now(),
        });
      }}>
        Add Expense
      </button>
    </div>
  );
}

export function CreatePotExample({ userId }: { userId: string }) {
  const [potId] = React.useState('pot-' + Date.now());
  const [potCreated, setPotCreated] = React.useState(false);

  const initialPot: Pot = {
    id: potId,
    name: 'New Pot',
    type: 'expense',
    baseCurrency: 'USD',
    members: [
      {
        id: userId,
        name: 'Me',
        role: 'Owner',
        status: 'active',
      }
    ],
    expenses: [],
    budgetEnabled: false,
    budget: null,
    mode: 'casual',
    checkpointEnabled: false,
    archived: false,
    history: [],
    createdAt: Date.now(),
  };

  const { pot, isLoading } = usePotSync(potId, userId, potCreated ? undefined : initialPot);

  React.useEffect(() => {
    if (pot && !potCreated) {
      setPotCreated(true);
      console.log('Pot created and synced!');
    }
  }, [pot, potCreated]);

  if (isLoading) {
    return <div>Creating pot...</div>;
  }

  return (
    <div>
      <h1>Pot created: {pot?.name}</h1>
      <p>ID: {potId}</p>
    </div>
  );
}

export function InviteMemberExample({ 
  potId, 
  userId 
}: { 
  potId: string; 
  userId: string;
}) {
  const { addMember } = usePotSync(potId, userId);
  const [inviteEmail, setInviteEmail] = React.useState('');

  const handleInvite = async () => {
    const newMemberId = 'user-' + Date.now();
    
    
    addMember({
      id: newMemberId,
      name: inviteEmail,
      role: 'Member',
      status: 'pending',
    });

    setInviteEmail('');
  };

  return (
    <div>
      <input
        type="email"
        value={inviteEmail}
        onChange={(e) => setInviteEmail(e.target.value)}
        placeholder="Enter email"
      />
      <button onClick={handleInvite}>Invite</button>
    </div>
  );
}

export function UploadReceiptExample({
  potId,
  expenseId,
  userId,
  walletAddress
}: {
  potId: string;
  expenseId: string;
  userId: string;
  walletAddress?: string;
}) {
  const { updateExpense } = usePotSync(potId, userId);
  const [uploading, setUploading] = React.useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const { uploadReceipt } = await import('../services/crdt/receiptService');
      const cid = await uploadReceipt(potId, expenseId, file, userId, walletAddress);

      console.log('Receipt uploaded:', cid);

      updateExpense(expenseId, {
        receiptCid: cid,
        hasReceipt: true,
      } as any);

      alert('Receipt uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        accept="image/*,application/pdf"
      />
      {uploading && <span>Uploading...</span>}
    </div>
  );
}

export function SyncControlsExample({ potId, userId }: { potId: string; userId: string }) {
  const { 
    isOnline, 
    isSyncing, 
    error,
    forceSave,
    forceSync 
  } = usePotSync(potId, userId);

  return (
    <div className="sync-controls">
      <div className="status">
        <span className={isOnline ? 'online' : 'offline'}>
          {isOnline ? '● Online' : '○ Offline'}
        </span>
        {isSyncing && <span>Syncing...</span>}
        {error && <span className="error">Error: {error.message}</span>}
      </div>

      <div className="actions">
        <button onClick={() => forceSave()} disabled={isSyncing}>
          Save Checkpoint
        </button>
        <button onClick={() => forceSync()} disabled={isSyncing}>
          Reload from Server
        </button>
      </div>
    </div>
  );
}

export function CollaborationIndicator({ potId, userId }: { potId: string; userId: string }) {
  const { pot, isOnline } = usePotSync(potId, userId);
  const [activeMembers] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isOnline || !pot) return;

    const interval = setInterval(() => {
    }, 5000);

    return () => clearInterval(interval);
  }, [isOnline, pot]);

  if (!pot || !isOnline) return null;

  return (
    <div className="collaboration-indicator">
      <span>Editing now:</span>
      {activeMembers.length === 0 && <span>Just you</span>}
      {activeMembers.map(memberId => {
        const member = pot.members.find(m => m.id === memberId);
        return member ? (
          <span key={memberId} className="active-member">
            {member.name}
          </span>
        ) : null;
      })}
    </div>
  );
}

export function OfflineQueueIndicator({ potId, userId }: { potId: string; userId: string }) {
  const { isOnline, isSyncing } = usePotSync(potId, userId);
  const [queuedChanges, setQueuedChanges] = React.useState(0);

  React.useEffect(() => {
    if (!isOnline) {
    } else {
      setQueuedChanges(0);
    }
  }, [isOnline]);

  if (isOnline || queuedChanges === 0) return null;

  return (
    <div className="offline-queue">
      <span>📱 Offline</span>
      <span>{queuedChanges} changes queued</span>
      {isSyncing && <span>Syncing...</span>}
    </div>
  );
}
