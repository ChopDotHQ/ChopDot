import type {AppState, User} from '../types';
import type {PolkadotHostIdentity} from '../environment/polkadotHostBridge';

export interface HostIdentityBinding {
  source: 'polkadot_host';
  username: string;
  productId: string;
  accountPublicKeyHex: `0x${string}`;
  accountId: string;
  addressPrefix: number;
  boundAt: string;
}

export type LocalIdentityAction =
  | {
      type: 'BIND_POLKADOT_HOST_IDENTITY';
      payload: {userId: string; identity: PolkadotHostIdentity; boundAt?: string};
    }
  | {
      type: 'UNBIND_POLKADOT_HOST_IDENTITY';
      payload: {userId: string};
    };

export function isLocalOnlyIdentityAction(action: {type: string}): action is LocalIdentityAction {
  return action.type === 'BIND_POLKADOT_HOST_IDENTITY' || action.type === 'UNBIND_POLKADOT_HOST_IDENTITY';
}

export function reduceIdentityAction(state: AppState, action: LocalIdentityAction): AppState {
  const user = state.users[action.payload.userId];
  if (!user) return state;

  if (action.type === 'UNBIND_POLKADOT_HOST_IDENTITY') {
    if (!user.hostIdentity) return state;
    const {hostIdentity: _removed, accountPublicKeyHex: _compatKey, ...rest} = user;
    const nextUser: User = {...rest};
    return {...state, users: {...state.users, [user.id]: nextUser}};
  }

  let binding: HostIdentityBinding;
  try {
    binding = createHostIdentityBinding(action.payload.identity, action.payload.boundAt);
  } catch {
    return state;
  }

  return {
    ...state,
    users: {
      ...state.users,
      [user.id]: {
        ...user,
        accountPublicKeyHex: binding.accountPublicKeyHex,
        hostIdentity: binding,
      },
    },
  };
}

export function createHostIdentityBinding(identity: PolkadotHostIdentity, boundAt = new Date().toISOString()): HostIdentityBinding {
  const accountPublicKeyHex = bytesToPublicKeyHex(identity.publicKey);
  const [accountId, addressPrefix] = identity.accountId;
  if (!identity.username.trim()) throw new Error('Host username is required.');
  if (!identity.productId.trim()) throw new Error('Product id is required.');
  if (!accountId.trim() || !Number.isInteger(addressPrefix) || addressPrefix < 0) {
    throw new Error('Host account id is invalid.');
  }

  return {
    source: 'polkadot_host',
    username: identity.username.trim(),
    productId: identity.productId.trim(),
    accountPublicKeyHex,
    accountId,
    addressPrefix,
    boundAt,
  };
}

export function bytesToPublicKeyHex(publicKey: Uint8Array): `0x${string}` {
  if (publicKey.byteLength !== 32) throw new Error('A 32-byte product account public key is required.');
  return `0x${Array.from(publicKey, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function identityTrustLabel(user: User): 'Connected with Polkadot' | 'Local profile' {
  return user.hostIdentity?.source === 'polkadot_host' ? 'Connected with Polkadot' : 'Local profile';
}
