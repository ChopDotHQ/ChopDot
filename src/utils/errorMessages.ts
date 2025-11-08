/**
 * Error message utilities for consistent, actionable error messages
 */

export interface ErrorContext {
  action?: string;
  resource?: string;
  details?: string;
  recovery?: string;
}

/**
 * Formats a user-friendly error message
 */
export function formatErrorMessage(
  error: unknown,
  context?: ErrorContext
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Handle specific error types
  if (errorMessage.includes('USER_REJECTED') || errorMessage.includes('cancelled')) {
    return 'Transaction cancelled';
  }
  
  if (errorMessage.includes('Insufficient') || errorMessage.includes('insufficient')) {
    return 'Insufficient balance. Please add funds and try again.';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('Network')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  if (errorMessage.includes('wallet') || errorMessage.includes('Wallet')) {
    if (errorMessage.includes('not found') || errorMessage.includes('No Polkadot')) {
      return 'Wallet not found. Please install Polkadot.js, SubWallet, or Talisman.';
    }
    if (errorMessage.includes('connect') || errorMessage.includes('Connect')) {
      return 'Please connect your wallet first.';
    }
    if (errorMessage.includes('address')) {
      return 'Wallet address not found. Please connect your wallet.';
    }
  }
  
  if (errorMessage.includes('file') || errorMessage.includes('File')) {
    if (errorMessage.includes('format') || errorMessage.includes('Invalid')) {
      return 'Invalid file format. Please select a valid file.';
    }
    if (errorMessage.includes('read') || errorMessage.includes('Read')) {
      return 'Could not read file. Please try again.';
    }
  }
  
  if (errorMessage.includes('password') || errorMessage.includes('Password')) {
    if (errorMessage.includes('decrypt') || errorMessage.includes('Decrypt')) {
      return 'Incorrect password. Please check and try again.';
    }
  }
  
  if (errorMessage.includes('export') || errorMessage.includes('Export')) {
    if (errorMessage.includes('data not available')) {
      return 'Cannot export: pot data not available. Please try refreshing.';
    }
    return context?.action === 'export' 
      ? `Failed to export ${context.resource || 'data'}. Please try again.`
      : 'Export failed. Please try again.';
  }
  
  if (errorMessage.includes('import') || errorMessage.includes('Import')) {
    return context?.action === 'import'
      ? `Failed to import ${context.resource || 'data'}. ${context.details || 'Please check the file and try again.'}`
      : 'Import failed. Please check the file and try again.';
  }
  
  if (errorMessage.includes('settlement') || errorMessage.includes('Settlement')) {
    return 'Settlement failed. Please check your balance and try again.';
  }
  
  if (errorMessage.includes('checkpoint') || errorMessage.includes('Checkpoint')) {
    if (errorMessage.includes('wallet')) {
      return 'Connect a wallet to checkpoint on-chain.';
    }
    return 'Checkpoint failed. Please try again.';
  }
  
  // Generic fallback with context
  if (context?.action && context?.resource) {
    return `${context.action} ${context.resource} failed. ${context.details || 'Please try again.'}`;
  }
  
  // Return original message if it's user-friendly, otherwise generic
  if (errorMessage.length < 100 && !errorMessage.includes('Error:') && !errorMessage.includes('error:')) {
    return errorMessage;
  }
  
  return context?.recovery || 'Something went wrong. Please try again.';
}

/**
 * Common error messages for specific scenarios
 */
export const ErrorMessages = {
  wallet: {
    notFound: 'Wallet not found. Please install Polkadot.js, SubWallet, or Talisman.',
    notConnected: 'Please connect your wallet first.',
    noAddress: 'Wallet address not found. Please connect your wallet.',
    rejected: 'Transaction cancelled by user.',
  },
  network: {
    error: 'Network error. Please check your connection and try again.',
    timeout: 'Request timed out. Please try again.',
  },
  balance: {
    insufficient: 'Insufficient balance. Please add funds and try again.',
  },
  file: {
    invalidFormat: 'Invalid file format. Please select a valid file.',
    readError: 'Could not read file. Please try again.',
  },
  export: {
    noData: 'Cannot export: pot data not available. Please try refreshing.',
    failed: 'Export failed. Please try again.',
  },
  import: {
    failed: 'Import failed. Please check the file and try again.',
    invalidFile: 'Invalid file format. Please select a .chop or .json file.',
  },
  password: {
    incorrect: 'Incorrect password. Please check and try again.',
  },
  settlement: {
    failed: 'Settlement failed. Please check your balance and try again.',
    cancelled: 'Settlement cancelled.',
  },
  checkpoint: {
    noWallet: 'Connect a wallet to checkpoint on-chain.',
    failed: 'Checkpoint failed. Please try again.',
  },
} as const;

