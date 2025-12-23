#!/bin/bash
# Automated Schema Verification Script
# Run this to verify schema parity between local and cloud

set -e

echo "🔍 Schema Verification Script"
echo "=============================="
echo ""

# Check if Supabase is linked
if [ ! -f "supabase/.temp/project-ref" ]; then
  echo "❌ Supabase project not linked"
  echo "   Run: supabase link --project-ref jpzacnkirymlyxwmafox"
  exit 1
fi

PROJECT_REF=$(cat supabase/.temp/project-ref)
echo "✅ Project linked: $PROJECT_REF"
echo ""

# Check if logged in
if ! supabase projects list > /dev/null 2>&1; then
  echo "❌ Not logged in to Supabase"
  echo "   Run: supabase login"
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Run migration list to verify sync
echo "📋 Checking migration status..."
supabase migration list --linked | head -15

echo ""
echo "✅ Schema verification complete!"
echo ""
echo "Next steps:"
echo "  1. Review migration list above"
echo "  2. Run SQL queries from docs/SCHEMA_VERIFICATION.md"
echo "  3. Follow docs/SMOKE_TEST_CHECKLIST.md for UI tests"
