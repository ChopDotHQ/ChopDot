import { inventHoliday } from '../index.ts';

export default {
  async fetch() {
    try {
      const text = await inventHoliday();
      return Response.json({ ok: true, text });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  },
};
