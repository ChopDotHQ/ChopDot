#!/bin/bash
# Manual Supabase Setup Script
# Use this if automatic linking fails due to pooler connection issues

set -e

PROJECT_REF="jpzacnkirymlyxwmafox"

echo "🔧 Supabase Manual Setup"
echo "========================"
echo ""
echo "This script will help you set up Supabase when the automatic pooler connection fails."
echo ""

# Check if we need a password
echo "📝 Step 1: Link to Supabase Project"
echo "Project Reference: $PROJECT_REF"
echo ""
echo "⚠️  If this fails with 'connection refused' error:"
echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "   2. Under 'Connection String', use 'Direct Connection' instead of 'Connection Pooling'"
echo "   3. Make sure to enter your DATABASE PASSWORD (not your Supabase account password)"
echo ""
read -p "Press Enter to continue with linking..."

# Try to link
if supabase link --project-ref "$PROJECT_REF"; then
    echo "✅ Successfully linked to project"
else
    echo ""
    echo "❌ Linking failed. Possible solutions:"
    echo ""
    echo "1. Check if Connection Pooling is enabled in your Supabase dashboard"
    echo "2. Or manually create a link file:"
    echo "   mkdir -p supabase/.temp"
    echo "   echo '$PROJECT_REF' > supabase/.temp/project-ref"
    echo ""
    echo "3. For manual migration pull, you can use:"
    echo "   Get your connection string from Supabase Dashboard > Settings > Database"
    echo "   Then run: supabase db pull --db-url 'postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres'"
    echo ""
    exit 1
fi

echo ""
echo "📥 Step 2: Pull migrations from cloud"
if supabase db pull; then
    echo "✅ Successfully pulled migrations"
else
    echo "❌ Failed to pull migrations"
    echo ""
    echo "You can try manually with direct connection:"
    echo "supabase db pull --db-url 'postgresql://postgres:[YOUR-PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres'"
    exit 1
fi

echo ""
echo "🚀 Step 3: Start local Supabase"
if supabase start; then
    echo "✅ Successfully started local Supabase"
else
    echo "❌ Failed to start local Supabase"
    echo "Check if Docker is running and ports are available"
    exit 1
fi

echo ""
echo "🔄 Step 4: Reset local database (apply all migrations)"
if supabase db reset; then
    echo "✅ Successfully reset database"
else
    echo "❌ Failed to reset database"
    exit 1
fi

echo ""
echo "✨ Setup Complete!"
echo ""
echo "Your local Supabase is running at:"
supabase status | grep -E "(API URL|DB URL|Studio URL)" || supabase status
echo ""
echo "Next steps:"
echo "  - Visit Studio: http://localhost:54323"
echo "  - Check status: npm run db:status"
echo "  - Stop services: npm run db:stop"
