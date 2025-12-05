#!/bin/bash
# Push local migrations to cloud Supabase
# This will work once the IPv6 routing issue is resolved

set -e
set -a
source .env
set +a

echo "📤 Pushing Local Migrations to Cloud"
echo "===================================="
echo ""

# Check if we have the DB URL
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL not found in .env"
    echo ""
    echo "Please add your direct database connection string:"
    echo "SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.jpzacnkirymlyxwmafox.supabase.co:5432/postgres'"
    exit 1
fi

echo "Testing connection to cloud database..."
echo ""

# Try to push
if supabase db push --db-url "$SUPABASE_DB_URL" --dns-resolver=https; then
    echo ""
    echo "✅ Successfully pushed migrations to cloud!"
    echo ""
    echo "Your cloud database now has all local migrations."
else
    echo ""
    echo "❌ Failed to push to cloud"
    echo ""
    echo "This is likely due to the IPv6 routing issue on your network."
    echo ""
    echo "Workarounds:"
    echo "1. Try from a different network (mobile hotspot, VPN, etc.)"
    echo "2. Wait for the network IPv6 routing to be fixed"
    echo "3. Manually apply migrations in Supabase Studio:"
    echo "   - Go to: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/sql"
    echo "   - Copy content from: supabase/migrations/*.sql"
    echo "   - Run each migration in order"
    echo ""
    exit 1
fi
