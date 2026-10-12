# Primary actions and domain mapping

| UI action | Requested event | Not implied |
|---|---|---|
| Continue with email | EmailSignInSelected | Authentication |
| Send code / Send a new code | SignInCodeRequested | Session verified |
| Continue on code | SignInCodeVerificationRequested | A click cannot verify itself |
| Continue on name | DisplayNameSaved, after verified session | Membership |
| Choose wallet account | SignInApprovalRequested | Connection or payment authorization |
| Check again | SignInStatusChecked (read only) | Approval |
| Cancel | SignInApprovalCancelled | Deleting an account |
| Try again after expiry/decline | New scoped sign-in request | Reviving the old request |
| Try again while offline | Connection checked; resume when available | Bypassing sign-in |
| Use a different account | Return to verification | Account merging |
| Open ChopDot | EntryDestinationOpened: Home | A live account or changed balance |
| Continue to invite | EntryDestinationOpened: invitation | Joining the group |

Only the simulated provider result used by this prototype emits SessionVerified. Production systems must verify it through the correct provider and account binding. The Demo controls are expressly outside the product authority model.
