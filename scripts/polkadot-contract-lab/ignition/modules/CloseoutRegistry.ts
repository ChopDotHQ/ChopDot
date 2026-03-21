import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CloseoutRegistryModule = buildModule("CloseoutRegistryModule", (m) => {
  const closeoutRegistry = m.contract("CloseoutRegistry", []);

  return { closeoutRegistry };
});

export default CloseoutRegistryModule;
