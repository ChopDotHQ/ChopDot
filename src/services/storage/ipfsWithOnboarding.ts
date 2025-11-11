/**
 * IPFS Upload with Onboarding
 * 
 * Wraps IPFS upload functions to show onboarding before first upload.
 */

import { uploadToIPFS as uploadToIPFSBase, uploadBufferToIPFS as uploadBufferToIPFSBase } from './ipfs';
import { hasSeenIPFSAuthOnboarding } from '../../components/IPFSAuthOnboarding';

// Global callback to show onboarding (set by App.tsx)
let showOnboardingCallback: ((walletAddress: string, onContinue: () => Promise<void>) => void) | null = null;

// Track if onboarding is currently being shown to prevent multiple modals
let isOnboardingShowing = false;

/**
 * Set the callback to show onboarding (called from App.tsx)
 */
export function setOnboardingCallback(
  callback: (walletAddress: string, onContinue: () => Promise<void>) => void
): void {
  showOnboardingCallback = callback;
}

/**
 * Reset the onboarding showing flag (called when user cancels)
 */
export function resetOnboardingFlag(): void {
  isOnboardingShowing = false;
}

/**
 * Upload file with automatic onboarding check
 */
export async function uploadToIPFS(
  file: File,
  useCrustGateway: boolean = true,
  walletAddress?: string
): Promise<string> {
  // Check if onboarding needed
  if (walletAddress && showOnboardingCallback) {
    const hasSeen = hasSeenIPFSAuthOnboarding(walletAddress);
    
    if (!hasSeen && !isOnboardingShowing) {
      // Mark as showing immediately to prevent duplicate modals
      isOnboardingShowing = true;
      
      // Show onboarding first, then upload
      return new Promise((resolve, reject) => {
        showOnboardingCallback!(walletAddress, async () => {
          try {
            isOnboardingShowing = false;
            const cid = await uploadToIPFSBase(file, useCrustGateway, walletAddress);
            resolve(cid);
          } catch (error) {
            isOnboardingShowing = false;
            reject(error);
          }
        });
      });
    }
    
    // If onboarding is already showing, wait a bit and retry
    if (!hasSeen && isOnboardingShowing) {
      // Wait for onboarding to complete (user will mark it as seen)
      let retries = 0;
      while (isOnboardingShowing && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        // Check again if user has seen it
        if (hasSeenIPFSAuthOnboarding(walletAddress)) {
          break;
        }
      }
      // If still showing after timeout, proceed anyway (user might have cancelled)
      isOnboardingShowing = false;
    }
  }

  // User has seen onboarding or no wallet, proceed normally
  return uploadToIPFSBase(file, useCrustGateway, walletAddress);
}

/**
 * Upload buffer with automatic onboarding check
 */
export async function uploadBufferToIPFS(
  buffer: ArrayBuffer | Uint8Array,
  filename?: string,
  useCrustGateway: boolean = true,
  walletAddress?: string
): Promise<string> {
  // Check if onboarding needed
  if (walletAddress && showOnboardingCallback) {
    const hasSeen = hasSeenIPFSAuthOnboarding(walletAddress);
    
    if (!hasSeen && !isOnboardingShowing) {
      // Mark as showing immediately to prevent duplicate modals
      isOnboardingShowing = true;
      
      // Show onboarding first, then upload
      return new Promise((resolve, reject) => {
        showOnboardingCallback!(walletAddress, async () => {
          try {
            isOnboardingShowing = false;
            const cid = await uploadBufferToIPFSBase(buffer, filename, useCrustGateway, walletAddress);
            resolve(cid);
          } catch (error) {
            isOnboardingShowing = false;
            reject(error);
          }
        });
      });
    }
    
    // If onboarding is already showing, wait a bit and retry
    if (!hasSeen && isOnboardingShowing) {
      // Wait for onboarding to complete (user will mark it as seen)
      let retries = 0;
      while (isOnboardingShowing && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        // Check again if user has seen it
        if (hasSeenIPFSAuthOnboarding(walletAddress)) {
          break;
        }
      }
      // If still showing after timeout, proceed anyway (user might have cancelled)
      isOnboardingShowing = false;
    }
  }

  // User has seen onboarding or no wallet, proceed normally
  return uploadBufferToIPFSBase(buffer, filename, useCrustGateway, walletAddress);
}

