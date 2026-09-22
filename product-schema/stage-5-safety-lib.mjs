
const clone=x=>structuredClone(x);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const uniq=a=>[...new Set(a||[])];
const sorted=a=>[...(a||[])].sort();

const REQUIRED_MANIFEST={
  identity:["identity.participant","identity.account","session.enter","participant.link_account","LAW-ID-01","LAW-ID-02","LAW-ID-03"],
  money:["money.money_v1","LAW-MONEY-01","LAW-SAV-01"],
  recovery_replay:["recovery.reconcile","recovery.safe_retry","LAW-OP-01","LAW-OP-02","LAW-OP-03","LAW-OP-04","LAW-HIST-01"],
  storage_restore:["storage.backup","storage.restore_operation","storage.create_backup","storage.restore","LAW-STORAGE-01"],
  authority:["payment_destination.create_update","payment_destination.remove","wallet.connect_switch","wallet.execute_action","LAW-AUTH-01","LAW-DEST-01","LAW-WALLET-01","LAW-ACCOUNT-01","LAW-SAV-02"],
  settlement:["payment.intent","payment.settlement_scope","position.position","position.scope","settlement.prepare","settlement.authorize","settlement.mark_sent","settlement.confirm_receipt","settlement.close","settlement.reconcile","LAW-POS-SCOPE-01","LAW-PAY-01","LAW-PAY-02","LAW-PAY-03","LAW-PAY-04","LAW-EXP-GUARD-01"],
  composition_continuity:["group.group","group.membership","group.rename_archive","group.transfer_ownership","group.leave","group.delete","LAW-GROUP-02","COMP-01","COMP-02","COMP-03","COMP-04","COMP-05","COMP-06"]
};

function law(core,id){return core.laws.find(x=>x.id===id);}
function obj(core,id){return core.objects.find(x=>x.id===id);}
function op(core,id){return core.operations.find(x=>x.id===id);}
function ctx(graph,id){return graph.contexts.find(x=>x.id===id);}
function comp(graph,id){return (graph.shared_composition_laws||[]).find(x=>x.id===id);}
function has(a,x){return Array.isArray(a)&&a.includes(x);}
function fail(errors,id,msg,extra={}){errors.push({id,msg,...extra});}
function check(errors,cond,id,msg,extra={}){if(!cond)fail(errors,id,msg,extra);}

function allSafetyNodes(core,graph){
  const out={};
  for(const x of [...core.objects,...core.operations,...core.laws,...(graph.shared_composition_laws||[])]){
    if(x.safety_class)(out[x.safety_class]??=[]).push(x.id);
  }
  for(const k of Object.keys(out))out[k].sort();
  return out;
}

