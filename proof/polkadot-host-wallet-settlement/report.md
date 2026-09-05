# Five-person wallet settlement proof

Status: **passed**

Mina created one PAS group spend. Leo, Nina, Omar, and Casey each opened the real payer screen in a separate browser profile and used `Pay Mina`. Each click caused that agent wallet to sign a public testnet transfer.

## Payments

- Nina: 0.01 PAS - [0xfe611bab3472def18b7f4d2fd9e4ec90d247ddeb49ae806b4eae563d4be9ef26](https://blockscout-testnet.polkadot.io/tx/0xfe611bab3472def18b7f4d2fd9e4ec90d247ddeb49ae806b4eae563d4be9ef26)
- Leo: 0.01 PAS - [0x853f601d2380fe7a9fbab70941704190cd1d2c33ce41ba147540bad53e5e0a36](https://blockscout-testnet.polkadot.io/tx/0x853f601d2380fe7a9fbab70941704190cd1d2c33ce41ba147540bad53e5e0a36)
- Omar: 0.01 PAS - [0x54d5c7378dee218971ede186c48e8aa5e505aef3c28a399863aa8dda1b3a41e5](https://blockscout-testnet.polkadot.io/tx/0x54d5c7378dee218971ede186c48e8aa5e505aef3c28a399863aa8dda1b3a41e5)
- Casey: 0.01 PAS - [0x9ec8b6ac692d54d1cbf18b082d155b4f73795cf75c19a581c749fd6725cc7c77](https://blockscout-testnet.polkadot.io/tx/0x9ec8b6ac692d54d1cbf18b082d155b4f73795cf75c19a581c749fd6725cc7c77)

## Boundaries

- The wallets had faucet-funded balances, but no matching EVM funding transaction hash was visible. No faucet hash is claimed.
- The browser wallet was an automated EIP-1193 harness backed by disposable funded agent keys. This proves the same interface a browser wallet uses; it is not a manual extension-popup or Polkadot Mobile proof.
- ChopDot read each transaction and finalized receipt directly from the public RPC. No saved report was used as payment truth.
- Only the exact matching share cleared. The group finished with zero open amount.
