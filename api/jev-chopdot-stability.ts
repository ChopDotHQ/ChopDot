import { experimental_evaluate as evaluate, gateway } from 'ai';

type CaseDef = {
  id: string;
  label: string;
  state: Record<string, unknown>;
  repeats?: number;
  family: 'stability' | 'dismissal-time' | 'expense-count' | 'people-count' | 'return-time';
};

const cases: CaseDef[] = [
  // Stability: identical state repeated independently 5x.
  {
    id: 'stable-mature',
    label: 'Mature local group, no recent dismissal',
    family: 'stability',
    repeats: 5,
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      last_action: 'resume_group',
      share_prompt_ever_shown: false,
      last_share_response: null,
      days_since_last_activity: 0,
    },
  },
  {
    id: 'stable-dismissed',
    label: 'Same group, sharing dismissed 2 minutes ago',
    family: 'stability',
    repeats: 5,
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      last_action: 'dismiss_share_prompt',
      last_share_response: 'not_now',
      minutes_since_share_dismissal: 2,
      days_since_last_activity: 0,
    },
  },

  // One-variable sweeps.
  ...[2, 10, 30, 120, 1440, 4320, 10080].map((minutes) => ({
    id: `dismiss-${minutes}m`,
    label: `Dismissed share ${minutes} minutes ago`,
    family: 'dismissal-time' as const,
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      last_action: 'resume_group',
      last_share_response: 'not_now',
      minutes_since_share_dismissal: minutes,
      days_since_last_activity: 0,
    },
  })),

  ...[1, 2, 4, 8, 12].map((expenses) => ({
    id: `expenses-${expenses}`,
    label: `${expenses} expense${expenses === 1 ? '' : 's'}`,
    family: 'expense-count' as const,
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: expenses,
      account_exists: false,
      last_action: 'resume_group',
      last_share_response: null,
      days_since_last_activity: 0,
    },
  })),

  ...[1, 2, 3, 5, 8].map((people) => ({
    id: `people-${people}`,
    label: `${people} ${people === 1 ? 'person' : 'people'} in group`,
    family: 'people-count' as const,
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: people,
      expenses_count: 4,
      account_exists: false,
      last_action: 'resume_group',
      last_share_response: null,
      days_since_last_activity: 0,
    },
  })),

  ...[0, 1, 3, 7, 14].map((days) => ({
    id: `return-${days}d`,
    label: days === 0 ? 'Active today' : `Returns after ${days} day${days === 1 ? '' : 's'}`,
    family: 'return-time' as const,
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      last_action: 'resume_group',
      last_share_response: null,
      days_since_last_activity: days,
    },
  })),
];

const sharedState = {
  product: 'ChopDot',
  principle: 'Local-first. Sharing is optional. Never punish or nag a user for choosing Not now.',
  cases: Object.fromEntries(cases.map((c) => [c.id, c.state])),
};

const questions: Record<string, {
  type: 'boolean';
  instructions: string;
  criteria: { true: string; false: string };
}> = {};

for (const c of cases) {
  const repeats = c.repeats ?? 1;
  for (let i = 1; i <= repeats; i++) {
    const qid = repeats > 1 ? `${c.id}__r${i}` : c.id;
    questions[qid] = {
      type: 'boolean',
      instructions:
        `Evaluate state.cases["${c.id}"] only. Should ChopDot proactively surface an OPTIONAL suggestion to share right now? Sharing can lead to an account boundary, but local work remains fully usable without an account. Respect an earlier "Not now". Judge timing and usefulness, not whether sharing is technically possible.`,
      criteria: {
        true: 'Yes — surfacing a share suggestion now would be timely and useful.',
        false: 'No — do not surface a share suggestion now.',
      },
    };
  }
}

function stats(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, min, max, range: max - min, sd: Math.sqrt(variance) };
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const config = { maxDuration: 60 };

