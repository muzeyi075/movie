# Solana Wallet Security

This implementation is custodial: the server can derive and potentially sign with every user wallet. Encryption protects secrets at rest, but it does not make the system non-custodial.

## Architecture

The server reads one `SOLANA_MASTER_MNEMONIC` from its secret manager. For each user, an atomic MongoDB counter reserves the next index. The index is inserted into `m/44'/501'/{walletIndex}'/0'`, producing a unique Solana keypair. The secret key is encrypted with AES-256-GCM using `WALLET_ENCRYPTION_KEY`; only the address and index leave the server.

The counter increments atomically, so concurrent registrations cannot receive the same index. Wallet provisioning first checks for an existing wallet and uses a conditional write when assigning a new one. If derivation or encryption fails, the user remains retryable and no second wallet is assigned on a later retry. A reserved index may be skipped, which is acceptable and safer than reusing it.

Deposits are matched to wallet addresses and transaction signatures. The signature unique index prevents duplicate crediting. The default strategy is `finalized`, which is slower but has stronger settlement guarantees than `confirmed`; `confirmed` is faster but has a greater reorganization risk.

## Secret and compromise model

The master mnemonic can regenerate every wallet and is therefore the highest-impact secret. The encryption key can decrypt stored wallet keys. MongoDB access can expose addresses, encrypted secrets, and user mappings; a database-only compromise still requires the encryption key, but an application host compromise can expose both. Backups must protect database dumps, environment values, logs, and deployment artifacts together.

Production should keep the mnemonic and encryption key in a KMS, HSM, or dedicated secret manager with rotation and access auditing. They must never be logged, committed, returned by an API, or sent to the browser. Withdrawals must remain disabled until strong authorization, rate limits, balance checks, transaction simulation, audit logs, and admin/risk approval are operational.