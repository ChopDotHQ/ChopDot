# Supabase Local Development Setup

This guide explains how to sync your local Supabase environment with your cloud instance.

## Prerequisites

- Supabase CLI installed (you have this ✓)
- Access to your Supabase cloud project
- Supabase project reference and database password

## Commands

### Initial Setup (One-Time)

Use this command when starting fresh or setting up a new development environment:

```bash
npm run db:setup
```

**What this does:**
1. **Links** your local environment to your cloud Supabase project (prompts for project ref and password)
2. **Pulls** all migrations from cloud to `supabase/migrations/`
3. **Starts** local Supabase (Docker containers)
4. **Resets** local database and applies all migrations (both cloud and local)

**When to use:**
- First time setting up the project
- After removing local Supabase environment
- When you want to sync everything from cloud to local

### Push Local Changes to Cloud

After creating new migrations locally, push them to cloud:

```bash
npm run db:push
```

**What this does:**
1. Applies any new local migrations to your local database
2. Pushes those migrations to your cloud Supabase project

**When to use:**
- After creating new migrations locally
- After making schema changes you want to deploy

### Other Useful Commands

```bash
# Start local Supabase (if already set up)
npm run db:start

# Stop local Supabase
npm run db:stop

# Check status of local services
npm run db:status

# Reset local database (reapply all migrations)
npm run db:reset
```

## Workflow

### 1. Initial Setup
```bash
npm run db:setup
```

Follow the prompts:
- Enter your Supabase project reference (find in cloud dashboard)
- Enter your database password
- Wait for migrations to be pulled and applied

### 2. Daily Development

Start your local environment:
```bash
npm run db:start
```

Your local services will be available at:
- API: http://localhost:54321
- Studio: http://localhost:54323
- Database: postgresql://postgres:postgres@localhost:54322/postgres

### 3. Making Schema Changes

Option A: Using Supabase Studio
1. Make changes in local Studio (http://localhost:54323)
2. Generate migration: `supabase db diff -f my_migration_name`
3. Push to cloud: `npm run db:push`

Option B: Writing SQL Migrations
1. Create migration file: `supabase migration new my_migration_name`
2. Edit the file in `supabase/migrations/`
3. Apply locally: `npm run db:reset`
4. Push to cloud: `npm run db:push`

### 4. Pulling Changes from Cloud

If someone else pushed changes to cloud:
```bash
supabase db pull
npm run db:reset
```

## Troubleshooting

### "Connection refused" or "dial tcp ... connect: connection refused"
This occurs when the connection pooler is blocked or disabled. **Solution:**

**Option 1: Use Alternative Setup Script** (Recommended)
```bash
# 1. Get your DIRECT database connection string from Supabase Dashboard:
#    https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/settings/database
#    → Connection string → URI → Direct connection (NOT Transaction/Session mode)
#
# 2. Add to .env file:
echo "SUPABASE_DB_URL='postgresql://postgres:[YOUR-PASSWORD]@db.jpzacnkirymlyxwmafox.supabase.co:5432/postgres'" >> .env

# 3. Run alternative setup:
./supabase-setup-alt.sh
```

**Option 2: Manual Setup**
```bash
./supabase-setup-manual.sh
# Follow the prompts and instructions
```

**Option 3: Enable Connection Pooling**
1. Go to your Supabase Dashboard → Settings → Database
2. Enable "Connection Pooling" if it's disabled
3. Try `npm run db:setup` again

### "Project not linked"
Run `supabase link --project-ref jpzacnkirymlyxwmafox` and enter your database password.

### "Migration conflicts"
This happens when local and cloud migrations diverge. Solutions:
1. Pull from cloud: `supabase db pull`
2. Resolve conflicts manually in `supabase/migrations/`
3. Reset local: `npm run db:reset`

### "Docker containers not starting"
Ensure Docker is running and ports 54321-54326 are not in use.

### Starting completely fresh
```bash
# Remove all local Supabase data
supabase stop
rm -rf supabase/.temp supabase/migrations/*

# Re-run setup
npm run db:setup
```

## Configuration

Your Supabase configuration is in `supabase/config.toml`. Key settings:
- Database port: 54322
- API port: 54321
- Studio port: 54323
- Postgres version: 17

## Environment Variables

For your application to connect to Supabase, ensure you have:

```env
VITE_SUPABASE_URL=http://localhost:54321  # or your cloud URL
VITE_SUPABASE_ANON_KEY=your_anon_key      # get from: supabase status
```

Run `npm run db:status` to see your local keys, or check your cloud project settings for production keys.

## Migration Files

- **Location**: `supabase/migrations/`
- **Format**: `YYYYMMDDHHMMSS_migration_name.sql`
- **Order**: Migrations run in alphanumeric order by filename

Keep your migration files in version control!

## Tips

1. **Always test migrations locally first** before pushing to cloud
2. **Use descriptive migration names** (e.g., `add_user_profiles_table`)
3. **Keep migrations small and focused** on one change
4. **Never edit applied migrations** - create new ones instead
5. **Commit migration files to git** so team members can sync
