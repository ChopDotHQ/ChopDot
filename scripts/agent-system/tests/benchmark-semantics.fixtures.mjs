const LAYER_ORDER = ['category-baseline', 'chopdot-differentiation', 'bounded-experiments'];

function clone(value) {
  return structuredClone(value);
}

function mutate(packet, update) {
  const copy = clone(packet);
  update(copy);
  return copy;
}

export function validProductDefinitionPacket(benchmarkDigest) {
  return {
    packet_type: 'ProductDefinitionPacketV1',
    benchmark_source_identity: {
      path: 'product/benchmark-baseline.md',
      sha256: benchmarkDigest,
    },
    layer_order: [...LAYER_ORDER],
    category_baseline_requirement_ids: ['BASE-GROUP-01'],
    category_baseline_dispositions: [
      {
        requirement_id: 'BASE-GROUP-01',
        treatment: 'must-exceed',
        applicability: 'applicable',
        disposition: 'covered',
        proof_plan: 'Run the production group-create, invite, return, and removal journey.',
      },
    ],
    benchmark_evidence_grades: [
      {
        requirement_id: 'BASE-GROUP-01',
        source_grade: 'E1-public-source',
        claimed_grade: 'E1-public-source',
        observed_at: '2026-06-23',
        evidence_refs: ['product/benchmark-baseline.md#5-stable-baseline-requirements'],
      },
    ],
    chopdot_differentiators: [
      {
        id: 'DIFF-INTENTIONAL-MEMBERSHIP',
        outcome: 'A person joins intentionally without contact proof becoming membership authority.',
        baseline_requirement_ids: ['BASE-GROUP-01'],
      },
    ],
    experiment_hypotheses: [
      {
        id: 'EXP-INVITE-COPY',
        hypothesis: 'Shorter invitation copy improves completion without hiding authority.',
        falsifier: 'Participants cannot explain whether accepting the invitation makes them a member.',
        baseline_fallback: {
          requirement_ids: ['BASE-GROUP-01'],
          description: 'Use the accepted explicit invitation and membership copy.',
        },
      },
    ],
    user_state: 'A first-time participant has no shared group.',
    one_next_action: 'Create my group',
    action_scope: {
      actor: 'first-time participant',
      state: 'no shared group',
      route: 'home',
      universal: false,
    },
  };
}

export function validUxJourneyPacket() {
  return {
    packet_type: 'UxJourneyPacketV1',
    layer_order: [...LAYER_ORDER],
    benchmark_requirement_ids: ['BASE-ACCESS-01'],
    baseline_dispositions: [
      {
        requirement_id: 'BASE-ACCESS-01',
        treatment: 'must-exceed',
        applicability: 'applicable',
        disposition: 'covered',
        proof_plan: 'Complete the journey through the production entrypoint at declared viewports.',
      },
    ],
    benchmark_evidence_states: [
      {
        requirement_id: 'BASE-ACCESS-01',
        source_grade: 'E1-public-source',
        claimed_grade: 'E1-public-source',
        observed_at: '2026-06-23',
        evidence_refs: ['product/benchmark-baseline.md#5-stable-baseline-requirements'],
      },
    ],
    chopdot_differentiated_outcome: {
      id: 'DIFF-PLAIN-AUTHORITY',
      outcome: 'The participant completes the action without infrastructure coaching.',
      baseline_requirement_ids: ['BASE-ACCESS-01'],
    },
    bounded_experiments: [
      {
        id: 'EXP-CONTEXTUAL-HINT',
        hypothesis: 'A state-specific hint reduces hesitation without becoming permanent explanation.',
        falsifier: 'Independent participants still ask what the primary action does.',
        baseline_fallback_id: 'FALLBACK-PLAIN-ACTION',
      },
    ],
    baseline_fallbacks: [
      {
        id: 'FALLBACK-PLAIN-ACTION',
        requirement_ids: ['BASE-ACCESS-01'],
        description: 'Render the accepted plain action and recovery copy without the experiment.',
      },
    ],
    user_state: 'A participant has one pending invitation.',
    one_next_action: 'Review invitation',
    action_scope: {
      actor: 'invited participant',
      state: 'one pending invitation',
      route: 'invitation',
      universal: false,
    },
  };
}

