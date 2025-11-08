/**
 * Simulation mode utilities
 * Provides mock wallet addresses and helpers for testing without real wallet connections
 */

const useSim = import.meta.env.VITE_SIMULATE_CHAIN === '1';

/**
 * Generate a mock SS58-0 (Polkadot Asset Hub) address for simulation
 * Format: 15mock + 32 hex chars + suffix
 */
function generateMockAddress(suffix: string): string {
  // Generate a deterministic but unique address based on suffix
  const hash = Array.from(suffix).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hex = hash.toString(16).padStart(32, '0');
  return `15mock${hex}${suffix}`.slice(0, 48); // SS58 addresses are typically 48 chars
}

/**
 * Get mock addresses for common member names
 */
const MOCK_ADDRESSES: Record<string, string> = {
  alice: generateMockAddress('A'),
  bob: generateMockAddress('B'),
  charlie: generateMockAddress('C'),
  dave: generateMockAddress('D'),
  eve: generateMockAddress('E'),
};

/**
 * Get a mock address for a member name (for simulation mode)
 */
export function getMockAddressForMember(name: string): string | null {
  if (!useSim) return null;
  
  const nameLower = name.toLowerCase().trim();
  
  // Check exact matches first
  if (MOCK_ADDRESSES[nameLower]) {
    return MOCK_ADDRESSES[nameLower];
  }
  
  // Check if name contains common patterns
  if (nameLower.includes('alice')) return MOCK_ADDRESSES.alice;
  if (nameLower.includes('bob')) return MOCK_ADDRESSES.bob;
  if (nameLower.includes('charlie')) return MOCK_ADDRESSES.charlie;
  if (nameLower.includes('dave')) return MOCK_ADDRESSES.dave;
  if (nameLower.includes('eve')) return MOCK_ADDRESSES.eve;
  
  // Generate a new one based on name
  return generateMockAddress(nameLower.slice(0, 2).toUpperCase());
}

/**
 * Check if simulation mode is active
 */
export function isSimulationMode(): boolean {
  return useSim;
}

/**
 * Mark an address as simulated (for UI display)
 */
export function markSimulatedAddress(address: string): string {
  return useSim ? `${address} (simulated)` : address;
}

