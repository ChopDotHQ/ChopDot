#!/bin/bash
# Supabase Development Quick Commands
# chmod +x this file to use it directly

case "$1" in
  setup)
    echo "🚀 Setting up Supabase from cloud..."
    echo "This will: link → pull migrations → start local → reset database"
    npm run db:setup
    ;;
  push)
    echo "📤 Pushing local migrations to cloud..."
    npm run db:push
    ;;
  pull)
    echo "📥 Pulling migrations from cloud..."
    supabase db pull
    npm run db:reset
    ;;
  start)
    echo "▶️  Starting local Supabase..."
    npm run db:start
    ;;
  stop)
    echo "⏹️  Stopping local Supabase..."
    npm run db:stop
    ;;
  status)
    echo "📊 Checking Supabase status..."
    npm run db:status
    ;;
  studio)
    echo "🎨 Opening Supabase Studio..."
    echo "Visit: http://localhost:54323"
    npm run db:start
    ;;
  reset)
    echo "🔄 Resetting local database..."
    npm run db:reset
    ;;
  new)
    if [ -z "$2" ]; then
      echo "❌ Please provide a migration name"
      echo "Usage: ./scripts/supabase/supabase-dev.sh new my_migration_name"
      exit 1
    fi
    echo "📝 Creating new migration: $2"
    supabase migration new "$2"
    ;;
  diff)
    if [ -z "$2" ]; then
      echo "❌ Please provide a migration name"
      echo "Usage: ./scripts/supabase/supabase-dev.sh diff my_changes"
      exit 1
    fi
    echo "🔍 Generating migration from schema diff: $2"
    supabase db diff -f "$2"
    ;;
  *)
    echo "Supabase Development Commands"
    echo "=============================="
    echo ""
    echo "Usage: ./scripts/supabase/supabase-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - Full setup: link cloud, pull, start, reset (first time)"
    echo "  push      - Push local migrations to cloud"
    echo "  pull      - Pull migrations from cloud and reset local"
    echo "  start     - Start local Supabase services"
    echo "  stop      - Stop local Supabase services"
    echo "  status    - Show status of local services"
    echo "  studio    - Open Supabase Studio (http://localhost:54323)"
    echo "  reset     - Reset local database (reapply all migrations)"
    echo "  new       - Create new migration: ./scripts/supabase/supabase-dev.sh new migration_name"
    echo "  diff      - Generate migration from changes: ./scripts/supabase/supabase-dev.sh diff migration_name"
    echo ""
    echo "Examples:"
    echo "  ./scripts/supabase/supabase-dev.sh setup"
    echo "  ./scripts/supabase/supabase-dev.sh new add_user_table"
    echo "  ./scripts/supabase/supabase-dev.sh diff my_schema_changes"
    echo "  ./scripts/supabase/supabase-dev.sh push"
    ;;
esac
