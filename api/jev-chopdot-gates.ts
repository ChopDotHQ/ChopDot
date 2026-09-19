import { experimental_evaluate as evaluate, gateway } from 'ai';

type Gate = 'create_group' | 'add_people' | 'add_expense' | 'offer_share';

type TestCase = {
  id: string;
  label: string;
  state: Record<string, unknown>;
};

const cases: TestCase[] = [
  {
    id: '01-fresh-guest',
    label: 'Fresh guest, no group',
    state: {
      mode: 'guest-local',
      group_exists: false,
      people_count: 1,
      expenses_count: 0,
      account_exists: false,
      just_completed: 'continue_as_guest',
      share_prompt_dismissed_recently: false,
    },
  },
  {
    id: '02-group-only-self',
    label: 'Group created, only self',
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 1,
      expenses_count: 0,
      account_exists: false,
      just_completed: 'create_group',
      share_prompt_dismissed_recently: false,
    },
  },
  {
    id: '03-people-no-expense',
    label: 'People added, no expense',
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 0,
      account_exists: false,
      just_completed: 'add_people_locally',
      share_prompt_dismissed_recently: false,
    },
  },
  {
    id: '04-mature-local',
    label: 'Mature local group',
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      just_completed: 'resume_group',
      share_prompt_dismissed_recently: false,
      share_prompt_ever_shown: false,
    },
  },
  {
    id: '05-just-dismissed-share',
    label: 'User just said Not now to sharing',
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      just_completed: 'dismiss_share_prompt',
      share_prompt_dismissed_recently: true,
      minutes_since_share_dismissal: 2,
    },
  },
  {
    id: '06-reload-after-dismissal',
    label: 'Reload 8 minutes after dismissing sharing',
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      just_completed: 'reload',
      local_work_restored: true,
      share_prompt_dismissed_recently: true,
      minutes_since_share_dismissal: 8,
    },
  },
  {
    id: '07-return-week-later',
    label: 'Returns one week later',
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: false,
      just_completed: 'resume_group',
      local_work_restored: true,
      share_prompt_dismissed_recently: false,
      days_since_last_activity: 7,
    },
  },
  {
    id: '08-account-converted',
    label: 'Account created, local work preserved',
    state: {
      mode: 'account',
      group_exists: true,
      people_count: 3,
      expenses_count: 4,
      account_exists: true,
      just_completed: 'account_conversion',
      local_work_restored: true,
      already_shared: false,
    },
  },
];

const gateInstructions: Record<Gate, string> = {
  create_group:
    'Should ChopDot proactively surface a suggestion to create a group right now? Answer true only if this is timely and useful in this exact state.',
  add_people:
    'Should ChopDot proactively surface a suggestion to add people locally right now? Adding people locally does not invite them. Answer true only if this is timely and useful in this exact state.',
  add_expense:
    'Should ChopDot proactively surface a suggestion to add an expense right now? Answer true only if this is timely and useful in this exact state.',
  offer_share:
    'Should ChopDot proactively surface an optional suggestion to share right now? Sharing is optional and may lead to an account boundary. Respect recent dismissal and avoid nagging.',
};

const sharedState = {
  product: 'ChopDot',
  principles: {
    local_first: true,
    account_not_required_for_local_work: true,
    local_people_are_not_invited_until_share: true,
    share_is_optional: true,
    respect_recent_dismissals: true,
    avoid_nagging_after_completed_actions: true,
  },
  cases: Object.fromEntries(cases.map((testCase) => [testCase.id, testCase.state])),
};

const gates: Gate[] = ['create_group', 'add_people', 'add_expense', 'offer_share'];

const questions = Object.fromEntries(
  cases.flatMap((testCase) =>
    gates.map((gate) => [
      `${testCase.id}__${gate}`,
      {
        type: 'boolean' as const,
        instructions:
          `Evaluate case "${testCase.id}" only, using state.cases["${testCase.id}"]. ${gateInstructions[gate]}`,
        criteria: {
          true: 'Surface this suggestion now.',
          false: 'Do not surface this suggestion now.',
        },
      },
    ]),
  ),
);

