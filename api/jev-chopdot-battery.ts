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

export const config = { maxDuration: 60 };

export default {
  async fetch() {
    const results = [];

    for (const testCase of cases) {
      const result = await evaluate({
        model: gateway.evaluationModel('typesafe-ai/jev'),
        state: testCase.state,
        questions: {
          next_suggestion: {
            type: 'choice',
            instructions:
              'Choose the single best secondary UX suggestion for ChopDot right now. ChopDot is local-first: local work should stay usable without an account, adding people locally does not invite them, and sharing is optional. Never turn an optional share suggestion into a forced account prompt. Respect a recent dismissal and avoid nagging immediately after the user completes an action.',
            criteria,
          },
        },
      });

      const answer = result.answers.next_suggestion;
      const choice =
        answer && answer.type === 'choice'
          ? (answer.choice as Suggestion)
          : null;

      results.push({
        id: testCase.id,
        note: testCase.note,
        expected: testCase.expected,
        choice,
        match: choice ? testCase.expected.includes(choice) : false,
        probabilities:
          answer && answer.type === 'choice' ? answer.probabilities : null,
        model: result.response.modelId,
        usage: result.usage,
      });
    }

    const payload = {
      testedAt: new Date().toISOString(),
      modelRequested: 'typesafe-ai/jev',
      cases: results.length,
      matched: results.filter((result) => result.match).length,
      results,
    };

    console.log('JEV_CHOPDOT_BATTERY ' + JSON.stringify(payload));

    return Response.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
};
