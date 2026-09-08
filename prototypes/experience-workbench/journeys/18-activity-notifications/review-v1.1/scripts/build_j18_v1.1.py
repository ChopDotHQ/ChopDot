from pathlib import Path
import hashlib, sys
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'source/j18-v1.1-pre-final.html'
out=ROOT/'j18-v1.1-continuity-candidate.html'
s=src.read_text(encoding='utf-8')
# Stable notification identities: bind UI rows to the exact model notification ids.
repls={
'data-notification-id="n:auto-0"':'data-notification-id="n:r-new"',
'data-notification-id="n:auto-1"':'data-notification-id="n:e-review"',
'data-notification-id="n:auto-2"':'data-notification-id="n:s-confirm"',
'data-notification-id="n:auto-3"':'data-notification-id="n:p-complete"',
}
for old,new in repls.items():
    if s.count(old)!=1: raise SystemExit(f'Expected one {old}, found {s.count(old)}')
    s=s.replace(old,new,1)
# Add the retained older Waiting notification as a first-class historical row.
anchor='<div class="card"><a class="j18-row" data-notification-id="n:s-confirm" href="#savings-confirmed">'
if s.count(anchor)!=1: raise SystemExit('Earlier notification card anchor changed')
waiting='''<div class="card"><a class="j18-row" data-notification-id="n:p-wait" href="#stale-notification"><div class="j18-icon warn"><svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewbox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></div><div class="j18-copy"><b>Payment was waiting</b><span>Jeanine · CHF 54.30 · later completed</span><time>15:02</time></div><div class="j18-side"><span>History</span><svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewbox="0 0 24 24"><path d="M9 18l6-6-6-6"></path></svg></div></a><a class="j18-row" data-notification-id="n:s-confirm" href="#savings-confirmed">'''
s=s.replace(anchor,waiting,1)
# Keep the browser projection and notification list in sync with the rendered rows.
old_event="{eventId:'e-review',type:'expense.review-needed',entityType:'expense',entityId:'e1',version:1,timestamp:'2026-09-07T10:11:00Z',status:'Review',resolved:false}\n];"
new_event="{eventId:'e-review',type:'expense.review-needed',entityType:'expense',entityId:'e1',version:1,timestamp:'2026-09-07T10:11:00Z',status:'Review',resolved:false},\n{eventId:'s-confirm',type:'savings.confirmed',entityType:'savings_operation',entityId:'s1',version:1,timestamp:'2026-09-07T14:12:00Z',status:'Confirmed',resolved:true,amount:'180.00',currency:'CHF'}\n];"
if s.count(old_event)!=1: raise SystemExit('Event fixture anchor changed')
s=s.replace(old_event,new_event,1)
old_notifications="let notifications=[M.notificationCopy(events[2]),M.notificationCopy(events[3]),{...M.notificationCopy(events[0]),read:true}, {...M.notificationCopy(events[1]),read:true}];"
new_notifications="let notifications=[M.notificationCopy(events[2]),M.notificationCopy(events[3]),{...M.notificationCopy(events[0]),read:true},{...M.notificationCopy(events[4]),read:true},{...M.notificationCopy(events[1]),read:true}];"
if s.count(old_notifications)!=1: raise SystemExit('Notification fixture anchor changed')
s=s.replace(old_notifications,new_notifications,1)
out.write_text(s,encoding='utf-8',newline='')
print(hashlib.sha256(out.read_bytes()).hexdigest())
