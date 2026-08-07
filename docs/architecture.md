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

## Authentication & Registration
Authentication relies on the standard `@supabase/ssr` library.
1. The client sends login credentials to Next.js Server Actions.
2. The server action calls `signInWithPassword` and Supabase sets a session cookie.
3. The `middleware` (via `proxy.ts`) ensures unauthenticated users are forcefully redirected to `/login` before accessing the dashboard.

### Public Registration & Immediate Access
- The application supports **Public User Registration** without administrator approval to allow immediate access.
- **Supabase Manual Setting**: In the Supabase Dashboard, "Allow new users to sign up" must be Enabled, and "Confirm email" must be Disabled.
- **Security Trade-off**: Users can register using an email address without proving ownership. Password recovery depends on access to that email. A production CAPTCHA (e.g., Cloudflare Turnstile or hCaptcha) and strict rate-limiting are strongly recommended to prevent abuse.
- **Profiles**: A database trigger (`on_auth_user_created`) securely synchronizes new registrations into the `profiles` table.

### Secure Logout
- Logout is handled securely via `logoutAction`, which logs the activity event, destroys the session using `supabase.auth.signOut()`, and redirects to `/login`. Protected pages are guarded by server-side checks and will redirect if accessed via the browser's Back button post-logout.

## Activity Auditing
- **Schema**: The `activity_logs` table stores sanitized, append-only metadata for user actions (`account_created`, `login`, `logout`, `stock_sheet_created`, `stock_sheet_updated`, `design_image_replaced`, `stock_sheet_archived`, `stock_sheet_restored`, `pdf_previewed`, `pdf_downloaded`).
- **Insertion**: Clients cannot directly insert, update, or delete activity logs. Logging is handled securely on the backend via the `log_user_activity` RPC (configured with `SECURITY DEFINER`) or embedded directly inside the transactional RPCs for stock-sheet mutations to ensure data integrity.

## Cross-Account Isolation (Ownership Protection)
- Public registration does not weaken the ownership model. Every core table (`stock_sheets`, `stock_sheet_quantities`, `activity_logs`, `profiles`) relies heavily on `auth.uid()` through Row Level Security (RLS).
- **Storage Isolation**: The `kavon-designs` bucket policies strictly validate ownership, ensuring users can only read, write, and replace their own private images. Storage paths are isolated by `user_id`.

## Data Flow
- **Client**: Forms capture user input. React Hook Form manages state, Zod handles client-side validation.
- **Server Actions**: Next.js Server Actions validate the incoming data securely using Zod, recalculate the total quantity, and interact with Supabase using the authenticated server client.
- **Storage**: Images are uploaded to a private Supabase Storage bucket. URLs are resolved via authenticated endpoints (signed URLs) so they are not publicly accessible.
- **Database**: PostgreSQL with Row Level Security ensuring only authenticated administrators can access the `stock_sheets` table.

## PDF Generation
The system includes a PDF generation pipeline at `app/api/stock-sheets/[id]/pdf/route.ts` which uses `@react-pdf/renderer` in a Node.js runtime and processes private images securely via `sharp` before embedding them.