export function validateIndependentSafety(core,graph,reconstruction,authority={}){
  const errors=[];
  const manifest=reconstruction.safety_class_manifest||{};
  for(const [domain,expected] of Object.entries(REQUIRED_MANIFEST)){
    check(errors,eq(sorted(manifest[domain]),sorted(expected)),"SAFETY-MANIFEST","wrong declared safety manifest",{domain});
  }
  for(const domain of Object.keys(manifest)){
    if(!REQUIRED_MANIFEST[domain])fail(errors,"SAFETY-MANIFEST","unknown safety domain",{domain});
  }
  const actual=allSafetyNodes(core,graph);
  for(const [domain,expected] of Object.entries(REQUIRED_MANIFEST)){
    check(errors,eq(actual[domain]||[],sorted(expected)),"SAFETY-TAGS","actual safety-classified set drifted",{domain,actual:actual[domain]||[]});
  }
  for(const domain of Object.keys(actual))if(!REQUIRED_MANIFEST[domain])fail(errors,"SAFETY-TAGS","undeclared safety domain",{domain});

  const c1i=authority.c1Identity||{};
  const c1s=authority.c1Spend||{};
  const j17=authority.j17Text||"";
  const j27=authority.j27Text||"";
  const j28=authority.j28Text||"";
  const j25=authority.j25Html||"";

  check(errors,c1i.identity_key==="participant_id","AUTHORITY-EVIDENCE","C1 identity key drifted");
  check(errors,Array.isArray(c1i.never_merge_on)&&c1i.never_merge_on.includes("display_name")&&c1i.never_merge_on.includes("email"),"AUTHORITY-EVIDENCE","C1 merge prohibition missing");
  check(errors,c1s.money_partition?.cross_partition_combination_allowed===false,"AUTHORITY-EVIDENCE","C1 money partition no longer forbids cross-partition combination");
  check(errors,j17.includes("Prepared, self-reported, submitted, waiting and unknown states do not change Available or goal progress."),"AUTHORITY-EVIDENCE","J17 no-optimistic-money evidence missing");
  check(errors,j28.includes("Reconcile before replacement retry"),"AUTHORITY-EVIDENCE","J28 recovery evidence missing");
  check(errors,j27.includes("Deletion is blocked while the user still owns a group or has unresolved money obligations"),"AUTHORITY-EVIDENCE","J27 deletion evidence missing");
  check(errors,j25.includes("Secrets / raw receiving details")||j25.includes("Secrets / executable authority"),"AUTHORITY-EVIDENCE","J25 secret-exclusion evidence missing");

  const participant=obj(core,"identity.participant");
  check(errors,!!participant&&eq(participant.identity,["group_id","participant_id"]),"ID-PARTICIPANT","Participant identity must be group_id + participant_id");
  const id1=law(core,"LAW-ID-01")?.constraint||{};
  check(errors,id1.participant_id_stable===true&&id1.account_link_replaces_participant===false&&id1.historical_reference_rewrite===false,"ID-STABILITY","account linking must preserve Participant and history");
  const id2=law(core,"LAW-ID-02")?.constraint||{};
  check(errors,eq(id2.prohibited_merge_keys,["display_name","email"])&&id2.collision_or_mismatch==="unresolved","ID-MERGE","display/email must not merge identity");
  const id3=law(core,"LAW-ID-03")?.constraint||{};
  check(errors,id3.group_visible_cross_group_stable_identifier===false&&id3.account_binding_may_be_private===true,"ID-PRIVACY","group-scoped unlinkability must hold");

  const money=obj(core,"money.money_v1");
  check(errors,!!money&&eq(money.identity,["minorUnits","currency","exponent"]),"MONEY-IDENTITY","MoneyV1 identity drifted");
  const ml=law(core,"LAW-MONEY-01")?.constraint||{};
  check(errors,ml.minor_units_integer===true&&eq(ml.partition_keys,["currency","exponent"])&&ml.cross_partition_combine===false&&ml.display_decimal_authority===false,"MONEY-LAW","exact money partition weakened");
  const sav1=law(core,"LAW-SAV-01")?.constraint||{};
  check(errors,sav1.self_report_increases_confirmed_available===false&&sav1.submitted_increases_confirmed_available===false&&sav1.waiting_increases_confirmed_available===false&&sav1.unknown_increases_confirmed_available===false,"SAVINGS-CONFIRMATION","unconfirmed savings must not increase confirmed Available");
  const sav2=law(core,"LAW-SAV-02")?.constraint||{};
  check(errors,sav2.participant_position_owned_by_participant===true&&sav2.group_controlled_withdrawal_requires_configured_rule===true&&sav2.fabricated_custody_allowed===false&&sav2.fabricated_confirmation_allowed===false,"SAVINGS-AUTHORITY","savings authority weakened");

  const op1=law(core,"LAW-OP-01")?.constraint||{};
  check(errors,op1.same_operation_identity_until_reconciliation===true&&["pending","unknown","partial","cancel_too_late"].every(x=>has(op1.states,x)),"RECOVERY-IDENTITY","possible-effect operation identity not preserved");
  const op2=law(core,"LAW-OP-02")?.constraint||{};
  check(errors,op2.replacement_retry_requires_proven_no_effect===true,"RECOVERY-RETRY","replacement retry must require proven no-effect");
  const op3=law(core,"LAW-OP-03")?.constraint||{};
  check(errors,op3.evidence_from_navigation===false&&["back","reload","route_change","time_alone"].every(x=>has(op3.prohibited_inference_sources,x)),"RECOVERY-NAV","navigation must not become evidence");
  const op4=law(core,"LAW-OP-04")?.constraint||{};
  check(errors,op4.stale_write_behavior==="refresh_and_rereview"&&op4.silent_overwrite===false,"RECOVERY-STALE","stale truth must refresh before write");
  const hist=law(core,"LAW-HIST-01")?.constraint||{};
  check(errors,hist.accepted_history_append_only===true&&hist.replay_external_effects===false&&hist.replay_role==="rebuild_projections","RECOVERY-REPLAY","replay must be side-effect free");

  const storage=law(core,"LAW-STORAGE-01")?.constraint||{};
  check(errors,storage.backup_distinct_from_working_copy===true&&storage.restore_preview_before_mutation===true&&storage.preserve_newer_truth===true&&storage.preserve_identity_ambiguity===true&&storage.secrets_excluded===true&&storage.executable_authority_excluded===true&&storage.unknown_outcome_requires_reconciliation===true,"STORAGE-LAW","backup/restore safety weakened");
  check(errors,op(core,"storage.restore")?.owner==="storage.restore_operation","STORAGE-OWNER","restore owner drifted");
  check(errors,["group.group","group.membership"].every(x=>has(op(core,"storage.restore")?.changes,x)),"STORAGE-EFFECT","restore must explicitly affect restored group/membership state");

  const auth=law(core,"LAW-AUTH-01")?.constraint||{};
  check(errors,auth.presentation_preference_creates_authority===false,"AUTH-PREFERENCE","presentation/preferences cannot create authority");
  const dest=law(core,"LAW-DEST-01")?.constraint||{};
  check(errors,dest.sharing_confirms_payment===false&&dest.copying_confirms_payment===false&&dest.expiry_confirms_payment===false&&dest.stopping_confirms_payment===false,"AUTH-DESTINATION","receiving disclosure must not confirm payment");
  const wallet=law(core,"LAW-WALLET-01")?.constraint||{};
  check(errors,wallet.wallet_can_widen_scope===false&&["amount","asset","recipient","source","permission"].every(x=>has(wallet.required_upstream_scope,x)),"AUTH-WALLET","wallet must not widen product authority");
  const account=law(core,"LAW-ACCOUNT-01")?.constraint||{};
  check(errors,account.blocked_by_active_group_ownership===true&&account.blocked_by_unresolved_money===true&&account.routes_to_owning_journeys===true&&account.global_erasure_claim===false,"AUTH-ACCOUNT-DELETE","account deletion boundary weakened");

  const pos=obj(core,"position.scope");
  check(errors,!!pos&&eq(pos.identity,["scope_kind","scope_ref"])&&eq(pos.allowed_scope_kinds,["participant_pair","group"]),"POSITION-SCOPE","PositionScope must be typed participant_pair/group");
  const position=obj(core,"position.position");
  check(errors,position?.scope_object==="position.scope"&&Array.isArray(position.references)&&position.references.some(x=>x.field==="position_scope"&&x.object==="position.scope"&&x.required===true),"POSITION-REFERENCE","Position must carry typed PositionScope reference");
  const posl=law(core,"LAW-POS-SCOPE-01")?.constraint||{};
  check(errors,eq(posl.allowed_scope_kinds,["participant_pair","group"])&&posl.settlement_required_scope_kind==="participant_pair","POSITION-SETTLEMENT","settlement must consume participant-pair PositionScope");
  const prepare=op(core,"settlement.prepare");
  check(errors,has(prepare?.law_refs,"LAW-POS-SCOPE-01")&&["position.scope","position.position","payment.settlement_scope"].every(x=>has(prepare?.reads,x)),"POSITION-PREPARE","settlement.prepare must read typed pair scope");
  for(const cid of ["ctx.settlement","ctx.expense_guard"]){
    const c=ctx(graph,cid);
    check(errors,has(c?.objects,"position.scope")&&has(c?.laws,"LAW-POS-SCOPE-01"),"POSITION-CONTEXT","settlement consumer missing PositionScope law",{context:cid});
  }

  const pay1=law(core,"LAW-PAY-01")?.constraint||{};
  check(errors,pay1.frozen_before_authorization===true&&pay1.exact_source_lineage===true&&pay1.one_currency===true&&pay1.one_payer_recipient_pair===true&&pay1.retroactive_expansion===false,"SETTLEMENT-SCOPE","settlement scope weakened");
  const pay2=law(core,"LAW-PAY-02")?.constraint||{};
  check(errors,pay2.payer_sent_confirms_receipt===false&&pay2.partial_equals_closed===false&&pay2.unknown_equals_failed===false&&["sent","submitted","received","confirmed","closed","unknown","partial","reversed"].every(x=>has(pay2.distinct_states,x)),"SETTLEMENT-LIFECYCLE","payment lifecycle collapsed");
  const pay3=law(core,"LAW-PAY-03")?.constraint||{};
  check(errors,pay3.open_remainder_preserves_source_lineage===true&&pay3.release_lock_only_when_no_open_remainder===true,"SETTLEMENT-PARTIAL","partial remainder semantics weakened");
  const pay4=law(core,"LAW-PAY-04")?.constraint||{};
  check(errors,pay4.amount_must_not_exceed_current_eligible_balance===true&&pay4.dependency_drift_requires_re_resolution===true&&pay4.disputed_source_invalidates_dependent_intent===true,"SETTLEMENT-ELIGIBILITY","prepared eligibility weakened");
  const guard=law(core,"LAW-EXP-GUARD-01")?.constraint||{};
  check(errors,guard.active_scope?.fail_closed===true&&guard.explanation_required===true&&has(guard.dependency_dimensions,"dispute_eligibility")&&guard.state_evaluation==="current_and_proposed_post_state","SETTLEMENT-GUARD","expense settlement guard weakened");
  check(errors,op(core,"settlement.close")?.owner==="payment.intent","SETTLEMENT-CLOSE-OWNER","settlement.close must remain owned by PaymentIntent");
  check(errors,op(core,"settlement.mark_sent")?.rules?.some(x=>x.includes("not proof of receipt")),"SETTLEMENT-MARK-SENT","mark_sent must remain non-receipt");

  const group=law(core,"LAW-GROUP-02")?.constraint||{};
  check(errors,group.ledger_rewrite_on_lifecycle===false&&["expense_attribution","balances","historical_ledger","other_memberships"].every(x=>has(group.protected_facts,x)),"GROUP-LIFECYCLE","group lifecycle may not rewrite ledger truth");
  const compExpected={
    "COMP-01":["replacement_domain_object_on_route",false],
    "COMP-02":["projection_may_mutate_source_truth",false],
    "COMP-03":["manual_projection_overwrite",false],
    "COMP-04":["same_operation_identity",true],
    "COMP-05":["partial_capability_implies_full_journey",false],
    "COMP-06":["schema_may_redesign_golden_projection",false]
  };
  for(const [id,[field,value]] of Object.entries(compExpected)){
    check(errors,comp(graph,id)?.constraint?.[field]===value,"COMPOSITION-LAW","composition invariant weakened",{law:id,field});
  }
  return errors;
}

