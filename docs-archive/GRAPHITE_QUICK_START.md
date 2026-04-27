# Graphite CLI Quick Start

**Date:** 2025-12-23  
**Purpose:** Quick reference for using Graphite CLI without demos

## Basic Workflow

### Create a Branch and Commit
```bash
# Creates branch and commits in one command
gt create --message "Your commit message"
```

This is equivalent to:
```bash
git checkout -b your-branch-name
git commit -m "Your commit message"
```

### Submit a Pull Request
```bash
# Push branch and create PR interactively
gt submit

# Or non-interactively
gt submit --no-edit
```

### View Your Stack
```bash
# See all your branches
gt log short

# See stack visualization
gt log short --stack
```

### Create a Stack (Multiple Dependent PRs)
```bash
# Create first branch
gt create --message "First feature"

# Create second branch on top of first
gt create --message "Second feature"

# Create third branch on top of second
gt create --message "Third feature"

# Submit entire stack
gt submit --stack
```

## Common Commands

```bash
# Create branch with commit
gt create -m "Add feature X"

# Submit PR (interactive)
gt submit

# View branches
gt log short

# Sync with remote
gt sync

# Continue (move to next branch in stack)
gt continue

# Restack (rebase stack on latest main)
gt restack
```

## Workflow Comparison

**Traditional Git:**
```bash
git checkout -b feature-branch
git add .
git commit -m "Add feature"
git push origin feature-branch
# Then create PR manually on GitHub
```

**Graphite:**
```bash
gt create -m "Add feature"
gt submit
# PR created automatically
```

## Next Steps

1. Use `gt create` to create branches
2. Use `gt submit` to create PRs
3. Use `gt log` to see your stack
4. Use `gt sync` to keep branches up to date
