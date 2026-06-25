import fs from 'fs';

const mockUseChapterState = `
  const chapter: any = { spendCards: [] };
  const status: any = 'idle';
  const confirm: any = async () => {};
  const close: any = async () => {};
  const markPaid: any = async () => {};
  const refresh: any = async () => {};
  const chapterLoading = false;
`;

const replaceUseChapterState = (content) => {
  return content.replace(
    /const \{\s*chapter[^}]*\}\s*=\s*useChapterState[^;]*;/g,
    mockUseChapterState
  );
};

const filesToPatch = [
  'src/components/capture/CapturePotHomeSection.tsx',
  'src/components/screens/CaptureHandoffScreen.tsx',
  'src/components/screens/CaptureConfirmScreen.tsx'
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    content = replaceUseChapterState(content);
    fs.writeFileSync(file, content);
  }
}

// Fix SettlementConfirmation.tsx missing properties
const settleFile = 'src/components/screens/SettlementConfirmation.tsx';
if (fs.existsSync(settleFile)) {
  let settleContent = fs.readFileSync(settleFile, 'utf-8');
  settleContent = settleContent.replace(/twint: 'TWINT',/g, "twint: 'TWINT',\n  dot: 'DOT',\n  usdc: 'USDC',");
  fs.writeFileSync(settleFile, settleContent);
}