function syncOldSnapshot(reconstruction,core,graph,id){
  const c=(reconstruction.safety_contracts||[]).find(x=>x.schema_ref===id);
  if(!c)return;
  let n;
  if(c.node_kind==="law")n=law(core,id);
  else if(c.node_kind==="object")n=obj(core,id);
  else if(c.node_kind==="operation")n=op(core,id);
  else if(c.node_kind==="composition_law")n=comp(graph,id);
  if(!n)return;
  if(c.node_kind==="law")c.expected={applies_to:n.applies_to||[],constraint:n.constraint||null};
  if(c.node_kind==="object")c.expected={kind:n.kind,identity:n.identity||[],derived_from:n.derived_from||[]};
  if(c.node_kind==="operation")c.expected={owner:n.owner,changes:n.changes||[],invalidates:n.invalidates||[],invalidates_prepared:n.invalidates_prepared||[],guards:n.guards||[]};
  if(c.node_kind==="composition_law")c.expected={constraint:n.constraint};
}
function removeManifest(reconstruction,id){
  for(const arr of Object.values(reconstruction.safety_class_manifest||{})){
    const i=arr.indexOf(id);if(i>=0)arr.splice(i,1);
  }
}
function mutateCase(name,domain,fn){return {name,domain,fn};}

export function deriveIndependentMutationCoverage(core,graph,reconstruction,authority){
  const cases=[
    mutateCase("money-cross-partition","money",x=>{law(x.core,"LAW-MONEY-01").constraint.cross_partition_combine=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-MONEY-01");}),
    mutateCase("money-drop-exponent","money",x=>{obj(x.core,"money.money_v1").identity=["minorUnits","currency"];syncOldSnapshot(x.reconstruction,x.core,x.graph,"money.money_v1");}),
    mutateCase("money-display-authority","money",x=>{law(x.core,"LAW-MONEY-01").constraint.display_decimal_authority=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-MONEY-01");}),
    mutateCase("savings-self-report-confirms","money",x=>{law(x.core,"LAW-SAV-01").constraint.self_report_increases_confirmed_available=true;}),
    mutateCase("savings-submitted-confirms","money",x=>{law(x.core,"LAW-SAV-01").constraint.submitted_increases_confirmed_available=true;}),
    mutateCase("savings-unknown-confirms","money",x=>{law(x.core,"LAW-SAV-01").constraint.unknown_increases_confirmed_available=true;}),

    mutateCase("participant-identity-account","identity",x=>{obj(x.core,"identity.participant").identity=["account_identity_ref"];syncOldSnapshot(x.reconstruction,x.core,x.graph,"identity.participant");}),
    mutateCase("link-replaces-participant","identity",x=>{law(x.core,"LAW-ID-01").constraint.account_link_replaces_participant=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-ID-01");}),
    mutateCase("link-rewrites-history","identity",x=>{law(x.core,"LAW-ID-01").constraint.historical_reference_rewrite=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-ID-01");}),
    mutateCase("email-merge-allowed","identity",x=>{law(x.core,"LAW-ID-02").constraint.prohibited_merge_keys=["display_name"];syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-ID-02");}),
    mutateCase("collision-auto-merges","identity",x=>{law(x.core,"LAW-ID-02").constraint.collision_or_mismatch="merged";syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-ID-02");}),
    mutateCase("cross-group-id-visible","identity",x=>{law(x.core,"LAW-ID-03").constraint.group_visible_cross_group_stable_identifier=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-ID-03");}),

    mutateCase("unknown-new-operation","recovery_replay",x=>{law(x.core,"LAW-OP-01").constraint.same_operation_identity_until_reconciliation=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-OP-01");}),
    mutateCase("unknown-state-removed","recovery_replay",x=>{law(x.core,"LAW-OP-01").constraint.states=law(x.core,"LAW-OP-01").constraint.states.filter(v=>v!=="unknown");syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-OP-01");}),
    mutateCase("retry-without-no-effect","recovery_replay",x=>{law(x.core,"LAW-OP-02").constraint.replacement_retry_requires_proven_no_effect=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-OP-02");}),
    mutateCase("navigation-becomes-evidence","recovery_replay",x=>{law(x.core,"LAW-OP-03").constraint.evidence_from_navigation=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-OP-03");}),
    mutateCase("stale-silent-overwrite","recovery_replay",x=>{law(x.core,"LAW-OP-04").constraint.silent_overwrite=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-OP-04");}),
    mutateCase("history-replay-effects","recovery_replay",x=>{law(x.core,"LAW-HIST-01").constraint.replay_external_effects=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-HIST-01");}),

    mutateCase("restore-secrets","storage_restore",x=>{law(x.core,"LAW-STORAGE-01").constraint.secrets_excluded=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-STORAGE-01");}),
    mutateCase("restore-overwrites-newer","storage_restore",x=>{law(x.core,"LAW-STORAGE-01").constraint.preserve_newer_truth=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-STORAGE-01");}),
    mutateCase("restore-no-preview","storage_restore",x=>{law(x.core,"LAW-STORAGE-01").constraint.restore_preview_before_mutation=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-STORAGE-01");}),
    mutateCase("restore-unknown-no-reconcile","storage_restore",x=>{law(x.core,"LAW-STORAGE-01").constraint.unknown_outcome_requires_reconciliation=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-STORAGE-01");}),
    mutateCase("restore-owner-group","storage_restore",x=>{op(x.core,"storage.restore").owner="group.group";syncOldSnapshot(x.reconstruction,x.core,x.graph,"storage.restore");}),

    mutateCase("preference-creates-authority","authority",x=>{law(x.core,"LAW-AUTH-01").constraint.presentation_preference_creates_authority=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-AUTH-01");}),
    mutateCase("share-confirms-payment","authority",x=>{law(x.core,"LAW-DEST-01").constraint.sharing_confirms_payment=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-DEST-01");}),
    mutateCase("wallet-widens-scope","authority",x=>{law(x.core,"LAW-WALLET-01").constraint.wallet_can_widen_scope=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-WALLET-01");}),
    mutateCase("delete-ignores-owner","authority",x=>{law(x.core,"LAW-ACCOUNT-01").constraint.blocked_by_active_group_ownership=false;}),
    mutateCase("delete-ignores-money","authority",x=>{law(x.core,"LAW-ACCOUNT-01").constraint.blocked_by_unresolved_money=false;}),
    mutateCase("delete-global-erasure","authority",x=>{law(x.core,"LAW-ACCOUNT-01").constraint.global_erasure_claim=true;}),
    mutateCase("savings-admin-owns-position","authority",x=>{law(x.core,"LAW-SAV-02").constraint.participant_position_owned_by_participant=false;}),
    mutateCase("savings-fabricated-confirmation","authority",x=>{law(x.core,"LAW-SAV-02").constraint.fabricated_confirmation_allowed=true;}),

    mutateCase("position-add-any-scope","settlement",x=>{obj(x.core,"position.scope").allowed_scope_kinds.push("any");syncOldSnapshot(x.reconstruction,x.core,x.graph,"position.scope");}),
    mutateCase("settlement-group-scope","settlement",x=>{law(x.core,"LAW-POS-SCOPE-01").constraint.settlement_required_scope_kind="group";syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-POS-SCOPE-01");}),
    mutateCase("position-drop-reference","settlement",x=>{obj(x.core,"position.position").references=[];}),
    mutateCase("prepare-drop-scope-law","settlement",x=>{op(x.core,"settlement.prepare").law_refs=[];}),
    mutateCase("prepare-drop-position-read","settlement",x=>{op(x.core,"settlement.prepare").reads=op(x.core,"settlement.prepare").reads.filter(v=>v!=="position.position");}),
    mutateCase("ctx-settlement-drop-scope","settlement",x=>{ctx(x.graph,"ctx.settlement").objects=ctx(x.graph,"ctx.settlement").objects.filter(v=>v!=="position.scope");}),
    mutateCase("ctx-guard-drop-scope-law","settlement",x=>{ctx(x.graph,"ctx.expense_guard").laws=ctx(x.graph,"ctx.expense_guard").laws.filter(v=>v!=="LAW-POS-SCOPE-01");}),
    mutateCase("scope-retro-expands","settlement",x=>{law(x.core,"LAW-PAY-01").constraint.retroactive_expansion=true;}),
    mutateCase("sent-confirms-receipt","settlement",x=>{law(x.core,"LAW-PAY-02").constraint.payer_sent_confirms_receipt=true;}),
    mutateCase("partial-equals-closed","settlement",x=>{law(x.core,"LAW-PAY-02").constraint.partial_equals_closed=true;}),
    mutateCase("partial-releases-lock","settlement",x=>{law(x.core,"LAW-PAY-03").constraint.release_lock_only_when_no_open_remainder=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-PAY-03");}),
    mutateCase("prepared-over-eligible","settlement",x=>{law(x.core,"LAW-PAY-04").constraint.amount_must_not_exceed_current_eligible_balance=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-PAY-04");}),
    mutateCase("guard-fail-open","settlement",x=>{law(x.core,"LAW-EXP-GUARD-01").constraint.active_scope.fail_closed=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-EXP-GUARD-01");}),
    mutateCase("guard-drop-dispute","settlement",x=>{law(x.core,"LAW-EXP-GUARD-01").constraint.dependency_dimensions=law(x.core,"LAW-EXP-GUARD-01").constraint.dependency_dimensions.filter(v=>v!=="dispute_eligibility");syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-EXP-GUARD-01");}),
    mutateCase("close-owned-by-position","settlement",x=>{op(x.core,"settlement.close").owner="position.position";syncOldSnapshot(x.reconstruction,x.core,x.graph,"settlement.close");}),

    mutateCase("route-replaces-object","composition_continuity",x=>{comp(x.graph,"COMP-01").constraint.replacement_domain_object_on_route=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"COMP-01");}),
    mutateCase("projection-may-mutate","composition_continuity",x=>{comp(x.graph,"COMP-02").constraint.projection_may_mutate_source_truth=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"COMP-02");}),
    mutateCase("manual-view-overwrite","composition_continuity",x=>{comp(x.graph,"COMP-03").constraint.manual_projection_overwrite=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"COMP-03");}),
    mutateCase("recovery-new-identity","composition_continuity",x=>{comp(x.graph,"COMP-04").constraint.same_operation_identity=false;syncOldSnapshot(x.reconstruction,x.core,x.graph,"COMP-04");}),
    mutateCase("partial-promoted","composition_continuity",x=>{comp(x.graph,"COMP-05").constraint.partial_capability_implies_full_journey=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"COMP-05");}),
    mutateCase("schema-redesigns-golden","composition_continuity",x=>{comp(x.graph,"COMP-06").constraint.schema_may_redesign_golden_projection=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"COMP-06");}),
    mutateCase("lifecycle-rewrites-ledger","composition_continuity",x=>{law(x.core,"LAW-GROUP-02").constraint.ledger_rewrite_on_lifecycle=true;syncOldSnapshot(x.reconstruction,x.core,x.graph,"LAW-GROUP-02");}),

    mutateCase("declass-money-law","money",x=>{delete law(x.core,"LAW-MONEY-01").safety_class;removeManifest(x.reconstruction,"LAW-MONEY-01");x.reconstruction.safety_contracts=(x.reconstruction.safety_contracts||[]).filter(c=>c.schema_ref!=="LAW-MONEY-01");}),
    mutateCase("delete-money-law","money",x=>{x.core.laws=x.core.laws.filter(v=>v.id!=="LAW-MONEY-01");removeManifest(x.reconstruction,"LAW-MONEY-01");x.reconstruction.safety_contracts=(x.reconstruction.safety_contracts||[]).filter(c=>c.schema_ref!=="LAW-MONEY-01");}),
    mutateCase("move-money-law-to-authority","money",x=>{law(x.core,"LAW-MONEY-01").safety_class="authority";removeManifest(x.reconstruction,"LAW-MONEY-01");x.reconstruction.safety_class_manifest.authority.push("LAW-MONEY-01");}),
    mutateCase("invent-force-close","settlement",x=>{x.core.operations.push({id:"settlement.force_close",owner:"payment.intent",changes:["payment.intent","payment.record"],safety_class:"settlement",sources:["J12"]});x.reconstruction.safety_class_manifest.settlement.push("settlement.force_close");}),
    mutateCase("declass-recovery","recovery_replay",x=>{delete law(x.core,"LAW-OP-02").safety_class;removeManifest(x.reconstruction,"LAW-OP-02");x.reconstruction.safety_contracts=(x.reconstruction.safety_contracts||[]).filter(c=>c.schema_ref!=="LAW-OP-02");})
  ];

  const baseline=validateIndependentSafety(core,graph,reconstruction,authority);
  const results=[],domains={};
  for(const c of cases){
    const x={core:clone(core),graph:clone(graph),reconstruction:clone(reconstruction)};
    c.fn(x);
    const errors=validateIndependentSafety(x.core,x.graph,x.reconstruction,authority);
    const detected=errors.length>0;
    results.push({name:c.name,domain:c.domain,detected,detected_by:uniq(errors.map(e=>e.id))});
    domains[c.domain]??={applicable:0,detected:0};
    domains[c.domain].applicable++;
    if(detected)domains[c.domain].detected++;
  }
  for(const v of Object.values(domains))v.score=Number((100*v.detected/v.applicable).toFixed(2));
  const detected=results.filter(x=>x.detected).length;
  return {schema_version:2,generated_view:"independent-safety-mutation-coverage",baseline_errors:baseline,detector:"independent fixed invariants + frozen authority; old safety snapshots are co-mutated and do not count as detectors",domains,total:{applicable:results.length,detected,score:Number((100*detected/results.length).toFixed(2))},results};
}
