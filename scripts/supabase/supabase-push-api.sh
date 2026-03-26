#!/bin/bash
# Push migrations using Supabase Management API
# This bypasses the database connection entirely

set -e

PROJECT_REF="jpzacnkirymlyxwmafox"

echo "🔐 Supabase API Migration Push"
echo "==============================="
echo ""

# Check for Supabase access token
if [ -f ~/.supabase/access-token ]; then
    ACCESS_TOKEN=$(cat ~/.supabase/access-token)
elif [ ! -z "$SUPABASE_ACCESS_TOKEN" ]; then
    ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN"
else
    echo "Need to login to Supabase first..."
    supabase login
    ACCESS_TOKEN=$(cat ~/.supabase/access-token)
fi

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Could not get access token"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Get list of local migrations
echo "📋 Local migrations to push:"
for migration in supabase/migrations/*.sql; do
    if [[ ! "$migration" =~ \.backup$ ]] && [[ ! "$migration" =~ \.gitkeep$ ]]; then
        filename=$(basename "$migration")
        echo "  - $filename"
    fi
done

echo ""
echo "📤 Pushing migrations via Management API..."
echo ""

# Use supabase db push with the management API
if supabase db push --linked; then
    echo ""
    echo "✅ Successfully pushed all migrations!"
else
    echo ""
    echo "❌ Push failed"
    echo ""
    echo "Trying alternative method: direct SQL execution..."
    echo ""
    
    # Alternative: Execute migrations one by one via PostgREST
    for migration in supabase/migrations/*.sql; do
        if [[ ! "$migration" =~ \.backup$ ]] && [[ ! "$migration" =~ \.gitkeep$ ]]; then
            filename=$(basename "$migration")
            echo "Applying $filename..."
            
            # Read migration content
            SQL_CONTENT=$(cat "$migration")
            
            # Execute via Supabase SQL endpoint
            response=$(curl -s -w "\n%{http_code}" \
                -X POST \
                "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
                -H "Authorization: Bearer $ACCESS_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}")
            
            http_code=$(echo "$response" | tail -n1)
            body=$(echo "$response" | head -n-1)
            
            if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
                echo "  ✅ Applied successfully"
            else
                echo "  ⚠️  Got HTTP $http_code"
                echo "  Response: $body"
            fi
        fi
    done
fi

echo ""
echo "Done!"
