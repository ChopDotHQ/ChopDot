-- Create wallet_links table to track wallet connections to users
-- This table links wallet addresses (Polkadot/EVM) to Supabase auth users

CREATE TABLE IF NOT EXISTS public.wallet_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain TEXT NOT NULL CHECK (chain IN ('polkadot', 'evm')),
  address TEXT NOT NULL,
  provider TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for case-insensitive address matching (required for upsert onConflict)
-- This ensures one wallet address per user per chain
CREATE UNIQUE INDEX IF NOT EXISTS wallet_links_user_chain_address_unique_idx 
  ON public.wallet_links(user_id, chain, LOWER(address));

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS wallet_links_user_id_idx ON public.wallet_links(user_id);
CREATE INDEX IF NOT EXISTS wallet_links_address_idx ON public.wallet_links(LOWER(address));
CREATE INDEX IF NOT EXISTS wallet_links_chain_idx ON public.wallet_links(chain);
CREATE INDEX IF NOT EXISTS wallet_links_verified_at_idx ON public.wallet_links(verified_at);

COMMENT ON TABLE public.wallet_links IS 'Links wallet addresses (Polkadot/EVM) to Supabase auth users. Created automatically during wallet authentication.';
COMMENT ON COLUMN public.wallet_links.chain IS 'Blockchain network: polkadot or evm';
COMMENT ON COLUMN public.wallet_links.address IS 'Wallet address (stored as-is for SS58, lowercase for EVM)';
COMMENT ON COLUMN public.wallet_links.provider IS 'Wallet provider name (e.g., Polkadot, EVM, Nova Wallet, SubWallet)';
COMMENT ON COLUMN public.wallet_links.verified_at IS 'Timestamp when wallet signature was verified';




