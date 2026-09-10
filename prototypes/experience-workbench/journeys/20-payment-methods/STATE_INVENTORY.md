# Journey 20 — State Inventory

Definition-stage inventory for V1. No review candidate exists yet.

| State | Purpose | Write authority |
|---|---|---|
| Overview · populated | Show saved methods, masked identity, compatible preference and availability | none |
| Overview · empty | Explain how to add the first receiving/payment destination | none |
| Method detail | Owner-only full detail view | none |
| Add · choose method | Bank / TWINT / PayPal / crypto destination | none |
| Add · bank | Account holder, IBAN, optional note | none until review/save |
| Add · TWINT | Phone and/or supported handle | none until review/save |
| Add · PayPal | Email and/or username | none until review/save |
| Add · crypto destination | Exact network, public address, optional label | none until review/save |
| Review new method | Confirm exact fields, compatible preference and availability before save | proposed save |
| Edit method | Change owner-controlled destination fields | none until review/save |
| Review edit | Explain destination-version change and stale-share impact | proposed update |
| Save pending | Accepted result unknown/in-flight | pending only |
| Save accepted | New readable method/version exists | accepted record |
| Save unknown | Preserve command identity and recover existing result | recovery only |
| Save failed / verified not saved | Explain failure; allow safe retry | none |
| Invalid field | Honest method-specific validation feedback | none |
| Duplicate method | Prevent accidental duplicate destination or ask user to edit existing one | none |
| Preference change | Suggest method only within compatible asset/context | preference write |
| Availability change | Control whether method can enter authorized payment/receive handoffs | availability write |
| Remove confirmation | Explain future-use/share impact without implying payment cancellation | proposed removal |
| Remove pending | Removal result unknown/in-flight | pending only |
| Remove accepted | Method unavailable for future use; history/balances unchanged | accepted removal |
| Remove unknown | Recover existing removal result | recovery only |
| Remove failed / verified not removed | Safe retry only after verified non-acceptance | none |
| Old share/review stale after edit | Old destination version cannot silently point at new details | none |
| Old share/review stale after removal | Future access blocked; prior external copies cannot be recalled | none |
| Incompatible asset | CHF method cannot satisfy DOT context and vice versa | none |
| Network mismatch | Same asset ticker does not override exact network requirement | none |
| Offline cached overview | Read masked saved state with explicit stale label | none |
| Offline write blocked | Add/edit/remove/preference writes require reconnection | none |
| Session/access changed | Scrub owner-only full details and return safely | none |
| Loading | Preserve shell without fake data | none |
| Load error | No inferred method state; safe retry | none |

All candidate states must preserve Journey 11/14/21 authority boundaries and TYPO-01 deferral.