function band(p: number) {
  if (p >= 0.75) return 'PROMINENT';
  if (p >= 0.5) return 'SUBTLE';
  return 'HIDDEN';
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

      const rows = cases.map((testCase) => {
        const probabilities = Object.fromEntries(
          gates.map((gate) => {
            const answer = result.answers[`${testCase.id}__${gate}`];
            const probability =
              answer && answer.type === 'boolean' ? answer.probability : null;

            return [
              gate,
              probability == null
                ? null
                : { probability, band: band(probability) },
            ];
          }),
        );

        return {
          id: testCase.id,
          label: testCase.label,
          probabilities,
        };
      });

      const payload = {
        testedAt: new Date().toISOString(),
        modelRequested: 'typesafe-ai/jev',
        modelReturned: result.response.modelId,
        requestCount: 1,
        questionCount: cases.length * gates.length,
        thresholds: {
          prominent: '>= 0.75',
          subtle: '>= 0.50 and < 0.75',
          hidden: '< 0.50',
        },
        usage: result.usage,
        rows,
      };

      console.log('JEV_CHOPDOT_GATES_SUMMARY ' + JSON.stringify({
        testedAt: payload.testedAt,
        modelRequested: payload.modelRequested,
        modelReturned: payload.modelReturned,
        requestCount: payload.requestCount,
        questionCount: payload.questionCount,
        usage: payload.usage,
      }));

      for (const row of rows) {
        console.log('JEV_CHOPDOT_GATE ' + JSON.stringify(row));
      }

      const tableRows = rows.map((row) => {
        const cells = gates.map((gate) => {
          const value = row.probabilities[gate] as null | { probability: number; band: string };
          if (!value) return '<td>—</td>';
          const pct = Math.round(value.probability * 100);
          return `<td><b>${pct}%</b><br/><span>${escapeHtml(value.band)}</span></td>`;
        }).join('');

        return `<tr><td><b>${escapeHtml(row.label)}</b><br/><code>${escapeHtml(row.id)}</code></td>${cells}</tr>`;
      }).join('');

      return new Response(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Jev × ChopDot #002</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;background:#fafafa;color:#111}
    main{max-width:1050px;margin:auto}
    h1{font-size:24px;margin:0 0 8px}
    p{color:#555;line-height:1.45}
    .meta{font-size:13px;color:#666;margin:14px 0 18px}
    .wrap{overflow:auto;background:#fff;border:1px solid #ddd;border-radius:14px}
    table{border-collapse:collapse;width:100%;min-width:840px}
    th,td{text-align:left;padding:13px;border-bottom:1px solid #eee;vertical-align:top;font-size:13px}
    th{background:#f5f5f5}
    td span{font-size:10px;color:#666}
    code{font-size:11px;color:#777}
  </style>
</head>
<body>
<main>
  <h1>Human Jev vs AI Jev — ChopDot #002</h1>
  <p>Instead of asking Jev to pick one action, each possible suggestion is independently judged as a Boolean probability: should ChopDot surface this right now?</p>
  <div class="meta">Model: ${escapeHtml(payload.modelReturned)} · 1 Gateway request · ${payload.questionCount} Boolean judgments · prominent ≥75% · subtle ≥50% · hidden &lt;50%</div>
  <div class="wrap">
    <table>
      <thead><tr><th>ChopDot state</th><th>Create group</th><th>Add people</th><th>Add expense</th><th>Offer share</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>
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
      console.error('JEV_CHOPDOT_GATES_ERROR ' + message);

      return new Response(`<!doctype html><html><body style="font-family:system-ui;padding:24px"><h1>Jev #002 did not run</h1><pre style="white-space:pre-wrap">${escapeHtml(message)}</pre></body></html>`, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  },
};
