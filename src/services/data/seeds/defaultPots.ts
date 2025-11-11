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
    baseCurrency: "DOT",
    members: [
      { id: "owner", name: "You", role: "Owner", status: "active" }
    ],
    expenses: [],
    contributions: [],
    totalPooled: 750,
    yieldRate: 12.5,
    defiProtocol: "Acala",
    goalAmount: 5000,
    goalDescription: "Build a 6-month emergency fund",
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "Polkadot Builder Party",
    type: "expense",
    baseCurrency: "DOT",
    members: [
      { id: "owner", name: "You", role: "Owner", status: "active", address: "15XyKf7Gv8qJ3N4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6" },
      { id: "alice", name: "Alice", role: "Member", status: "active", address: "15mock00000000000000000000000000000A" },
      { id: "bob", name: "Bob", role: "Member", status: "active", address: "15mock00000000000000000000000000000B" },
      { id: "charlie", name: "Charlie", role: "Member", status: "active", address: "15mock00000000000000000000000000000C" }
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
    checkpointEnabled: false,
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

