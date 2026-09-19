import { experimental_evaluate as evaluate, gateway } from 'ai';

export async function runJevSmokeTest() {
  const result = await evaluate({
    model: gateway.evaluationModel('typesafe-ai/jev'),
    state: {
      message: 'The support agent issued a full refund to the customer.',
    },
    questions: {
      refunded: {
        type: 'boolean',
        instructions: 'Was a refund issued?',
      },
    },
    providerOptions: {
      gateway: {
        zeroDataRetention: true,
      },
    },
  });

  const answer = result.answers.refunded;

  if (!answer || answer.type !== 'boolean') {
    throw new Error('Jev did not return the expected boolean answer');
  }

  console.log(
    JSON.stringify({
      model: result.response.modelId,
      answer,
      usage: result.usage,
    }),
  );

  return result;
}

await runJevSmokeTest();
