import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ChopDotEscrowVaultModule = buildModule("ChopDotEscrowVaultModule", (m) => {
  const escrowVault = m.contract("ChopDotEscrowVault", []);

  return { escrowVault };
});

export default ChopDotEscrowVaultModule;
