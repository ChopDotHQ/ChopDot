/**
 * Default Pots Seed Data
 * 
 * This file contains default/example pots that should be available
 * when the app is first loaded or when specific pots are missing.
 * 
 * To add a new default pot:
 * 1. Add it to the DEFAULT_POTS array below
 * 2. The data layer will automatically ensure it exists when loading pots
 */

import type { Pot } from '../types';

export const DEFAULT_POTS: Pot[] = [
  {
    id: "1",
    name: "Devconnect Buenos Aires",
    type: "expense",
    baseCurrency: "USD",
    members: [
      { id: "owner", name: "You", role: "Owner", status: "active" },
      { id: "alice", name: "Alice", role: "Member", status: "active" },
      { id: "bob", name: "Bob", role: "Member", status: "active" }
    ],
    expenses: [],
    history: [],
    archived: false,
    budget: 500,
    budgetEnabled: true,
    checkpointEnabled: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Urbe Campus Rome",
    type: "expense",
    baseCurrency: "USD",
    members: [
      { id: "owner", name: "You", role: "Owner", status: "active" },
      { id: "charlie", name: "Charlie", role: "Member", status: "active" },
      { id: "diana", name: "Diana", role: "Member", status: "pending" }
    ],
    expenses: [],
    history: [],
    archived: false,
    budget: 3000,
    budgetEnabled: true,
    checkpointEnabled: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: new Date().toISOString()
  },
  {
    id: "3",
    name: "💰 Emergency Fund",
    type: "savings",
    baseCurrency: "USD",
    members: [
      { id: "owner", name: "You", role: "Owner", status: "active" }
    ],
    expenses: [],
    history: [],
    archived: false,
    budgetEnabled: false,
    checkpointEnabled: false,
    contributions: [],
    goalAmount: 5000,
    goalDescription: "Build a 6-month emergency fund",
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "🎉 Team Offsite",
    type: "expense",
    baseCurrency: "USD",
    members: [
        { id: "owner", name: "You", role: "Owner", status: "active" },
        { id: "alice", name: "Alice", role: "Member", status: "active" },
        { id: "bob", name: "Bob", role: "Member", status: "active" },
        { id: "charlie", name: "Charlie", role: "Member", status: "active" }
    ],
    expenses: [
      {
        id: "pb1",
        amount: 250,
        currency: "USD",
        paidBy: "owner",
        memo: "Conference tickets (3-day pass)",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 62.50 },
          { memberId: "alice", amount: 62.50 },
          { memberId: "bob", amount: 62.50 },
          { memberId: "charlie", amount: 62.50 }
        ],
        attestations: ["alice", "bob", "charlie"],
        hasReceipt: true
      },
      {
        id: "pb2",
        amount: 180,
        currency: "USD",
        paidBy: "alice",
        memo: "Team dinner",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 45 },
          { memberId: "alice", amount: 45 },
          { memberId: "bob", amount: 45 },
          { memberId: "charlie", amount: 45 }
        ],
        attestations: ["bob"],
        hasReceipt: true
      },
      {
        id: "pb3",
        amount: 75,
        currency: "USD",
        paidBy: "bob",
        memo: "Coffee & snacks",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 18.75 },
          { memberId: "alice", amount: 18.75 },
          { memberId: "bob", amount: 18.75 },
          { memberId: "charlie", amount: 18.75 }
        ],
        attestations: ["alice", "charlie"],
        hasReceipt: false
      },
      {
        id: "pb4",
        amount: 320,
        currency: "USD",
        paidBy: "charlie",
        memo: "Workshop materials & swag",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 80 },
          { memberId: "alice", amount: 80 },
          { memberId: "bob", amount: 80 },
          { memberId: "charlie", amount: 80 }
        ],
        attestations: [],
        hasReceipt: true
      },
      {
        id: "pb5",
        amount: 125,
        currency: "USD",
        paidBy: "owner",
        memo: "Transportation (shared rides)",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        split: [
          { memberId: "owner", amount: 31.25 },
          { memberId: "alice", amount: 31.25 },
          { memberId: "bob", amount: 31.25 },
          { memberId: "charlie", amount: 31.25 }
        ],
        attestations: ["alice"],
        hasReceipt: false
      }
    ],
    budget: 1000,
    budgetEnabled: true,
    checkpointEnabled: false,
    history: [],
    archived: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: new Date().toISOString()
  }
];

/**
 * Ensures all default pots exist in the given pots array.
 * Adds any missing default pots without overwriting existing ones.
 */
export function ensureDefaultPots(existingPots: Pot[]): Pot[] {
  const result = [...existingPots];
  const existingIds = new Set(existingPots.map(p => p.id));
  
  for (const defaultPot of DEFAULT_POTS) {
    if (!existingIds.has(defaultPot.id)) {
      result.push(defaultPot);
      console.log(`[Seeds] Added default pot: ${defaultPot.name} (ID: ${defaultPot.id})`);
    }
  }
  
  return result;
}
