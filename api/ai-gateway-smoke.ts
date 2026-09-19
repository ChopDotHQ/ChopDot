import { generateText } from 'ai';

export default {
  async fetch() {
    try {
      const { text } = await generateText({
        model: 'openai/gpt-5.5',
        prompt: 'Invent a new holiday and describe its traditions.',
      });

      return Response.json({ ok: true, text });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  },
};
