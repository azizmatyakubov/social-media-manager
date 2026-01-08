# Automated X Posting Service - Project Plan

## Overview
A web service that automatically posts to X (Twitter) on behalf of indie hackers to improve their engagement. Users can log in, connect their X account, provide instructions, and the system posts daily.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL with Prisma ORM |
| Authentication | NextAuth.js |
| AI | OpenAI API (GPT-4) |
| Scheduler | Vercel Cron / node-cron |
| Deployment | Vercel |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   PostgreSQL    │     │    X API v2     │
│  (Frontend +    │     │   (Database)    │     │   (Twitter)     │
│   API Routes)   │     └─────────────────┘     └─────────────────┘
└────────┬────────┘              ▲                       ▲
         │                       │                       │
         ▼                       │                       │
┌─────────────────┐     ┌───────┴───────┐     ┌────────┴────────┐
│   NextAuth.js   │     │  Prisma ORM   │     │  Posting Service │
│ (Authentication)│     │               │     │  (Cron Job)      │
└─────────────────┘     └───────────────┘     └─────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │   OpenAI API    │
                                              │ (Content Gen)   │
                                              └─────────────────┘
```

## Database Schema

### Users
- id, email, name, password (hashed), createdAt, updatedAt

### XAccounts
- id, userId, xUserId, xUsername, accessToken (encrypted), refreshToken (encrypted), tokenExpiresAt

### PostingConfigs
- id, userId, instructions, tone, topics[], postingTime, isActive, createdAt, updatedAt

### Posts
- id, userId, content, postedAt, xPostId, status (pending/posted/failed)

## Features

### Phase 1 - Core
- User registration and login
- X OAuth connection
- Basic dashboard
- Manual post generation with AI
- Manual posting to X

### Phase 2 - Automation
- Posting configuration (instructions, tone, schedule)
- Daily automated posting via cron
- Post history view

### Phase 3 - Enhancement
- Post preview and approval workflow
- Multiple posting times per day
- Analytics dashboard
- Content calendar view

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/* | NextAuth endpoints |
| GET | /api/x/connect | Initiate X OAuth |
| GET | /api/x/callback | X OAuth callback |
| GET | /api/config | Get posting config |
| PUT | /api/config | Update posting config |
| POST | /api/posts/generate | Generate post with AI |
| POST | /api/posts/publish | Publish post to X |
| GET | /api/posts | Get post history |
| POST | /api/cron/daily-post | Cron endpoint for daily posting |

## Security Considerations

- Store X tokens encrypted in database
- Use environment variables for all API keys
- Implement rate limiting
- Validate all user inputs
- Use HTTPS only
- Implement CSRF protection (handled by NextAuth)

## External Services Required

1. **X Developer Account**
   - Create app at developer.twitter.com
   - Get API Key, API Secret, Bearer Token
   - Configure OAuth 2.0 with PKCE

2. **OpenAI Account**
   - Get API key from platform.openai.com

3. **Database Hosting**
   - Supabase (free tier available)
   - Or PlanetScale, Neon, Railway

4. **Deployment**
   - Vercel (free tier available)
