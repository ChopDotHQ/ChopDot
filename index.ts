import { generateText } from 'ai';

export async function inventHoliday() {
  const { text } = await generateText({
    model: 'openai/gpt-5.5',
    prompt: 'Invent a new holiday and describe its traditions.',
  });

  return text;
}

const isDirectRun = process.argv[1]?.endsWith('index.ts');

if (isDirectRun) {
  const text = await inventHoliday();
  console.log(text);
}
