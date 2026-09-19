import { experimental_evaluate as evaluate, gateway } from 'ai';

const result = await evaluate({
  model: gateway.evaluationModel('typesafe-ai/jev'),
  state: {
    mode: 'guest-local',
    group_exists: true,
    people_count: 3,
    expenses_count: 2,
    has_shared: false,
    account_exists: false,
    user_action: 'finished_adding_expense',
  },
  questions: {
    next_action: {
      type: 'choice',
      instructions: 'Choose the single best next UX action. Preserve local-first behavior. Do not force account creation unless sharing or inviting requires it.',
      criteria: {
        CREATE_GROUP: 'Create a group because none exists yet',
        ADD_EXPENSE: 'Encourage adding an expense',
        ADD_PEOPLE: 'Encourage adding local people without inviting yet',
        KEEP_LOCAL: 'Let the user continue locally with no account prompt',
        OFFER_SHARE: 'Offer sharing as an optional next step',
        REQUIRE_ACCOUNT: 'Require account creation because the requested action crosses the sharing/account boundary',
      },
    },
  },
});

const payload = Buffer.from(JSON.stringify({
  model: result.response.modelId,
  answer: result.answers.next_action,
  usage: result.usage,
}), 'utf8').toString('base64url');

throw new Error('JEV_RESULT_' + payload);
