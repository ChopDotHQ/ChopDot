# Evolving implementation/schema alignment

Frozen schema V1: 5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013.
Frozen Golden/C1: 4ba456e6595330e4ca8e21366e0d827f17e10881.
This is a living correspondence record, not a new schema authority or certified path.

| Scope | Approved meaning / owner | Implementation impact | Evidence / decision |
|---|---|---|---|
| J02 bounded Home | Navigation/presentation; no owned domain operation | Canonical Home, root/group/history routes and saved-expense Group Home return | J02 repair report; user accepted c59073cf |
| J03 bounded creation | group.create; existing creation draft/owner | Currency choice edits draft; explicit Create commits once; records/returns preserved | J03 repair report; user accepted ae19153b; no certified J03 task path |
| J04 approved repairs | Existing group.invite/group.join owners and guards; navigation creates no domain effect | Consistent Invite entry; local/prepared/joined status presentation; no domain/model change | J04 repair report, f8501fa7, 20 focused checks; no certified J04 task path |

For each next journey append resolved source/state/control identifiers, applicable
owner/operation/context/laws, actual change and exact proof. Mark missing mapping
explicitly. Do not copy operation definitions or claim universal semantic closure.
Frozen files/tags/manifests are unchanged. Any necessary new domain meaning goes
in a versioned successor proposal, not a silent edit to V1.
