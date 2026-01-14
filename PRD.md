# Product Requirements Document (PRD)
# AutoPost - Social Media Management Platform

**Version:** 1.0
**Last Updated:** January 2026
**Status:** In Development

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Target Users](#3-target-users)
4. [Feature Specifications](#4-feature-specifications)
5. [Technical Architecture](#5-technical-architecture)
6. [Database Schema](#6-database-schema)
7. [API Specifications](#7-api-specifications)
8. [UI/UX Requirements](#8-uiux-requirements)
9. [Security Requirements](#9-security-requirements)
10. [Performance Requirements](#10-performance-requirements)
11. [Implementation Status](#11-implementation-status)
12. [Deployment Requirements](#12-deployment-requirements)

---

## 1. Executive Summary

AutoPost is an AI-powered social media management platform designed to help creators, businesses, and agencies grow their presence on X (Twitter) and 7 other platforms. The platform combines scheduling, AI content generation, viral analytics, and automation features into one unified dashboard.

### Key Differentiators
- **8 Platform Support:** X, LinkedIn, Instagram, TikTok, YouTube, Pinterest, Bluesky, Threads
- **AI-First Approach:** GPT-4 powered content generation, viral prediction, voice learning
- **Unique Features:** Conditional posting, smart reply queue, hook generator, best time AI
- **Affordable Pricing:** Enterprise features at creator-friendly prices ($19/mo starting)

---

## 2. Product Vision

### Mission Statement
Empower creators and businesses to build their social media presence efficiently through AI-powered automation, without sacrificing authenticity.

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Active Users | 50,000 | Database count |
| User Retention (30-day) | 80% | Analytics |
| Posts Scheduled/Month | 1M+ | Database count |
| NPS Score | 70+ | Survey |
| MRR | $100K+ | Stripe |

---

## 3. Target Users

### Primary Personas

#### 3.1 Solo Creator
- **Profile:** Content creator, indie hacker, solopreneur
- **Pain Points:** Time-consuming posting, inconsistent engagement, can't afford expensive tools
- **Needs:** AI content generation, scheduling, basic analytics
- **Plan:** Creator ($19/mo)

#### 3.2 Professional Creator
- **Profile:** Full-time creator, influencer, consultant
- **Pain Points:** Managing multiple platforms, tracking competitors, scaling content
- **Needs:** Multi-platform, viral library, A/B testing, team features
- **Plan:** Pro ($49/mo)

#### 3.3 Agency/Business
- **Profile:** Marketing agency, SMB marketing team
- **Pain Points:** Multiple clients, approval workflows, reporting
- **Needs:** Workspaces, white-label reports, API access
- **Plan:** Business ($99/mo)

---

## 4. Feature Specifications

### 4.1 Authentication System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Email/Password Login | ✅ Complete | P1 | NextAuth + Prisma |
| Email/Password Register | ✅ Complete | P1 | bcrypt hashing |
| Session Management | ✅ Complete | P1 | JWT strategy |
| Password Reset | ❌ Missing | P2 | Need email integration |
| OAuth (Google) | ❌ Missing | P3 | Optional |
| OAuth (GitHub) | ❌ Missing | P3 | Optional |
| 2FA | ❌ Missing | P3 | TOTP |

### 4.2 X (Twitter) Integration
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| OAuth 2.0 Connection | ✅ Complete | P1 | PKCE flow |
| Token Refresh | ✅ Complete | P1 | Auto-refresh |
| Post Tweet | ✅ Complete | P1 | Text only |
| Post Thread | ⚠️ Partial | P1 | Logic exists, needs testing |
| Media Upload | ❌ Missing | P1 | Images/videos |
| Delete Tweet | ❌ Missing | P2 | |
| Get Analytics | ❌ Missing | P2 | Requires elevated access |
| Get Mentions | ❌ Missing | P2 | |
| Reply to Tweet | ❌ Missing | P2 | |

### 4.3 Multi-Platform Integrations
| Platform | Status | Priority | Notes |
|----------|--------|----------|-------|
| LinkedIn | ⚠️ Partial | P2 | OAuth started |
| Instagram | ⚠️ Partial | P2 | OAuth started |
| TikTok | ⚠️ Partial | P3 | OAuth started |
| YouTube | ⚠️ Partial | P3 | OAuth started |
| Pinterest | ⚠️ Partial | P3 | OAuth started |
| Bluesky | ⚠️ Partial | P2 | ATP protocol |
| Threads | ❌ Missing | P3 | No public API yet |

### 4.4 Content Management
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Create Post | ✅ Complete | P1 | |
| Edit Post | ✅ Complete | P1 | |
| Delete Post | ✅ Complete | P1 | |
| Schedule Post | ✅ Complete | P1 | |
| Draft Posts | ✅ Complete | P1 | |
| Post Queue | ✅ Complete | P1 | |
| Content Calendar | ✅ Complete | P1 | |
| Content Categories | ✅ Complete | P2 | Buckets |
| Thread Editor | ⚠️ Partial | P1 | Needs polish |
| Media Library | ❌ Missing | P2 | |

### 4.5 AI Features
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Post Generation | ✅ Complete | P1 | GPT-4o-mini |
| Thread Generation | ✅ Complete | P1 | |
| Viral Prediction | ✅ Complete | P1 | Enhanced version |
| Voice Learning | ✅ Complete | P2 | |
| Hook Generator | ✅ Complete | P1 | 10 types |
| Best Time AI | ✅ Complete | P1 | Personalized |
| Smart Reply Queue | ✅ Complete | P1 | |
| AI Copilot/Strategy | ✅ Complete | P2 | |
| Content Repurposing | ✅ Complete | P2 | |
| Image Generation | ⚠️ Partial | P2 | DALL-E |

### 4.6 Automation
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Scheduled Posting Cron | ✅ Complete | P1 | |
| Auto-Retweet Evergreen | ✅ Complete | P2 | |
| Auto-DM on Keywords | ✅ Complete | P2 | |
| RSS Feed Auto-Post | ✅ Complete | P2 | |
| Conditional Posting | ✅ Complete | P2 | Unique feature |
| Auto-Reply | ⚠️ Partial | P3 | |

### 4.7 Analytics
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Post Performance | ⚠️ Partial | P1 | Local tracking |
| Engagement Metrics | ⚠️ Partial | P1 | Needs API |
| Follower Growth | ❌ Missing | P2 | |
| Best Performing Content | ✅ Complete | P2 | |
| Competitor Tracking | ✅ Complete | P2 | |
| Website Analytics | ✅ Complete | P3 | |
| White-Label Reports | ✅ Complete | P3 | |

### 4.8 Team Features
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Workspaces | ✅ Complete | P2 | |
| Team Members | ✅ Complete | P2 | |
| Role Permissions | ✅ Complete | P2 | Owner/Admin/Editor/Member |
| Approval Workflow | ✅ Complete | P2 | |
| Activity Logs | ✅ Complete | P2 | |
| Workspace Invites | ✅ Complete | P2 | |

### 4.9 Subscription & Billing
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Plan Definitions | ✅ Complete | P1 | 4 tiers |
| Usage Tracking | ✅ Complete | P1 | |
| Feature Gating | ✅ Complete | P1 | |
| Stripe Checkout | ⚠️ Partial | P1 | Needs testing |
| Stripe Webhooks | ⚠️ Partial | P1 | |
| Customer Portal | ⚠️ Partial | P1 | |
| Trial Period | ❌ Missing | P2 | |

### 4.10 Notifications
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Email Notifications | ⚠️ Partial | P2 | Template exists |
| Post Published | ⚠️ Partial | P2 | |
| Post Failed | ⚠️ Partial | P2 | |
| Weekly Digest | ❌ Missing | P3 | |
| In-App Notifications | ❌ Missing | P3 | |

---

## 5. Technical Architecture

### 5.1 Stack Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 16 (App Router) + React 19 + Tailwind CSS 4            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                         BACKEND                                  │
│  Next.js API Routes + NextAuth.js + Prisma ORM                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                        DATABASE                                  │
│  PostgreSQL                                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  OpenAI API │ X API v2 │ Stripe │ Email Provider                │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 File Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes (82 endpoints)
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── layout/            # Layout components
│   └── providers/         # Context providers
├── lib/                   # Core business logic (38 files)
│   ├── platforms/         # Platform integrations
│   ├── auth.ts           # Authentication config
│   ├── prisma.ts         # Database client
│   └── openai.ts         # AI integration
└── types/                 # TypeScript definitions
```

### 5.3 Environment Variables Required
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# X (Twitter) API
X_CLIENT_ID="..."
X_CLIENT_SECRET="..."

# OpenAI
OPENAI_API_KEY="..."

# Stripe
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="..."

# Email (optional)
SMTP_HOST="..."
SMTP_PORT="..."
SMTP_USER="..."
SMTP_PASS="..."
EMAIL_FROM="..."
```

---

## 6. Database Schema

### 6.1 Core Models (24 total)

**User Management:**
- User, Account, Session, VerificationToken

**Social Accounts:**
- XAccount, LinkedInAccount, InstagramAccount, TikTokAccount
- YouTubeAccount, PinterestAccount, BlueskyAccount

**Content:**
- Post, Thread, PostingConfig, VoiceProfile, TrendCache

**Calendar & Categories:**
- ContentCalendar, CalendarSlot, ContentCategory

**Team:**
- Workspace, WorkspaceMember, WorkspaceInvite, ApprovalRequest, ActivityLog

**Automation:**
- AutoDmRule, RssFeed, ConditionalRule

**Analytics:**
- DailyMetrics, Competitor, CompetitorSnapshot, WebsiteAnalytics

**Engagement:**
- Mention, SuggestedReply, InboxMessage

**A/B Testing:**
- ABTest, ABTestVariant

**Content Tools:**
- GeneratedImage, RepurposedContent, QuoteTemplate, ViralTweet, SavedViralTweet

**AI:**
- AiStrategy

**Billing:**
- Subscription, Usage

**Notifications:**
- NotificationSettings, EmailNotification

**Integrations:**
- Integration, Webhook, WebhookEvent

**Instagram:**
- GridPlan, BrandReport

---

## 7. API Specifications

### 7.1 API Endpoint Summary (82 routes)

#### Authentication (3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/[...nextauth] | NextAuth handlers |
| GET | /api/auth/[...nextauth] | NextAuth handlers |

#### Posts (10)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/posts | List user's posts |
| POST | /api/posts | Create post |
| GET | /api/posts/[id] | Get single post |
| PATCH | /api/posts/[id] | Update post |
| DELETE | /api/posts/[id] | Delete post |
| POST | /api/posts/generate | AI generate post |
| POST | /api/posts/publish | Publish post |
| POST | /api/posts/schedule | Schedule post |
| POST | /api/posts/predict | Predict viral score |
| POST | /api/posts/predict-enhanced | Enhanced prediction |

#### X Integration (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/x/connect | Start OAuth |
| GET | /api/x/callback | OAuth callback |
| GET | /api/x/accounts | List connected accounts |
| POST | /api/x/disconnect | Disconnect account |
| POST | /api/x/post | Post tweet |

#### AI Features (6)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/hooks | Hook generator |
| GET | /api/best-time | Best time analysis |
| GET | /api/reply-queue | Smart reply queue |
| POST | /api/reply-queue | Approve reply |
| POST | /api/ai-copilot | Strategy generator |
| POST | /api/repurpose | Content repurposing |

#### Scheduling & Automation (12)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/calendar | Get calendar |
| POST | /api/calendar | Create calendar |
| GET | /api/calendar/slots | Get slots |
| POST | /api/cron/scheduled-posts | Process scheduled |
| POST | /api/cron/auto-retweet | Auto retweet |
| POST | /api/cron/rss-feeds | Process RSS |
| POST | /api/cron/conditional-check | Check conditions |
| GET | /api/rss-feeds | List feeds |
| POST | /api/rss-feeds | Create feed |
| GET | /api/conditional-rules | List rules |
| POST | /api/conditional-rules | Create rule |
| POST | /api/auto-dm | Auto DM config |

#### Analytics (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics | Get analytics |
| GET | /api/analytics/dashboard | Dashboard data |
| GET | /api/competitors | List competitors |
| POST | /api/competitors | Add competitor |
| GET | /api/website-analytics | Website stats |

#### Subscription (4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/subscription | Get subscription |
| POST | /api/subscription/checkout | Create checkout |
| POST | /api/subscription/portal | Customer portal |
| POST | /api/webhooks/stripe | Stripe webhooks |

#### (+ 37 more endpoints for other features)

---

## 8. UI/UX Requirements

### 8.1 Design System
- **Primary Color:** Indigo (#6366F1)
- **Background:** Black (#000000)
- **Text:** White/Zinc variations
- **Style:** Dark mode, glass morphism, gradients
- **Framework:** Tailwind CSS v4

### 8.2 Page Requirements

#### Landing Page (/)
- [x] Hero section with value prop
- [x] Platform icons
- [x] Feature grid (9 features)
- [x] Comparison table
- [x] Testimonials
- [x] Pricing preview
- [x] CTA sections
- [x] Footer

#### Dashboard (/dashboard)
- [x] Quick composer
- [x] Post queue
- [x] Activity panel
- [x] Status bar
- [x] X connection warning

#### Additional Pages (30 total)
- See implementation status below

---

## 9. Security Requirements

### 9.1 Authentication
- [x] Password hashing (bcrypt)
- [x] JWT session tokens
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] 2FA support

### 9.2 API Security
- [x] Session validation on all routes
- [x] User ID scoping
- [ ] API rate limiting
- [ ] Input validation (partial)

### 9.3 Data Protection
- [x] OAuth tokens stored securely
- [ ] Token encryption at rest
- [ ] PII handling compliance

---

## 10. Performance Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Page Load (LCP) | < 2.5s | Next.js SSR |
| Time to Interactive | < 3s | |
| API Response | < 500ms | 95th percentile |
| Database Queries | < 100ms | Indexed |
| AI Generation | < 5s | OpenAI latency |

---

## 11. Implementation Status

### Overall Progress: ~75% Complete

### By Category:

| Category | Complete | Partial | Missing | Total |
|----------|----------|---------|---------|-------|
| Auth | 4 | 0 | 4 | 8 |
| X Integration | 5 | 2 | 4 | 11 |
| Multi-Platform | 0 | 6 | 1 | 7 |
| Content | 9 | 1 | 1 | 11 |
| AI Features | 8 | 1 | 0 | 9 |
| Automation | 5 | 1 | 0 | 6 |
| Analytics | 3 | 2 | 1 | 6 |
| Team | 6 | 0 | 0 | 6 |
| Billing | 3 | 3 | 1 | 7 |
| Notifications | 0 | 3 | 2 | 5 |

### Critical Missing Pieces (P1):
1. **Media Upload** - Can't post images/videos
2. **Stripe Integration Testing** - Billing not verified
3. **Database Setup** - Not deployed
4. **Production Deployment** - Not deployed

---

## 12. Deployment Requirements

### 12.1 Infrastructure
- **Server:** Ubuntu 22.04+ VPS
- **Web Server:** Nginx (reverse proxy)
- **Process Manager:** PM2
- **Database:** PostgreSQL 14+
- **Node.js:** v20+

### 12.2 Deployment Checklist
- [ ] Set up PostgreSQL database
- [ ] Run Prisma migrations
- [ ] Configure environment variables
- [ ] Set up Nginx reverse proxy
- [ ] Configure SSL certificate
- [ ] Start with PM2
- [ ] Set up cron jobs
- [ ] Configure monitoring

### 12.3 Nginx Configuration
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 12.4 PM2 Ecosystem
```javascript
module.exports = {
  apps: [{
    name: 'autopost',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

## Appendix A: Competitor Analysis
See `/ROADMAP_TOP1_PERCENT.md`

## Appendix B: Database Schema
See `/prisma/schema.prisma`

---

**Document End**
