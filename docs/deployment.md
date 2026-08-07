# KAVON Stock Sheet - Production Deployment Runbook

## Overview
This document outlines the steps required to deploy the application to Vercel, configure the Supabase production environment, and connect a custom domain.

## Production Architecture
Browser
  → Vercel-hosted Next.js application
  → Authenticated Supabase client/server client
  → Supabase Auth
  → Supabase PostgreSQL with RLS
  → Private kavon-designs Storage bucket
  → Server-side PDF generation

## 1. Vercel Project Configuration
- **Framework**: Next.js
- **Root Directory**: `./`
- **Node.js Version**: 20.x
- **Build Command**: `npm run build` (or Next.js default)
- **Install Command**: `npm install` (or Next.js default)
- **Production Branch**: `main`

## 2. Environment Variables
### Required for Production (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`: The Supabase project API URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The Supabase project anon/publishable key.

*Note: `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are automatically provided by Vercel.*

### Preview Environment Strategy
Preview deployments use the production Supabase database. However:
- Do not expose production administrator data through publicly accessible preview URLs.
- Vercel Deployment Protection should be used to restrict preview access.

## 3. Custom Domain Configuration (Vercel)
1. Open Vercel Project Settings > Domains.
2. Add the exact production domain (e.g., `kavon.com`).
3. Add the `www` or non-`www` alternative.
4. Choose the canonical production domain.
5. Redirect the alternative version to the canonical domain.
6. Use the exact DNS records displayed by Vercel in your DNS provider.

## 4. Supabase Auth Configuration
1. Open Supabase Dashboard > Authentication > URL Configuration.
2. Set **Site URL** to the exact final canonical HTTPS production origin (e.g., `https://kavon.com`).
3. Set **Redirect URLs** to include exact callback and recovery paths, e.g.:
   - `https://kavon.com/auth/callback`
   - `https://kavon.com/auth/confirm`

## 5. Supabase Database & Storage Verification
- Ensure all migrations (up to `202608060004_archive_restore_stock_sheets.sql`) are applied.
- Ensure the `kavon-designs` bucket is private and policies restrict access by authenticated ownership.

## 6. Live Verification Checklist
- [ ] Log in with the authorized administrator.
- [ ] Create a stock sheet with a valid image.
- [ ] Edit the stock sheet and verify the image replacement.
- [ ] Preview and download the PDF.
- [ ] Archive the stock sheet and verify it moves to the Archived view.
- [ ] Restore the stock sheet.
- [ ] Confirm ownership isolation (another account cannot access these records).

## 7. Rollback Process
**Application Rollback**:
- Identify the last known-good Vercel production deployment.
- Use Vercel’s supported rollback or promotion process.
- Confirm the custom domain points to the restored deployment.

**Database Rollback**:
- Do not reverse a migration unless a safe, reviewed rollback exists. Prefer a forward-fix migration.
- Do not delete data as part of rollback.

**Environment / Domain Rollback**:
- Redeploy after restoring prior configuration.
- Preserve the previous DNS values before changing them. Account for DNS propagation time.

## 8. Monitoring
Observe Vercel runtime logs and Supabase Auth/Database logs post-launch. Watch for 500 errors, function timeouts, and unexpected authorization failures.

## 9. Launch Details
- **Date Verified**: 2026-08-07
- **Commit SHA**: 186484d (Complete final QA and production hardening)
