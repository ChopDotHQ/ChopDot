#!/bin/bash
# Alternative Setup - Using DB URL directly
# This bypasses the pooler connection issue

set -e

echo "🔧 Alternative Supabase Setup (Direct DB Connection)"
echo "====================================================="
echo ""

# Check if .env has DB URL
if [ -f .env ] && grep -q "SUPABASE_DB_URL" .env; then
    echo "✅ Found SUPABASE_DB_URL in .env"
    source .env
else
    echo "⚠️  SUPABASE_DB_URL not found in .env"
    echo ""
    echo "Please add your direct database connection string to .env:"
    echo ""
    echo "SUPABASE_DB_URL='postgresql://postgres:[YOUR-PASSWORD]@db.jpzacnkirymlyxwmafox.supabase.co:5432/postgres'"
    echo ""
    echo "Get this from: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/settings/database"
    echo "  → Connection string → Direct connection (NOT pooler)"
    echo ""
    exit 1
fi

# Create project ref file manually
echo "📝 Setting up project reference..."
mkdir -p supabase/.temp
echo "jpzacnkirymlyxwmafox" > supabase/.temp/project-ref

echo ""
echo "📥 Pulling migrations from cloud..."
echo "Note: Forcing IPv4 to avoid routing issues..."

# Force IPv4 by disabling IPv6 for this command
if command -v networksetup &> /dev/null; then
    # Try with DNS resolver flag first
    if supabase db pull --db-url "$SUPABASE_DB_URL" --dns-resolver=https 2>&1 | tee /tmp/supabase_pull.log; then
        echo "✅ Successfully pulled migrations"
    else
        echo "❌ Failed to pull migrations with https resolver"
        echo ""
        echo "This is likely an IPv6 routing issue. Let's try a workaround..."
        echo ""
        echo "Please manually download migrations:"
        echo "1. Go to: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/database/migrations"
        echo "2. Download all migrations"
        echo "3. Place them in: supabase/migrations/"
        echo ""
        echo "OR try this psql command directly:"
        echo "  psql '$SUPABASE_DB_URL' -c '\dt'"
        echo ""
        exit 1
    fi
else
    if supabase db pull --db-url "$SUPABASE_DB_URL"; then
        echo "✅ Successfully pulled migrations"
    else
        echo "❌ Failed to pull migrations"
        exit 1
    fi
fi

echo ""
echo "🚀 Starting local Supabase..."
if supabase start; then
    echo "✅ Successfully started local Supabase"
else
    echo "❌ Failed to start local Supabase"
    exit 1
fi

echo ""
echo "🔄 Resetting local database (applying all migrations)..."
if supabase db reset; then
    echo "✅ Successfully reset database"
else
    echo "❌ Failed to reset database"
    exit 1
fi

echo ""
echo "✨ Setup Complete!"
echo ""
supabase status
echo ""
echo "Your local environment is ready!"
