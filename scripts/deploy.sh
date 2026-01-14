#!/bin/bash

# Social Media Manager Deployment Script
# Run this script to deploy the application

set -e

echo "=========================================="
echo "Social Media Manager Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/home/aziz/social-media-manager"
cd $PROJECT_DIR

echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}Node.js not found! Please install Node.js 20+${NC}"
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo -e "${GREEN}PostgreSQL installed${NC}"
else
    echo -e "${RED}PostgreSQL not found! Please install PostgreSQL${NC}"
    exit 1
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}PM2 installed${NC}"
else
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
fi

echo -e "${YELLOW}Step 2: Setting up environment...${NC}"

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}.env file not found! Please create .env from .env.example${NC}"
    exit 1
fi

# Generate NEXTAUTH_SECRET if not set properly
if grep -q 'your-secret-key-change-this-in-production' .env; then
    echo -e "${YELLOW}Generating new NEXTAUTH_SECRET...${NC}"
    NEW_SECRET=$(openssl rand -base64 32)
    sed -i "s/your-secret-key-change-this-in-production/$NEW_SECRET/" .env
    echo -e "${GREEN}NEXTAUTH_SECRET generated${NC}"
fi

echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
npm ci --production=false

echo -e "${YELLOW}Step 4: Setting up database...${NC}"

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw social_media_manager; then
    echo -e "${GREEN}Database exists${NC}"
else
    echo -e "${YELLOW}Creating database and user...${NC}"

    # Extract password from DATABASE_URL
    DB_PASSWORD=$(grep DATABASE_URL .env | cut -d':' -f3 | cut -d'@' -f1)

    sudo -u postgres psql <<EOF
CREATE USER aziz WITH PASSWORD '$DB_PASSWORD' CREATEDB;
CREATE DATABASE social_media_manager OWNER aziz;
GRANT ALL PRIVILEGES ON DATABASE social_media_manager TO aziz;
EOF
    echo -e "${GREEN}Database created${NC}"
fi

echo -e "${YELLOW}Step 5: Running Prisma migrations...${NC}"
npx prisma generate
npx prisma db push

echo -e "${YELLOW}Step 6: Building application...${NC}"
npm run build

echo -e "${YELLOW}Step 7: Setting up PM2...${NC}"

# Stop existing process if running
pm2 stop social-media-manager 2>/dev/null || true
pm2 delete social-media-manager 2>/dev/null || true

# Start with PM2
pm2 start npm --name "social-media-manager" -- start
pm2 save

echo -e "${GREEN}=========================================="
echo "Deployment complete!"
echo ""
echo "Application is running on port 3000"
echo "Use 'pm2 logs social-media-manager' to view logs"
echo "Use 'pm2 status' to check status"
echo ""
echo "Next steps:"
echo "1. Configure nginx reverse proxy"
echo "2. Set up SSL with certbot"
echo "3. Configure your domain DNS"
echo "==========================================${NC}"
