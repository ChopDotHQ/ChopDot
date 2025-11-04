import { useMemo, useState, useEffect } from 'react';
import Identicon from '@polkadot/react-identicon';
import { encodeAddress } from '@polkadot/util-crypto';
import { polkadotConfig, explorer } from '../utils/polkadot-config';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface AddressDisplayProps {
  address: string;
  className?: string;
}

export const AddressDisplay = ({ address, className }: AddressDisplayProps) => {
  const ss58 = useMemo(() => {
    try {
      return encodeAddress(address, polkadotConfig.ss58Prefix);
    } catch {
      return address;
    }
  }, [address]);

  const shortened = useMemo(() => {
    if (!ss58) return '';
    if (ss58.length <= 16) return ss58;
    return `${ss58.slice(0, 6)}…${ss58.slice(-6)}`;
  }, [ss58]);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ss58);
      setCopied(true);
    } catch {
      // no-op: clipboard may be unavailable, silently ignore
    }
  };

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className ?? ''}`}>
      <Identicon value={ss58} size={24} theme='polkadot' />
      <span className='text-body font-medium truncate'>{shortened}</span>
      <button
        type='button'
        onClick={handleCopy}
        className='p-1 rounded hover:bg-background/60 transition-colors'
        aria-label='Copy address'
      >
        {copied ? <Check className='w-4 h-4 text-success' /> : <Copy className='w-4 h-4 text-muted' />}
      </button>
      <a
        href={explorer.address(ss58)}
        target='_blank'
        rel='noopener noreferrer'
        className='p-1 rounded hover:bg-background/60 transition-colors'
        aria-label='Open in explorer'
      >
        <ExternalLink className='w-4 h-4 text-muted' />
      </a>
    </div>
  );
};




