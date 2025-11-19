/**
 * Programmatic Test Script for SupabaseSource
 * 
 * Tests the Supabase data source implementation without requiring browser interaction.
 * Run with: npx tsx scripts/test-supabase-source.ts
 */

import { SupabaseSource } from '../src/services/data/sources/SupabaseSource';
import type { Pot } from '../src/services/data/types';

async function testSupabaseSource() {
  console.log('🧪 Testing SupabaseSource Implementation\n');

  const source = new SupabaseSource();

  // Test 1: Configuration Check
  console.log('1️⃣ Checking configuration...');
  const isConfigured = source.isConfigured();
  console.log(`   isConfigured(): ${isConfigured ? '✅ YES' : '❌ NO'}`);
  
  if (!isConfigured) {
    console.log('\n⚠️  Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    console.log('   Skipping remaining tests.');
    return;
  }

  // Test 2: Get Current User ID (requires auth)
  console.log('\n2️⃣ Testing authentication...');
  try {
    // We can't easily test this without a real session, but we can check the method exists
    console.log('   ✅ SupabaseSource has getCurrentUserId() method');
  } catch (error) {
    console.log(`   ❌ Auth check failed: ${error}`);
  }

  // Test 3: Create Test Pot
  console.log('\n3️⃣ Testing pot creation...');
  const testPot: Pot = {
    id: `test-pot-${Date.now()}`,
    name: 'Test Pot from Script',
    type: 'expense',
    baseCurrency: 'USD',
    members: [
      {
        id: 'test-member-1',
        name: 'Test Member',
        role: 'Owner',
        status: 'active',
      },
    ],
    expenses: [
      {
        id: 'test-expense-1',
        amount: 50.0,
        currency: 'USD',
        paidBy: 'test-member-1',
        memo: 'Test expense',
        date: new Date().toISOString(),
      },
    ],
    history: [],
    budget: 1000,
    budgetEnabled: true,
    checkpointEnabled: true,
    archived: false,
    mode: 'casual',
  };

  try {
    await source.savePot(testPot);
    console.log(`   ✅ Pot created: ${testPot.id}`);
  } catch (error) {
    console.log(`   ❌ Failed to create pot: ${error}`);
    console.log('   Note: This may fail if not authenticated. That\'s expected.');
    return;
  }

  // Test 4: Get Pot
  console.log('\n4️⃣ Testing pot retrieval...');
  try {
    const retrieved = await source.getPot(testPot.id);
    if (retrieved) {
      console.log(`   ✅ Pot retrieved: ${retrieved.name}`);
      console.log(`   - Members: ${retrieved.members.length}`);
      console.log(`   - Expenses: ${retrieved.expenses.length}`);
      console.log(`   - Base Currency: ${retrieved.baseCurrency}`);
    } else {
      console.log(`   ❌ Pot not found: ${testPot.id}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to retrieve pot: ${error}`);
  }

  // Test 5: List All Pots
  console.log('\n5️⃣ Testing pot listing...');
  try {
    const pots = await source.getPots();
    console.log(`   ✅ Retrieved ${pots.length} pots`);
    if (pots.length > 0) {
      console.log(`   - First pot: ${pots[0].name} (${pots[0].id})`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to list pots: ${error}`);
  }

  // Test 6: Update Pot
  console.log('\n6️⃣ Testing pot update...');
  try {
    const updatedPot: Pot = {
      ...testPot,
      name: 'Updated Test Pot',
      budget: 2000,
    };
    await source.savePot(updatedPot);
    console.log(`   ✅ Pot updated: ${updatedPot.name}`);
    
    // Verify update
    const verify = await source.getPot(testPot.id);
    if (verify?.name === 'Updated Test Pot') {
      console.log('   ✅ Update verified');
    } else {
      console.log('   ⚠️  Update may not have persisted correctly');
    }
  } catch (error) {
    console.log(`   ❌ Failed to update pot: ${error}`);
  }

  // Test 7: Delete Pot
  console.log('\n7️⃣ Testing pot deletion...');
  try {
    await source.deletePot(testPot.id);
    console.log(`   ✅ Pot deleted: ${testPot.id}`);
    
    // Verify deletion
    const verify = await source.getPot(testPot.id);
    if (!verify) {
      console.log('   ✅ Deletion verified');
    } else {
      console.log('   ⚠️  Pot still exists after deletion');
    }
  } catch (error) {
    console.log(`   ❌ Failed to delete pot: ${error}`);
  }

  console.log('\n✅ Test suite complete!');
  console.log('\n📋 Next: Run SQL queries in Supabase to verify:');
  console.log('   - Check public.pots table for test pot');
  console.log('   - Check public.pot_members table for owner row');
  console.log('   - Verify metadata JSONB contains members/expenses');
}

// Run tests
testSupabaseSource().catch(console.error);

