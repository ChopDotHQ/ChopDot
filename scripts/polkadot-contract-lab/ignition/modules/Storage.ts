import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StorageModule = buildModule("StorageModule", (m) => {
  const initialValue = m.getParameter("initialValue", 7n);
  const storage = m.contract("Storage", [initialValue]);

  return { storage };
});

export default StorageModule;
