/**
 * Seed script to add "Polkadot Builder Party" pot to localStorage
 * Run this in browser console: copy the entire script and paste it
 */

(function seedPolkadotBuilderParty() {
  const newPot = {
    id: "4",
    name: "Polkadot Builder Party",
    type: "expense",
    baseCurrency: "DOT",
    members: [
      {
        id: "owner",
        name: "You",
        role: "Owner",
        status: "active",
        address: "15GrwkvKWLJUXwKZFXChsVGdfnRDEhinYMiGWXnV8Pfv7Hjq"
      },
      {
        id: "alice",
        name: "Alice",
        role: "Member",
        status: "active",
        address: "15Jh2k3Xm29ry1CNtXNvzPTC2QgHYMnyqcG4cSnhpV9MrAbf"
      },
      {
        id: "bob",
        name: "Bob",
        role: "Member",
        status: "active",
        address: "13FJ4i6TJyGXPRvWHzRvDDDeZPAHDq6cHruM3aMcDwZJWLEH"
      },
      {
        id: "charlie",
        name: "Charlie",
        role: "Member",
        status: "active",
        address: "16Hk8qqBPGF6NQvM6PgZGZXzx9Dj2TqkBTsEz9wqgFudaGt3"
      }
    ],
    expenses: [
      {
        id: "pb1",
        amount: 2.5,
        currency: "DOT",
        paidBy: "owner",
        memo: "Conference tickets (3-day pass)",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 0.625 },
          { memberId: "alice", amount: 0.625 },
          { memberId: "bob", amount: 0.625 },
          { memberId: "charlie", amount: 0.625 }
        ],
        attestations: ["alice", "bob", "charlie"],
        hasReceipt: true
      },
      {
        id: "pb2",
        amount: 1.8,
        currency: "DOT",
        paidBy: "alice",
        memo: "Team dinner at Hackathon venue",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 0.45 },
          { memberId: "alice", amount: 0.45 },
          { memberId: "bob", amount: 0.45 },
          { memberId: "charlie", amount: 0.45 }
        ],
        attestations: ["bob"],
        hasReceipt: true
      },
      {
        id: "pb3",
        amount: 0.75,
        currency: "DOT",
        paidBy: "bob",
        memo: "Coffee & snacks for coding sessions",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 0.1875 },
          { memberId: "alice", amount: 0.1875 },
          { memberId: "bob", amount: 0.1875 },
          { memberId: "charlie", amount: 0.1875 }
        ],
        attestations: ["alice", "charlie"],
        hasReceipt: false
      },
      {
        id: "pb4",
        amount: 3.2,
        currency: "DOT",
        paidBy: "charlie",
        memo: "Workshop materials & swag",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 0.8 },
          { memberId: "alice", amount: 0.8 },
          { memberId: "bob", amount: 0.8 },
          { memberId: "charlie", amount: 0.8 }
        ],
        attestations: [],
        hasReceipt: true
      },
      {
        id: "pb5",
        amount: 1.25,
        currency: "DOT",
        paidBy: "owner",
        memo: "Transportation (shared rides)",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 0.3125 },
          { memberId: "alice", amount: 0.3125 },
          { memberId: "bob", amount: 0.3125 },
          { memberId: "charlie", amount: 0.3125 }
        ],
        attestations: ["alice"],
        hasReceipt: false
      }
    ],
    budget: 10.0,
    budgetEnabled: true,
    checkpointEnabled: false
  };

  try {
    // Get existing pots
    const existingPotsJson = localStorage.getItem('chopdot_pots');
    const existingPots = existingPotsJson ? JSON.parse(existingPotsJson) : [];
    
    // Check if pot already exists
    const existingIndex = existingPots.findIndex(p => p.id === "4");
    if (existingIndex >= 0) {
      existingPots[existingIndex] = newPot;
      console.log('✅ Updated existing "Polkadot Builder Party" pot');
    } else {
      existingPots.push(newPot);
      console.log('✅ Added "Polkadot Builder Party" pot');
    }
    
    // Save back to localStorage
    localStorage.setItem('chopdot_pots', JSON.stringify(existingPots));
    localStorage.setItem('chopdot_pots_backup', JSON.stringify(existingPots));
    
    console.log(`✅ Success! Total pots: ${existingPots.length}`);
    console.log('🔄 Reloading page...');
    
    // Reload to show the new pot
    setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    console.error('❌ Error seeding pot:', error);
  }
})();
