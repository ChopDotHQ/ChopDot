# Derived-impact experiment — finding

The first CI run with the derived-impact assertion failed:

`FUND-001 failed to derive J08`

This was a useful model failure, not a product/runtime failure.

The semantic dependency graph contained:

```text
ExpenseAccounting <- Position.Recompute
Position <- J08
```

but omitted the essential relationship:

```text
Position uses Position.Recompute
```

Without that edge, a traversal from Funding/ExpenseAccounting could not reach Position consumers even though the hand-authored impact oracle said they were affected.

The repair adds exactly one semantic dependency:

```text
Position -> uses -> Position.Recompute
```

No per-invariant journey edge was added.

This is the behavior the experiment is intended to encourage: when derived impact is incomplete, repair the smallest missing domain/composition relationship rather than adding bespoke blast-radius metadata.

If this pattern continues to require many arbitrary semantic edges, that is evidence to shrink the approach.
