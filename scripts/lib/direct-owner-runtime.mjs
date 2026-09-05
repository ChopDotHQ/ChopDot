function fail(errorFactory, message) {
  throw errorFactory(message);
}

function destroyQuietly(session) {
  try {
    session?.destroy?.();
  } catch {
    // The identity mismatch remains the primary failure.
  }
}

export async function requireDirectOwnerSession(authClient, expectedOwner, errorFactory = message => new Error(message)) {
  const normalizedExpected = String(expectedOwner ?? '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalizedExpected)) {
    fail(errorFactory, 'Direct-owner deployment lacks one explicit expected H160 owner.');
  }
  const session = await authClient.getSessionSigner();
  if (!session) {
    fail(errorFactory, 'Direct-owner session disappeared after whoami; refusing to fall back to a development signer.');
  }
  const sessionOwner = String(session.addresses?.productH160 ?? '').toLowerCase();
  const productAddress = session.addresses?.productAddress;
  if (
    sessionOwner !== normalizedExpected
    || typeof productAddress !== 'string'
    || productAddress.length === 0
    || session.address !== productAddress
    || !session.signer
  ) {
    destroyQuietly(session);
    fail(errorFactory, 'Direct-owner session identity changed after whoami; refusing all deployment writes.');
  }
  return session;
}
