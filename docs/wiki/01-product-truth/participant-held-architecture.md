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
