#!/bin/bash
# Simple Local Setup - Use existing migrations
# Use this when you already have migrations pulled

set -e

echo "🚀 Simple Supabase Local Setup"
echo "=============================="
echo ""
echo "This will:"
echo "  1. Start local Supabase containers"
echo "  2. Apply existing migrations from supabase/migrations/"
echo ""

# Check if migrations exist
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ "$MIGRATION_COUNT" -eq "0" ]; then
    echo "❌ No migrations found in supabase/migrations/"
    echo ""
    echo "You need to pull migrations first. Options:"
    echo "  1. Download from: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/database/migrations"
    echo "  2. Or wait for IPv6 routing to be fixed"
    exit 1
fi

echo "Found $MIGRATION_COUNT migration(s) to apply"
echo ""

# Create project ref file manually
echo "📝 Setting up project reference..."
mkdir -p supabase/.temp
echo "jpzacnkirymlyxwmafox" > supabase/.temp/project-ref

echo ""
echo "🚀 Starting local Supabase..."
if supabase start; then
    echo "✅ Successfully started local Supabase"
else
    echo "❌ Failed to start local Supabase"
    echo "Make sure Docker is running"
    exit 1
fi

echo ""
echo "🔄 Applying migrations to local database..."
if supabase db reset; then
    echo "✅ Successfully applied all migrations"
else
    echo "❌ Failed to apply migrations"
    exit 1
fi

echo ""
echo "✨ Local Setup Complete!"
echo ""
echo "Your local Supabase is running:"
supabase status
echo ""
echo "Next steps:"
echo "  - Visit Studio: http://localhost:54323"
echo "  - Your app should connect to: http://localhost:54321"
echo "  - To stop: npm run db:stop"
echo ""
echo "To push changes to cloud later (when connection works):"
echo "  npm run db:push"