export function adversarialProductDefinitionPackets(benchmarkDigest) {
  const valid = validProductDefinitionPacket(benchmarkDigest);
  return [
    {
      id: 'missing-baseline-ids',
      expected_code: 'baseline_requirements_missing',
      packet: mutate(valid, (packet) => { packet.category_baseline_requirement_ids = []; }),
    },
    {
      id: 'unknown-baseline-id',
      expected_code: 'unknown_baseline_requirement',
      packet: mutate(valid, (packet) => { packet.category_baseline_requirement_ids = ['BASE-UNKNOWN-01']; }),
    },
    {
      id: 'missing-disposition',
      expected_code: 'baseline_disposition_missing',
      packet: mutate(valid, (packet) => { packet.category_baseline_dispositions = []; }),
    },
    {
      id: 'unresolved-applicability',
      expected_code: 'baseline_applicability_unresolved',
      packet: mutate(valid, (packet) => { packet.category_baseline_dispositions[0].applicability = 'unresolved'; }),
    },
    {
      id: 'unresolved-disposition',
      expected_code: 'baseline_disposition_unresolved',
      packet: mutate(valid, (packet) => { packet.category_baseline_dispositions[0].disposition = 'unresolved'; }),
    },
    {
      id: 'e1-upgraded-to-e2',
      expected_code: 'benchmark_evidence_overclaim',
      packet: mutate(valid, (packet) => { packet.benchmark_evidence_grades[0].claimed_grade = 'E2-hands-on'; }),
    },
    {
      id: 'missing-differentiator',
      expected_code: 'differentiator_missing',
      packet: mutate(valid, (packet) => { packet.chopdot_differentiators = []; }),
    },
    {
      id: 'experiment-missing-hypothesis',
      expected_code: 'experiment_hypothesis_missing',
      packet: mutate(valid, (packet) => { delete packet.experiment_hypotheses[0].hypothesis; }),
    },
    {
      id: 'experiment-missing-falsifier',
      expected_code: 'experiment_falsifier_missing',
      packet: mutate(valid, (packet) => { delete packet.experiment_hypotheses[0].falsifier; }),
    },
    {
      id: 'experiment-missing-fallback',
      expected_code: 'experiment_baseline_fallback_missing',
      packet: mutate(valid, (packet) => { delete packet.experiment_hypotheses[0].baseline_fallback; }),
    },
    {
      id: 'actorless-action-scope',
      expected_code: 'action_scope_actor_missing',
      packet: mutate(valid, (packet) => { delete packet.action_scope.actor; }),
    },
    {
      id: 'universal-action-scope',
      expected_code: 'action_scope_universal',
      packet: mutate(valid, (packet) => { packet.action_scope.universal = true; }),
    },
    {
      id: 'universal-action-scope-standalone-actor',
      expected_code: 'action_scope_universal',
      packet: mutate(valid, (packet) => { packet.action_scope.actor = 'everyone'; }),
    },
    {
      id: 'wrong-layer-order',
      expected_code: 'layer_order_invalid',
      packet: mutate(valid, (packet) => { packet.layer_order = ['chopdot-differentiation', 'category-baseline', 'bounded-experiments']; }),
    },
  ];
}

export function adversarialUxJourneyPackets() {
  const valid = validUxJourneyPacket();
  return [
    {
      id: 'missing-baseline-ids',
      expected_code: 'baseline_requirements_missing',
      packet: mutate(valid, (packet) => { delete packet.benchmark_requirement_ids; }),
    },
    {
      id: 'unknown-baseline-id',
      expected_code: 'unknown_baseline_requirement',
      packet: mutate(valid, (packet) => { packet.benchmark_requirement_ids = ['MODE-UNKNOWN-01']; }),
    },
    {
      id: 'missing-disposition',
      expected_code: 'baseline_disposition_missing',
      packet: mutate(valid, (packet) => { packet.baseline_dispositions = []; }),
    },
    {
      id: 'unresolved-applicability',
      expected_code: 'baseline_applicability_unresolved',
      packet: mutate(valid, (packet) => { packet.baseline_dispositions[0].applicability = 'unresolved'; }),
    },
    {
      id: 'e0-upgraded-to-e3',
      expected_code: 'benchmark_evidence_overclaim',
      packet: mutate(valid, (packet) => {
        packet.benchmark_requirement_ids = ['MODE-SAVINGS-01'];
        packet.baseline_dispositions = [{
          requirement_id: 'MODE-SAVINGS-01', treatment: 'mode-baseline', applicability: 'applicable',
          disposition: 'covered', proof_plan: 'Prove the complete production savings-circle journey.',
        }];
        packet.benchmark_evidence_states = [{
          requirement_id: 'MODE-SAVINGS-01', source_grade: 'E0-discovery', claimed_grade: 'E3-chopdot-proof',
          observed_at: '2026-06-23', evidence_refs: ['product/benchmark-baseline.md'],
        }];
        packet.chopdot_differentiated_outcome.baseline_requirement_ids = ['MODE-SAVINGS-01'];
        packet.baseline_fallbacks[0].requirement_ids = ['MODE-SAVINGS-01'];
      }),
    },
    {
      id: 'missing-named-differentiator',
      expected_code: 'differentiator_missing',
      packet: mutate(valid, (packet) => { packet.chopdot_differentiated_outcome = 'Trustworthy'; }),
    },
    {
      id: 'experiment-missing-linked-fallback',
      expected_code: 'experiment_baseline_fallback_missing',
      packet: mutate(valid, (packet) => { packet.baseline_fallbacks = []; }),
    },
    {
      id: 'actorless-action-scope',
      expected_code: 'action_scope_actor_missing',
      packet: mutate(valid, (packet) => { packet.action_scope.actor = ''; }),
    },
    {
      id: 'universal-action-scope-by-actor',
      expected_code: 'action_scope_universal',
      packet: mutate(valid, (packet) => { packet.action_scope.actor = 'every ChopDot user'; }),
    },
    {
      id: 'universal-action-scope-standalone-actor',
      expected_code: 'action_scope_universal',
      packet: mutate(valid, (packet) => { packet.action_scope.actor = 'everyone'; }),
    },
    {
      id: 'wrong-layer-order',
      expected_code: 'layer_order_invalid',
      packet: mutate(valid, (packet) => { packet.layer_order.reverse(); }),
    },
  ];
}
