import { experimental_evaluate as evaluate, gateway } from 'ai';

type Suggestion =
  | 'CREATE_GROUP'
  | 'ADD_PEOPLE'
  | 'ADD_EXPENSE'
  | 'OFFER_SHARE'
  | 'DO_NOT_PROMPT';

type TestCase = {
  id: string;
  note: string;
  expected: Suggestion[];
  state: Record<string, unknown>;
};

const criteria = {
  CREATE_GROUP: 'Suggest creating the first local group.',
  ADD_PEOPLE: 'Suggest adding people locally. Do not imply they must be invited yet.',
  ADD_EXPENSE: 'Suggest adding an expense to the current group.',
  OFFER_SHARE: 'Offer sharing as an optional next step. Do not force account creation.',
  DO_NOT_PROMPT: 'Do not interrupt with another suggestion; let the user continue or resume their current work.',
} as const;

const cases: TestCase[] = [
  {
    id: '01-fresh-guest',
    note: 'Guest has no group yet.',
    expected: ['CREATE_GROUP'],
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
    id: '02-group-created-only-self',
    note: 'Just created a group; only the guest is in it.',
    expected: ['ADD_PEOPLE', 'ADD_EXPENSE'],
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
    id: '03-people-added-no-expense',
    note: 'Local people have been added, but there is no expense yet.',
    expected: ['ADD_EXPENSE'],
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
    id: '04-expense-added-only-self',
    note: 'One expense exists but nobody else has been added yet.',
    expected: ['ADD_PEOPLE'],
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 1,
      expenses_count: 1,
      account_exists: false,
      just_completed: 'add_expense',
      share_prompt_dismissed_recently: false,
    },
  },
  {
    id: '05-expense-just-finished',
    note: 'Three people and two expenses; user just finished adding an expense.',
    expected: ['DO_NOT_PROMPT'],
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 3,
      expenses_count: 2,
      account_exists: false,
      just_completed: 'add_expense',
      share_prompt_dismissed_recently: false,
    },
  },
  {
    id: '06-established-local-group',
    note: 'Three people and four expenses; sharing has never been offered.',
    expected: ['OFFER_SHARE', 'DO_NOT_PROMPT'],
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
    id: '07-share-dismissed-two-minutes-ago',
    note: 'Same mature local group, but user just said Not now to sharing.',
    expected: ['DO_NOT_PROMPT'],
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
    id: '08-reload-after-dismissal',
    note: 'Local work survived reload; user recently dismissed sharing.',
    expected: ['DO_NOT_PROMPT'],
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
    id: '09-return-after-seven-days',
    note: 'Mature local group after a week; no recent dismissal.',
    expected: ['OFFER_SHARE', 'DO_NOT_PROMPT'],
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
    id: '10-account-converted-work-preserved',
    note: 'User created an account and the same local group/work is preserved.',
    expected: ['DO_NOT_PROMPT', 'OFFER_SHARE'],
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
  {
    id: '11-many-expenses-no-share-intent',
    note: 'Busy local group, but user is actively continuing expense entry and has shown no sharing intent.',
    expected: ['DO_NOT_PROMPT', 'ADD_EXPENSE'],
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 4,
      expenses_count: 8,
      account_exists: false,
      just_completed: 'resume_expense_entry',
      share_prompt_dismissed_recently: false,
      explicit_share_intent: false,
    },
  },
  {
    id: '12-person-just-added',
    note: 'User just added a local person; next useful task is usually the first expense.',
    expected: ['ADD_EXPENSE'],
    state: {
      mode: 'guest-local',
      group_exists: true,
      people_count: 2,
      expenses_count: 0,
      account_exists: false,
      just_completed: 'add_people_locally',
      share_prompt_dismissed_recently: false,
    },
  },
];

const sharedState = {
  product: 'ChopDot',
  principles: {
    local_first: true,
    account_not_required_for_local_work: true,
    local_people_are_not_invited_until_share: true,
    share_is_optional: true,
    respect_recent_dismissals: true,
  },
  cases: Object.fromEntries(cases.map((testCase) => [testCase.id, testCase.state])),
};

