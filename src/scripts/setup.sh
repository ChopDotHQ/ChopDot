#!/bin/bash

# ChopDot Quick Setup Script
# Automates initial setup for development

set -e

echo "🚀 ChopDot Setup Script"
echo "======================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created"
    echo -e "${YELLOW}⚠${NC}  Please edit .env and add your WalletConnect Project ID"
    echo ""
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker is not installed"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker Compose is installed"
echo ""

# Ask user what to do
echo "What would you like to do?"
echo "1) Start with Docker (recommended)"
echo "2) Set up for local development"
echo "3) Exit"
echo ""
read -p "Choose an option (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🐳 Starting ChopDot with Docker..."
        echo ""
        
        # Start services
        docker-compose up -d
        
        echo ""
        echo "⏳ Waiting for services to be healthy..."
        sleep 10
        
        # Initialize database
        echo ""
        echo "📊 Initializing database..."
        docker-compose exec -T postgres psql -U chopdot -d chopdot -f /docker-entrypoint-initdb.d/01-schema.sql 2>/dev/null || echo "Schema already initialized"
        
        echo ""
        echo -e "${GREEN}✓${NC} ChopDot is running!"
        echo ""
        echo "📱 Frontend: http://localhost:3000"
        echo "🔧 API: http://localhost:3001"
        echo "🗄️  pgAdmin: http://localhost:5050"
        echo ""
        echo "View logs with: docker-compose logs -f"
        echo "Stop with: docker-compose down"
        ;;
        
    2)
        echo ""
        echo "💻 Setting up local development..."
        echo ""
        
        # Check for Node.js
        if ! command -v node &> /dev/null; then
            echo -e "${RED}✗${NC} Node.js is not installed"
            echo "Please install Node.js 20+: https://nodejs.org/"
            exit 1
        fi
        
        echo -e "${GREEN}✓${NC} Node.js is installed"
        
        # Install frontend dependencies
        echo ""
        echo "📦 Installing frontend dependencies..."
        npm install
        
        # Install backend dependencies
        echo ""
        echo "📦 Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        
        echo ""
        echo -e "${GREEN}✓${NC} Dependencies installed"
        
        # Check for PostgreSQL
        if ! command -v psql &> /dev/null; then
            echo ""
            echo -e "${YELLOW}⚠${NC}  PostgreSQL is not installed"
            echo "You need PostgreSQL to run ChopDot locally."
            echo ""
            echo "Install options:"
            echo "  macOS: brew install postgresql@16"
            echo "  Ubuntu: sudo apt install postgresql-16"
            echo ""
            echo "Or use Docker for just the database:"
            echo "  docker-compose up -d postgres"
            echo ""
        else
            echo -e "${GREEN}✓${NC} PostgreSQL is installed"
            
            # Ask to create database
            read -p "Create database 'chopdot'? (y/n): " create_db
            if [ "$create_db" = "y" ]; then
                createdb chopdot 2>/dev/null && echo -e "${GREEN}✓${NC} Database created" || echo -e "${YELLOW}⚠${NC}  Database already exists or creation failed"
                
                # Run migrations
                echo ""
                echo "📊 Running database migrations..."
                psql -d chopdot -f database/init/01-schema.sql && echo -e "${GREEN}✓${NC} Schema initialized"
            fi
        fi
        
        echo ""
        echo -e "${GREEN}✓${NC} Local development setup complete!"
        echo ""
        echo "To start development servers:"
        echo "  Terminal 1: cd backend && npm run dev"
        echo "  Terminal 2: npm run dev"
        echo ""
        ;;
        
    3)
        echo "Exiting..."
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "📚 Documentation:"
echo "  Setup Guide: docs/SETUP_GUIDE.md"
echo "  Auth System: docs/AUTH_SYSTEM.md"
echo "  API Docs: docs/BACKEND_API.md"
echo "  Quick Start: docs/AUTH_AND_DATABASE_README.md"
echo ""
echo "🎉 Happy coding!"
