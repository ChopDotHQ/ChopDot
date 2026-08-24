# Participant-held architecture

ChopDot has no operated authority database. Canonical truth is an append-only
`ChopEventV1` log signed by participants and interpreted by One Chop Core with
exact `MoneyV1` values. Encrypted local storage is a replayable projection.

Delivery services, Statement Store, Bulletin, contracts, chains, DotNS, IPFS,
and KGv2 may carry, locate, or index evidence. None grants membership, moves
money, confirms receipt, or rewrites the log. Contact verification proves a
bounded contact ceremony only; an organizer-signed grant creates membership.

This is the positive launch architecture. The absence of Supabase or another
private backend follows from the authority model; it is not the product pitch.

## Product Account composition

Receipt scanning and bounded guest use remain available before account
ceremony. **Use my Product Account** is an explicit user action. Once chosen,
the host account signer becomes that participant's authority identity and the
organizer's initial group key is created once, wrapped to the account, and
stored only in `DurableMembershipKeyEnvelopeRegistry`.

An organizer invitation starts from three explicit existing objects: one
canonical group, one verified contact, and one host conversation. Contact and
conversation metadata only select a recipient and delivery route. Canonical
`MEMBER_ADDED` is appended only after recipient-signed acceptance, an
organizer-signed grant, and a recipient-signed acknowledgement bound to the
exact durable account envelope.

The new member then receives one ordered encrypted copy of the complete
accepted frontier, including `GROUP_CREATED` and their single `MEMBER_ADDED`.
It is signature-checked and imported atomically before acknowledgement. If
transport fails after the append-only journal advances, retry recognizes the
exact accepted grant and resends that deterministic history delivery; it never
appends a second membership event.

New canonical events use an explicit group-to-conversation binding and the
current account-bound group key. The durable outbox contains ciphertext only;
delivery is recipient/account/key-version bound, retried, deduplicated,
expires, and clears only after a signed recipient acknowledgement. Decryption
is followed by `ProductionAuthority.accept` before acknowledgement. Canonical
groups never fall back to a reusable session secret.

Removal is a separate multi-party next-key ceremony. Every remaining active
account must open and persist its recipient-bound next key and sign the exact
envelope digest before `MEMBER_REMOVED` can be appended. Remaining members
receive that event under the next key. The removed account receives only the
same signed removal event under its acknowledged old-key context, so its local
projection becomes inactive; it never receives the next key or any later
group update. Both ciphertext sets enter the durable outbox atomically and
remain retryable until recipient-signed acknowledgements clear them.

The host entropy interface receives only a 32-byte SHA-256 selector. ChopDot
derives that selector from the complete domain-separated account, group,
participant, key-version, and network context. The complete canonical context
still binds AES-GCM additional authenticated data and HKDF `info`; shortening
the host selector therefore does not weaken wrong-account, wrong-group,
wrong-recipient, wrong-key-version, or wrong-network rejection. The same
bounded rule protects encrypted Bulletin recovery locators, and the bridge
rejects any future caller that supplies zero or more than 32 context bytes.