const questions = Object.fromEntries(
  cases.map((testCase) => [
    testCase.id,
    {
      type: 'choice' as const,
      instructions:
        `For case "${testCase.id}" only, choose the single best secondary UX suggestion. Read that case from state.cases["${testCase.id}"]. Preserve ChopDot's local-first behavior. Do not force account creation, do not treat locally added people as already invited, respect recent dismissal of sharing, and avoid nagging immediately after the user completes an action.`,
      criteria,
    },
  ]),
);

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
      // One Jev request, twelve parallel typed questions.
      const result = await evaluate({
        model: gateway.evaluationModel('typesafe-ai/jev'),
        state: sharedState,
        questions,
        maxRetries: 0,
      });

      const results = cases.map((testCase) => {
        const answer = result.answers[testCase.id];
        const choice =
          answer && answer.type === 'choice'
            ? (answer.choice as Suggestion)
            : null;

        return {
          id: testCase.id,
          note: testCase.note,
          expected: testCase.expected,
          choice,
          match: choice ? testCase.expected.includes(choice) : false,
          probabilities:
            answer && answer.type === 'choice' ? answer.probabilities : null,
        };
      });

      const payload = {
        testedAt: new Date().toISOString(),
        modelRequested: 'typesafe-ai/jev',
        modelReturned: result.response.modelId,
        requestCount: 1,
        questionCount: results.length,
        matched: results.filter((item) => item.match).length,
        usage: result.usage,
        results,
      };

      console.log('JEV_CHOPDOT_BATTERY_SUMMARY ' + JSON.stringify({ testedAt: payload.testedAt, modelRequested: payload.modelRequested, modelReturned: payload.modelReturned, requestCount: payload.requestCount, questionCount: payload.questionCount, matched: payload.matched, usage: payload.usage }));
      for (const item of results) console.log('JEV_CHOPDOT_CASE ' + JSON.stringify(item));

      const rows = results.map((item) => `
        <tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.note)}</td>
          <td><code>${escapeHtml(item.choice ?? 'NO_ANSWER')}</code></td>
          <td>${item.match ? '✅' : '❌'}</td>
          <td><code>${escapeHtml(item.expected.join(' / '))}</code></td>
        </tr>`
      ).join('');

      return new Response(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Jev × ChopDot</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;background:#fafafa;color:#111}
    main{max-width:980px;margin:auto}
    h1{font-size:24px;margin:0 0 8px}
    p{color:#555}
    .score{font-size:20px;font-weight:700;margin:18px 0}
    .meta{font-size:13px;color:#666;margin-bottom:18px}
    .wrap{overflow:auto;background:#fff;border:1px solid #ddd;border-radius:14px}
    table{border-collapse:collapse;width:100%;min-width:780px}
    th,td{text-align:left;padding:12px;border-bottom:1px solid #eee;vertical-align:top;font-size:13px}
    th{background:#f5f5f5}
    code{font-size:12px}
  </style>
</head>
<body>
<main>
  <h1>Human Jev vs AI Jev — ChopDot #001</h1>
  <p>12 ChopDot journey states evaluated as 12 parallel typed questions in one real Jev request.</p>
  <div class="score">${payload.matched} / ${payload.questionCount} matched the product expectations</div>
  <div class="meta">Model: ${escapeHtml(payload.modelReturned)} · Gateway requests: 1 · Input tokens: ${escapeHtml(payload.usage?.inputTokens ?? '?')}</div>
  <div class="wrap">
    <table>
      <thead><tr><th>Case</th><th>State</th><th>Jev</th><th></th><th>Expected</th></tr></thead>
      <tbody>${rows}</tbody>
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
      console.error('JEV_CHOPDOT_ERROR ' + message);

      return new Response(`<!doctype html><html><body style="font-family:system-ui;padding:24px"><h1>Jev test did not run</h1><pre style="white-space:pre-wrap">${escapeHtml(message)}</pre></body></html>`, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  },
};
