#!/bin/bash

# ChopDot Database Reset Script
# CAUTION: This will delete all data!

set -e

echo "⚠️  Database Reset Script"
echo "========================"
echo ""
echo "This will DELETE ALL DATA in the ChopDot database!"
echo ""
read -p "Are you sure you want to continue? (type 'yes'): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🗑️  Resetting database..."

# Check if using Docker
if docker-compose ps postgres &> /dev/null; then
    echo "Using Docker database..."
    
    # Drop and recreate schema
    docker-compose exec -T postgres psql -U chopdot -d chopdot <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
EOF
    
    echo "✓ Schema dropped and recreated"
    
    # Reinitialize
    echo ""
    echo "📊 Reinitializing schema..."
    docker-compose exec -T postgres psql -U chopdot -d chopdot -f /docker-entrypoint-initdb.d/01-schema.sql
    
    echo "✓ Database reset complete!"
else
    # Local PostgreSQL
    echo "Using local PostgreSQL..."
    
    psql -d chopdot <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
EOF
    
    echo "✓ Schema dropped and recreated"
    
    # Reinitialize
    echo ""
    echo "📊 Reinitializing schema..."
    psql -d chopdot -f database/init/01-schema.sql
    
    echo "✓ Database reset complete!"
fi

echo ""
echo "🎉 Database is now fresh and empty!"
