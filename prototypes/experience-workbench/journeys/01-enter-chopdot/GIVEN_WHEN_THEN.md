# Entry acceptance scenarios

1. **GIVEN** a new person, **WHEN** their email code is verified, **THEN** request their display name and open the intended destination, without requiring a wallet.
2. **GIVEN** a returning verified identity, **WHEN** they sign in, **THEN** skip the new-person name step.
3. **GIVEN** an invitation, **WHEN** sign-in completes, **THEN** continue to that invitation, still unjoined.
4. **GIVEN** a wrong code, **WHEN** submitted, **THEN** stay in verification and keep the email and destination.
5. **GIVEN** an expired code, **WHEN** submitted, **THEN** reject it; a new challenge is needed.
6. **GIVEN** an invitation and no connection, **WHEN** Retry is pressed, **THEN** remain offline, not signed in. After reconnect, retain the invitation.
7. **GIVEN** wallet sign-in waiting, **WHEN** Check again is pressed, **THEN** read status only, without generating approval.
8. **GIVEN** an unknown wallet result, **WHEN** checked again, **THEN** keep the existing request until a matching result or cancellation.
9. **GIVEN** a cancelled request, **WHEN** its late approval arrives, **THEN** ignore it.
10. **GIVEN** expired-session recovery, **WHEN** a different identity verifies, **THEN** do not expose the saved private context; ask for the original sign-in.
11. **GIVEN** a signed-in result, **WHEN** opening a reference and returning via browser Back, **THEN** retain the name and destination.
12. **GIVEN** any entry action, **WHEN** processed, **THEN** no payment is authorized, marked received, closed or retried, and no membership is accepted automatically.
13. **GIVEN** the document is reopened at an invitation entry URL, **WHEN** authentication is not present, **THEN** retain the invitation but request sign-in again.

Cases 1–12 have model/browser fixture coverage. Case 13's destination serialization is implemented; native file reload is not verified in this environment and remains an integration check.
