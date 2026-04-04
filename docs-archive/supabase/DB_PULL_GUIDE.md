# Supabase DB Pull - Troubleshooting Guide

## Current Issue
- Pooler connection times out (overloaded)
- Direct connection is IPv6-only (your network doesn't support IPv6)
- Cannot complete `supabase db pull` from remote machine

## Solution Options

### Option 1: Enable IPv4 Access in Supabase Dashboard (RECOMMENDED)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox

2. **Find Database Settings**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **Database** in the settings menu

3. **Enable IPv4 Access**
   - Look for **"IPv4 add-on"** or **"IPv4 access"** section
   - This may be under:
     - **Settings → Database → Connection pooling**
     - **Settings → Database → Network access**
     - **Settings → Database → IPv4 add-on**
   - Enable IPv4 access (may require upgrading plan or enabling add-on)

4. **Get IPv4 Direct Connection String**
   - After enabling, go to **Settings → Database → Connection strings**
   - Switch to **"Direct"** tab
   - You should now see an IPv4 connection string (different hostname)
   - Copy the full connection string

5. **Run DB Pull**
   ```bash
   cd /Users/devinsonpena/ChopDot
   supabase db pull --db-url "postgresql://postgres:[PASSWORD]@[IPv4-HOST]:5432/postgres"
   ```

### Option 2: Run DB Pull Locally (If you have Supabase access)

If you can access the Supabase dashboard from your local machine:

1. **Link the project locally** (if not already linked):
   ```bash
   cd /Users/devinsonpena/ChopDot
   supabase link --project-ref jpzacnkirymlyxwmafox
   ```
   - You'll need your Personal Access Token (PAT)
   - You'll need your database password

2. **Try DB Pull with default connection**:
   ```bash
   supabase db pull
   ```

3. **If that fails, use direct connection string**:
   - Get direct connection string from dashboard (Settings → Database → Connection strings → Direct tab)
   - Run:
   ```bash
   supabase db pull --db-url "postgresql://postgres:[PASSWORD]@db.jpzacnkirymlyxwmafox.supabase.co:5432/postgres"
   ```

### Option 3: Use Supabase Dashboard SQL Editor (Workaround)

If you can't pull the schema via CLI, you can export it manually:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

3. **Export Schema**
   Run this SQL to get the schema:
   ```sql
   -- Get all tables
   SELECT 
     schemaname,
     tablename 
   FROM pg_tables 
   WHERE schemaname = 'public'
   ORDER BY tablename;

   -- Get table definitions
   SELECT 
     'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || 
     string_agg(column_name || ' ' || data_type, ', ') || 
     ');' as create_statement
   FROM information_schema.columns
   WHERE table_schema = 'public'
   GROUP BY schemaname, tablename;
   ```

   Or use pg_dump via the dashboard if available.

### Option 4: Contact Supabase Support

If IPv4 add-on is not available or you need help:
1. Go to: https://supabase.com/dashboard/support
2. Request IPv4 access for your project
3. Explain you need it for CLI operations

## Quick Checklist

- [ ] Checked Supabase Dashboard → Settings → Database for IPv4 option
- [ ] Tried linking project locally: `supabase link --project-ref jpzacnkirymlyxwmafox`
- [ ] Tried direct connection string with IPv4 (if available)
- [ ] Considered using SQL Editor as workaround
- [ ] Contacted Supabase support if needed

## Next Steps

1. **First**: Try to enable IPv4 access in the dashboard (Option 1)
2. **If that's not available**: Try running locally (Option 2)
3. **If both fail**: Use SQL Editor workaround (Option 3) or contact support (Option 4)

## Notes

- The project reference is: `jpzacnkirymlyxwmafox`
- Direct host: `db.jpzacnkirymlyxwmafox.supabase.co:5432` (IPv6-only)
- Pooler host: `aws-1-eu-central-2.pooler.supabase.com:6543` (overloaded)
- You need an IPv4 direct connection string to proceed

