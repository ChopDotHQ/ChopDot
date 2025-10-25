/**
 * DEBUG HELPERS
 * 
 * Utility functions for debugging and resetting app state.
 * These are safe to call from browser console.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Run: window.ChopDot.clearAll()
 * 3. Reload page
 */

export const debugHelpers = {
  /**
   * Clear all localStorage data
   * Use this if the app is stuck or has corrupted data
   */
  clearAll: () => {
    console.log('🧹 [Debug] Clearing all ChopDot data...');
    
    // Clear auth data
    localStorage.removeItem('chopdot_user');
    localStorage.removeItem('chopdot_auth_token');
    
    // Clear app data
    localStorage.removeItem('chopdot_pots');
    localStorage.removeItem('chopdot_settlements');
    localStorage.removeItem('chopdot_notifications');
    
    // Clear feature flags
    localStorage.removeItem('flag_POLKADOT_APP_ENABLED');
    localStorage.removeItem('flag_IPFS_RECEIPTS_ENABLED');
    localStorage.removeItem('flag_PUSH_ENABLED');
    localStorage.removeItem('flag_SERVICE_FEE_CAP_BPS');
    
    // Clear theme preference
    localStorage.removeItem('chopdot_theme');
    
    console.log('✅ [Debug] All data cleared! Reload the page.');
  },

  /**
   * Emergency fix - Clear ONLY if app is frozen
   * Use this if clearAll doesn't help
   */
  emergencyFix: () => {
    console.log('🚨 [Debug] EMERGENCY FIX - Clearing ALL localStorage...');
    try {
      localStorage.clear();
      console.log('✅ [Debug] localStorage completely cleared! Reload the page.');
    } catch (e) {
      console.error('💥 [Debug] Failed to clear localStorage:', e);
    }
  },

  /**
   * Check storage size
   */
  checkStorageSize: () => {
    console.log('📊 [Debug] Storage size check:');
    let total = 0;
    
    const items = [
      'chopdot_user',
      'chopdot_auth_token',
      'chopdot_pots',
      'chopdot_settlements',
      'chopdot_notifications',
      'chopdot_theme'
    ];
    
    items.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        const size = new Blob([value]).size;
        const kb = (size / 1024).toFixed(2);
        total += size;
        console.log(`  ${key}: ${kb} KB`);
        
        // Warn if too large
        if (size > 500000) {
          console.warn(`    ⚠️ ${key} is very large!`);
        }
      }
    });
    
    console.log(`  Total: ${(total / 1024).toFixed(2)} KB`);
    
    // Check quota (estimate)
    const quotaEstimate = 5 * 1024 * 1024; // ~5MB typical limit
    const percentUsed = ((total / quotaEstimate) * 100).toFixed(1);
    console.log(`  Estimated quota used: ${percentUsed}%`);
    
    if (total > quotaEstimate * 0.8) {
      console.warn('  ⚠️ localStorage is almost full! Consider clearing old data.');
    }
  },

  /**
   * Clear only auth data (keeps pots/settlements)
   */
  clearAuth: () => {
    console.log('🧹 [Debug] Clearing auth data...');
    localStorage.removeItem('chopdot_user');
    localStorage.removeItem('chopdot_auth_token');
    console.log('✅ [Debug] Auth cleared! Reload the page.');
  },

  /**
   * Clear only app data (keeps auth)
   */
  clearAppData: () => {
    console.log('🧹 [Debug] Clearing app data...');
    localStorage.removeItem('chopdot_pots');
    localStorage.removeItem('chopdot_settlements');
    localStorage.removeItem('chopdot_notifications');
    console.log('✅ [Debug] App data cleared! Reload the page.');
  },

  /**
   * Show current localStorage state
   */
  showState: () => {
    console.log('📊 [Debug] Current localStorage state:');
    console.log('User:', localStorage.getItem('chopdot_user'));
    console.log('Token:', localStorage.getItem('chopdot_auth_token'));
    console.log('Pots:', localStorage.getItem('chopdot_pots'));
    console.log('Settlements:', localStorage.getItem('chopdot_settlements'));
    console.log('Notifications:', localStorage.getItem('chopdot_notifications'));
    console.log('Theme:', localStorage.getItem('chopdot_theme'));
  },

  /**
   * Create a mock logged-in user
   */
  mockLogin: () => {
    console.log('🎭 [Debug] Creating mock user...');
    const mockUser = {
      id: 'debug_user',
      email: 'debug@chopdot.app',
      authMethod: 'email' as const,
      name: 'Debug User',
      createdAt: new Date().toISOString(),
    };
    const mockToken = 'debug_token_' + Date.now();
    
    localStorage.setItem('chopdot_user', JSON.stringify(mockUser));
    localStorage.setItem('chopdot_auth_token', mockToken);
    
    console.log('✅ [Debug] Mock user created! Reload the page.');
  },

  /**
   * Force logout
   */
  forceLogout: () => {
    console.log('🚪 [Debug] Forcing logout...');
    localStorage.removeItem('chopdot_user');
    localStorage.removeItem('chopdot_auth_token');
    console.log('✅ [Debug] Logged out! Reload the page.');
  },

  /**
   * Check if data is causing performance issues
   */
  diagnosePerformance: () => {
    console.log('🔍 [Debug] Performance diagnosis:');
    
    const items = [
      'chopdot_pots',
      'chopdot_settlements',
      'chopdot_notifications',
    ];
    
    items.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        const size = new Blob([value]).size;
        const kb = (size / 1024).toFixed(2);
        
        console.log(`\n${key}:`);
        console.log(`  Size: ${kb} KB`);
        
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            console.log(`  Items: ${parsed.length}`);
            
            // Check for nested data complexity
            if (key === 'chopdot_pots' && parsed.length > 0) {
              const totalExpenses = parsed.reduce((sum: number, pot: any) => 
                sum + (pot.expenses?.length || 0), 0);
              console.log(`  Total expenses across all pots: ${totalExpenses}`);
              
              if (totalExpenses > 100) {
                console.warn(`  ⚠️ HIGH: ${totalExpenses} expenses may cause slowdown`);
                console.log(`  💡 Suggestion: Consider archiving old expenses`);
              }
            }
          }
          
          if (size > 500000) {
            console.warn(`  ⚠️ WARNING: ${key} is very large!`);
          }
        } catch (e) {
          console.error(`  ❌ Parse error:`, e);
        }
      }
    });
    
    console.log('\n📊 Total localStorage usage:');
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          total += new Blob([value]).size;
        }
      }
    }
    console.log(`  ${(total / 1024).toFixed(2)} KB used`);
    
    const quotaEstimate = 5 * 1024 * 1024; // ~5MB typical limit
    const percentUsed = ((total / quotaEstimate) * 100).toFixed(1);
    console.log(`  ~${percentUsed}% of estimated 5MB quota`);
    
    if (total > quotaEstimate * 0.7) {
      console.warn('\n⚠️ localStorage is getting full! Consider clearing old data.');
    }
  },

  /**
   * Archive old expenses (keep only last 30 days)
   */
  archiveOldExpenses: () => {
    console.log('📦 [Debug] Archiving old expenses...');
    
    try {
      const potsData = localStorage.getItem('chopdot_pots');
      if (!potsData) {
        console.log('ℹ️ No pots data to archive');
        return;
      }
      
      const pots = JSON.parse(potsData);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let totalExpenses = 0;
      let archivedExpenses = 0;
      
      const cleanedPots = pots.map((pot: any) => {
        if (pot.expenses) {
          const originalCount = pot.expenses.length;
          totalExpenses += originalCount;
          
          // Keep only expenses from last 30 days
          pot.expenses = pot.expenses.filter((exp: any) => {
            const expDate = new Date(exp.date);
            return expDate >= thirtyDaysAgo;
          });
          
          archivedExpenses += (originalCount - pot.expenses.length);
        }
        return pot;
      });
      
      localStorage.setItem('chopdot_pots', JSON.stringify(cleanedPots));
      
      console.log(`✅ Archived ${archivedExpenses} old expenses (out of ${totalExpenses} total)`);
      console.log(`📊 Remaining: ${totalExpenses - archivedExpenses} expenses`);
      console.log('💾 Reload the page to see changes');
    } catch (e) {
      console.error('❌ Failed to archive expenses:', e);
    }
  },
};

// Expose to window for console access (development only)
// Silent load - type window.ChopDot to see available commands
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).ChopDot = debugHelpers;
}
