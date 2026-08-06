# KAVON Stock Sheet Architecture

## Overview
The KAVON Stock Sheet application is built on Next.js 16 using the App Router, with Supabase serving as the backend (Database, Auth, and Storage).

## Technology Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI + Tailwind)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth (SSR configuration)
- **Storage**: Supabase Storage (Private Buckets)

## Data Models
- `stock_sheets`: The primary table storing details about an order (Reference number, design name, garment colour, image path, status).
- `stock_sheet_quantities`: Stores size quantities for each stock sheet (S, M, L, XL, XXL).
- **PostgreSQL Functions**: 
  - `create_stock_sheet_transaction`: Atomically inserts a stock sheet and five quantities.
  - `update_stock_sheet_transaction`: Atomically updates a stock sheet (including replacement image validation) and its five quantities, while verifying ownership and ensuring it's not archived.

## Authentication
Authentication relies on the standard `@supabase/ssr` library.
1. The client sends login credentials to Next.js Server Actions.
2. The server action calls `signInWithPassword` and Supabase sets a session cookie.
3. The `middleware` (via `proxy.ts`) ensures unauthenticated users are forcefully redirected to `/login` before accessing the dashboard.

## Data Flow
- **Client**: Forms capture user input. React Hook Form manages state, Zod handles client-side validation.
- **Server Actions**: Next.js Server Actions validate the incoming data securely using Zod, recalculate the total quantity, and interact with Supabase using the authenticated server client.
- **Storage**: Images are uploaded to a private Supabase Storage bucket. URLs are resolved via authenticated endpoints (signed URLs) so they are not publicly accessible.
- **Database**: PostgreSQL with Row Level Security ensuring only authenticated administrators can access the `stock_sheets` table.

## PDF Generation
The system includes a PDF generation pipeline at `app/api/stock-sheets/[id]/pdf/route.ts` which uses `@react-pdf/renderer` in a Node.js runtime and processes private images securely via `sharp` before embedding them.
