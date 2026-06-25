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

const files = [
  'src/components/capture/CapturePotHomeSection.tsx',
  'src/components/screens/CaptureHandoffScreen.tsx',
  'src/components/screens/CaptureConfirmScreen.tsx',
  'src/components/screens/SpendCardScreen.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    // Replace the entire block from `const {` to `} = useChapterState(...)`
    content = content.replace(/const\s+\{([^}]*)\}\s*=\s*useChapterState\([^)]*\);/g, mockUseChapterState);
    fs.writeFileSync(file, content);
  }
}
