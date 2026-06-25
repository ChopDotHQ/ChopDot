import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ChopDotMockUSDCModule = buildModule("ChopDotMockUSDCModule", (m) => {
  const name = m.getParameter("name", "ChopDot Mock USDC");
  const symbol = m.getParameter("symbol", "TEST_USDC");
  const decimals = m.getParameter("decimals", 6n);
  const mockUSDC = m.contract("ChopDotMockToken", [name, symbol, decimals]);

  return { mockUSDC };
});

export default ChopDotMockUSDCModule;
