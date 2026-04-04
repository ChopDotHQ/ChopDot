# Supabase Connection Guide (IPv4-friendly)

## Pooling vs Direct Connections
- Use the **Connect** button on the Supabase dashboard
- Switch the **Method** dropdown to **Session pooler** (or Transaction pooler) instead of Direct connection
- Poolers run on port **6543** and support IPv4; direct connections default to IPv6

## Steps
1. Click **Connect** → choose **Session pooler**
2. Copy the connection string (it will look like `postgresql://postgres.<ref>:[PASSWORD]@aws-1-eu-central-2.pooler.supabase.com:6543/postgres?pgbouncer=true`)
3. Run CLI commands with `--db-url`:
   ```bash
   cd /Users/devinsonpena/ChopDot
   supabase db pull --db-url "postgresql://postgres.<ref>:[PASSWORD]@aws-1-eu-central-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
   Replace `<ref>` with your project ref (jpzacnkirymlyxwmafox) and `[PASSWORD]` with your DB password.

## Troubleshooting
- If Session pooler fails, try **Transaction pooler** (same host & port)
- Ensure the URL includes `?pgbouncer=true`
- You can always reset the DB password in **Project Settings → Database**

