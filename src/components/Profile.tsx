import { CheckCircle2, Link2, ShieldCheck, Unlink2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PolkadotHostBridge, type PolkadotHostCapabilityReport } from '../environment/polkadotHostBridge';
import { identityTrustLabel } from '../identity/polkadotIdentity';
import { useAppState } from '../state/AppStateContext';
import { getInitials } from '../utils';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button } from './primitives';

function shorten(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function Profile({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useAppState();
  const user = state.currentUserId ? state.users[state.currentUserId] : null;
  const bridge = useMemo(() => new PolkadotHostBridge(), []);
  const [capabilities, setCapabilities] = useState<PolkadotHostCapabilityReport | null>(null);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [identityError, setIdentityError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void bridge.probe().then(report => {
      if (!cancelled) setCapabilities(report);
    });
    return () => { cancelled = true; };
  }, [bridge]);

  if (!user || !state.currentUserId) return null;

  const connected = Boolean(user.hostIdentity);
  const trustLabel = identityTrustLabel(user);
  const hostCanConnect = capabilities?.insideContainer && capabilities.identity.state !== 'unavailable' && capabilities.identity.state !== 'error';

  const handleConnect = async () => {
    setIdentityBusy(true);
    setIdentityError('');
    try {
      const identity = await bridge.requestIdentity();
      dispatch({
        type: 'BIND_POLKADOT_HOST_IDENTITY',
        payload: {userId: state.currentUserId!, identity},
      });
    } catch (reason) {
      setIdentityError(reason instanceof Error ? reason.message : 'Polkadot access could not be connected.');
    } finally {
      setIdentityBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Profile" onBack={onBack} />

      <ScreenContent className="p-6 space-y-6 pb-24">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 border-4 border-white dark:border-gray-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-4xl shadow-sm transition-colors mb-4">
            {getInitials(user.name)}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold mb-6 ${connected ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
            {trustLabel}
          </span>
        </div>

        <div className="w-full space-y-2">
          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Display name</label>
          <input
            type="text"
            value={user.name}
            onChange={(e) => dispatch({ type: 'UPDATE_USER_NAME', payload: { name: e.target.value } })}
            className="w-full p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 outline-none transition-colors shadow-sm"
          />
          <p className="px-1 text-xs text-gray-500 dark:text-gray-400">Your ChopDot name can stay different from your Polkadot username.</p>
        </div>

        {user.hostIdentity ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-green-100 dark:border-green-900/40 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-300 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Connected with Polkadot</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This product account was supplied by the Polkadot host after access was granted.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">Host username</span>
                <span className="font-semibold text-gray-900 dark:text-white text-right">{user.hostIdentity.username}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">Product account</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white text-right" title={user.hostIdentity.accountId}>{shorten(user.hostIdentity.accountId)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">Product</span>
                <span className="font-medium text-gray-900 dark:text-white text-right">{user.hostIdentity.productId}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>ChopDot never receives your private key. This does not verify manually saved wallet addresses or legal identity.</span>
            </div>

            <button
              type="button"
              onClick={() => dispatch({type: 'UNBIND_POLKADOT_HOST_IDENTITY', payload: {userId: state.currentUserId!}})}
              className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Unlink2 className="w-4 h-4" />
              Disconnect on this device
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Polkadot identity</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {hostCanConnect
                  ? 'Connect the Polkadot host to bind your ChopDot profile to its product account.'
                  : 'Your local profile works without Polkadot. Open ChopDot in a compatible Polkadot host to connect an authenticated product account.'}
              </p>
            </div>
            {hostCanConnect && (
              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={identityBusy}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" />
                {identityBusy ? 'Connecting…' : 'Connect Polkadot'}
              </button>
            )}
            {identityError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{identityError}</p>}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Data status</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>App data on this build is still stored locally on this device.</p>
            <p>Connecting Polkadot authenticates the product account; it does not turn on cloud synchronization.</p>
          </div>
        </div>
      </ScreenContent>

      <BottomAction>
        <Button variant="primary" fullWidth onClick={onBack} className="h-14 text-lg shadow-sm">
          Done
        </Button>
      </BottomAction>
    </Screen>
  );
}
