# Architecture

## Technology Stack
- **Framework**: Next.js App Router (React)
- **Language**: Strict TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage)
- **Forms & Validation**: React Hook Form, Zod
- **PDF Generation**: `@react-pdf/renderer`
- **Testing**: Vitest (Unit/Integration), Playwright (E2E)
- **Deployment**: Vercel-compatible

## Proposed File Structure
```text
app/
  (auth)/
    login/
      page.tsx
  (dashboard)/
    page.tsx       # Home screen
    create/
      page.tsx     # Create stock sheet form
    [id]/
      page.tsx     # View/edit stock sheet
  api/             # Next.js API routes (if needed for secure processing)
components/
  ui/              # shadcn/ui components
  forms/           # Form components (StockSheetForm, etc.)
  pdf/             # PDF generation components
  layout/          # Header, Sidebar, etc.
lib/
  supabase/        # Supabase client setup (browser and server)
  utils.ts         # Utility functions
  validations.ts   # Zod schemas
types/             # TypeScript type definitions
docs/              # Project documentation
```

## Data Flow
- **Client**: Forms capture user input. React Hook Form manages state, Zod handles client-side validation.
- **Server Actions / API**: Next.js Server Actions validate the incoming data securely using Zod, recalculate the total quantity, and interact with Supabase using the authenticated server client.
- **Storage**: Images are uploaded to a private Supabase Storage bucket. URLs are resolved via authenticated endpoints (signed URLs) so they are not publicly accessible.
- **Database**: PostgreSQL with Row Level Security ensuring only authenticated administrators can access the `stock_sheets` table.
