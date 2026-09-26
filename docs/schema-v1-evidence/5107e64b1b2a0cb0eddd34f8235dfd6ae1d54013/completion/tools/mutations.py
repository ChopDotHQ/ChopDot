"""Reconstructed SEC-SCHEMA-001 cases; no original executable harness recovered."""
import copy
LAWS=['LAW-PAY-01','LAW-PAY-02','LAW-PAY-03','LAW-OP-01','LAW-OP-02']
PRESERVES=['payment_id/idempotency','payer','recipient','one currency','exact amount','source groups/items','accepted result']
def cases():
    out=[dict(id='CTRL-BASE',kind='valid_control',action='none')]
    out += [dict(id='A-'+x,kind='attack',action='law',value=x) for x in LAWS]
    out += [dict(id='B-ALL-FIVE',kind='attack',action='laws')]
    out += [dict(id='C-%02d'%(i+1),kind='attack',action='preserve',value=x) for i,x in enumerate(PRESERVES)]
    out += [dict(id='D-J12-GROUP',kind='attack',action='group'),dict(id='E-POSITIVE',kind='attack',action='law',value='LAW-POS-SCOPE-01'),
      dict(id='N-PARTIAL',kind='attack',action='partial'),dict(id='N-WRONG-LAW',kind='attack',action='wrong'),
      dict(id='N-WEAK-AMOUNT',kind='attack',action='weak',value='exact amount',replacement='approximate amount'),
      dict(id='N-WEAK-RESULT',kind='attack',action='weak',value='accepted result',replacement='unverified result'),
      dict(id='N-OPAQUE-CONTEXT',kind='attack',action='opaque'),
      dict(id='N-EMPTY-CARRIER',kind='attack',action='empty'),
      dict(id='CTRL-UNRELATED',kind='valid_control',action='unrelated'),
      dict(id='CTRL-EQUIVALENT',kind='valid_control',action='equivalent'),
      dict(id='CTRL-ORDER',kind='valid_control',action='order')]
    return out

def apply(g,c):
    ctx=next(x for x in g['contexts'] if x['id']=='ctx.settlement'); a=c['action']
    if a=='none': return
    if a=='law': ctx['laws'].remove(c['value'])
    elif a=='laws': ctx['laws']=[x for x in ctx['laws'] if x not in LAWS]
    elif a=='preserve': ctx['preserves'].remove(c['value'])
    elif a=='partial': ctx['preserves']=['payer','recipient','one currency']
    elif a=='wrong': ctx['laws']=[('LAW-MONEY-01' if x=='LAW-PAY-01' else x) for x in ctx['laws']]
    elif a=='weak': ctx['preserves']=[c['replacement'] if x==c['value'] else x for x in ctx['preserves']]
    elif a in ['group','opaque','equivalent','empty']:
        # Reuse an existing witnessed context, leaving owners and all pre-existing refs intact.
        # Every predecessor that emitted ctx.settlement also emits the alternate carrier.
        alt=next(x for x in g['contexts'] if x['id']=='ctx.group') if a=='group' else copy.deepcopy(ctx)
        if a!='group':
            alt['id']='ctx.handoff_x'; alt['name']='Handoff X'; g['contexts'].append(alt)
        else:
            alt['objects']=list(dict.fromkeys(alt['objects']+ctx['objects']))
            alt['preserves']=list(dict.fromkeys(alt['preserves']+ctx['preserves']))
        if a in ['group','opaque']: alt['laws']=['LAW-POS-SCOPE-01']
        if a=='empty': alt['objects']=[];alt['laws']=[];alt['preserves']=[]
        for j in g['journey_projections']:
            if 'ctx.settlement' in j['emits_contexts'] and alt['id'] not in j['emits_contexts']: j['emits_contexts'].append(alt['id'])
            if j['id']=='12': j['entry_contexts_any']=[alt['id']]
        u=next(x for x in g['composition_units'] if x['id']=='composition.position_settlement')
        if alt['id'] not in u['contexts']:u['contexts'].append(alt['id'])
    elif a=='unrelated':
        # Ordering has no meaning for this declared set. No settlement obligations added.
        next(x for x in g['contexts'] if x['id']=='ctx.entry')['preserves'].reverse()
    elif a=='order':ctx['preserves'].reverse();ctx['laws'].reverse()
    else:raise ValueError(a)