export default {
  async fetch() {
    try {
      const result = await evaluate({
        model: gateway.evaluationModel('typesafe-ai/jev'),
        state: sharedState,
        questions,
        maxRetries: 0,
      });

      const caseResults = cases.map((c) => {
        const repeats = c.repeats ?? 1;
        const values: number[] = [];
        for (let i = 1; i <= repeats; i++) {
          const qid = repeats > 1 ? `${c.id}__r${i}` : c.id;
          const answer = result.answers[qid];
          if (answer && answer.type === 'boolean') values.push(answer.probability);
        }
        return {
          id: c.id,
          label: c.label,
          family: c.family,
          values,
          ...stats(values),
        };
      });

      const payload = {
        testedAt: new Date().toISOString(),
        modelRequested: 'typesafe-ai/jev',
        modelReturned: result.response.modelId,
        requestCount: 1,
        questionCount: Object.keys(questions).length,
        usage: result.usage,
        results: caseResults,
      };

      console.log('JEV_CHOPDOT_003_SUMMARY ' + JSON.stringify({
        testedAt: payload.testedAt,
        modelRequested: payload.modelRequested,
        modelReturned: payload.modelReturned,
        requestCount: payload.requestCount,
        questionCount: payload.questionCount,
        usage: payload.usage,
      }));
      for (const item of caseResults) {
        console.log('JEV_CHOPDOT_003_CASE ' + JSON.stringify(item));
      }

      const stability = caseResults.filter((x) => x.family === 'stability');
      const families = ['dismissal-time', 'expense-count', 'people-count', 'return-time'] as const;

      const stabilityHtml = stability.map((x) => `
        <tr>
          <td>${escapeHtml(x.label)}</td>
          <td>${x.values.map(pct).join(' · ')}</td>
          <td><b>${pct(x.mean)}</b></td>
          <td>${pct(x.range)}</td>
          <td>${pct(x.sd)}</td>
        </tr>`
      ).join('');

      const sections = families.map((family) => {
        const rows = caseResults.filter((x) => x.family === family).map((x) => `
          <tr>
            <td>${escapeHtml(x.label)}</td>
            <td><b>${pct(x.mean)}</b></td>
          </tr>`
        ).join('');

        const title =
          family === 'dismissal-time' ? 'Time since user said “Not now”' :
          family === 'expense-count' ? 'Expense-count sensitivity' :
          family === 'people-count' ? 'People-count sensitivity' :
          'Return-time sensitivity';

        return `
          <section>
            <h2>${title}</h2>
            <div class="wrap"><table><thead><tr><th>Controlled state</th><th>P(show share)</th></tr></thead><tbody>${rows}</tbody></table></div>
          </section>`;
      }).join('');

      return new Response(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Jev × ChopDot #003</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;background:#fafafa;color:#111}
    main{max-width:980px;margin:auto}
    h1{font-size:24px;margin:0 0 8px}
    h2{font-size:17px;margin:28px 0 10px}
    p{color:#555;line-height:1.5}
    .meta{font-size:13px;color:#666;margin:14px 0 18px}
    .wrap{overflow:auto;background:#fff;border:1px solid #ddd;border-radius:14px}
    table{border-collapse:collapse;width:100%;min-width:620px}
    th,td{text-align:left;padding:12px;border-bottom:1px solid #eee;vertical-align:top;font-size:13px}
    th{background:#f5f5f5}
    code{font-size:11px;color:#777}
  </style>
</head>
<body>
<main>
  <h1>Human Jev vs AI Jev — ChopDot #003</h1>
  <p>Stability + sensitivity test for one question only: “Should ChopDot surface an optional share suggestion right now?”</p>
  <div class="meta">Model: ${escapeHtml(payload.modelReturned)} · 1 Gateway request · ${payload.questionCount} independent Boolean judgments · ${escapeHtml(payload.usage?.inputTokens ?? '?')} input tokens</div>

  <h2>Identical-state stability</h2>
  <div class="wrap">
    <table>
      <thead><tr><th>State</th><th>Five repeats</th><th>Mean</th><th>Range</th><th>SD</th></tr></thead>
      <tbody>${stabilityHtml}</tbody>
    </table>
  </div>

  ${sections}

  <p style="margin-top:26px;font-size:12px">This tests repeatability and directional sensitivity. True probability calibration would require labeled outcomes or observed user behavior.</p>
</main>
</body>
</html>`, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('JEV_CHOPDOT_003_ERROR ' + message);
      return new Response(`<!doctype html><html><body style="font-family:system-ui;padding:24px"><h1>Jev #003 did not run</h1><pre style="white-space:pre-wrap">${escapeHtml(message)}</pre></body></html>`, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  },
};
