# HousePadi - Setup Guide

## Prerequisites

You should already have:
- Supabase project created with URL and ANON_KEY
- Cloudflare R2 bucket created with credentials
- Environment variables configured

## 1. Supabase Database Setup

Run the SQL schema in your Supabase project:

1. Go to Supabase Dashboard → Your Project
2. Navigate to SQL Editor
3. Create a new query and paste the contents of `lib/supabase/schema.sql`
4. Execute the query

This will create all necessary tables with Row Level Security (RLS) policies.

## 2. Cloudflare R2 Configuration

Ensure you have set these environment variables:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

### R2 CORS Configuration

Add CORS rules to your R2 bucket to allow uploads from your domains:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

## 3. Supabase Environment Variables

Ensure these are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Feature Overview

### Landing Page
- Hero section with call-to-action
- Features showcase with testimonials
- Pricing plans
- Footer with links

### User Authentication
- Sign up and login pages
- Email verification
- Session management
- Protected routes

### Dashboard
- Content library view
- Upload .glb files and thumbnails
- Content management
- User settings

### Admin Panel
- User management
- Content moderation
- Platform analytics
- Settings

### File Storage
- Cloudflare R2 Storage integration
- Automatic thumbnail handling
- File metadata tracking
- Secure access controls

## 5. Running the Application

```bash
pnpm dev
```

Visit `http://localhost:3000` to access the application.

## 6. Deployment

Deploy to Vercel using the Vercel CLI or GitHub integration:

```bash
vercel
```

Make sure all environment variables are configured in Vercel project settings.
