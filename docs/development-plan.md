# Phased Implementation Plan

## Phase 1: Project Setup & Authentication [COMPLETED]
**Goal**: Initialize the foundation and secure the application.
- [x] Set up Supabase project, database tables, and RLS policies. (Completed via migration `202608060001_kavon_initial_schema.sql`)
- [x] Configure Next.js with Supabase Auth.
- [x] Implement the Login page.
- **Acceptance Criteria**: Admin can log in; unauthorized users are redirected to login.

## Phase 2: Database & Storage Configuration [COMPLETED]
**Goal**: Set up data models and secure file storage.
- [x] Create `stock_sheets` table with required fields.
- [x] Configure private Supabase Storage bucket for images (max 10MB, JPG/PNG/WebP).
- [ ] Implement server-side logic for total calculation.
- **Acceptance Criteria**: Database schema is applied; storage bucket accepts only valid files from authenticated users.

## Phase 3: Dashboard & Form UI (Frontend) [COMPLETED]
**Goal**: Build the user interface for viewing and creating stock sheets.
- [x] Implement the Home screen listing saved sheets.
- [ ] Build the Stock Sheet form using React Hook Form, Zod, and shadcn/ui.
- [x] Implement responsive design and accessible form controls.
- **Acceptance Criteria**: UI matches design references and handles client-side validation (with clear loading/error states).

## Phase 4: Integration & Server Actions (Backend) [COMPLETED]
**Goal**: Connect the form to the database securely.
- [x] Create server action `createStockSheet` to handle form submission.
- [x] Securely handle image uploads using signed URLs and random UUIDs.
- [x] Implement the `create_stock_sheet_transaction` Postgres function to ensure the stock sheet and quantities save atomically.
- [x] Revalidate paths to update the dashboard.
- **Acceptance Criteria**: Form correctly saves data and image; errors are gracefully handled without leaving orphan files.

## Phase 5: Details and Edit Stock Sheet [COMPLETED]
**Goal**: View stock sheet details and allow transactional updates with image replacement.
- [x] Create Details page (`/stock-sheets/[id]`) with image preview.
- [x] Create Edit page (`/stock-sheets/[id]/edit`) using pre-populated form.
- [x] Create Postgres function `update_stock_sheet_transaction` to atomically update the sheet and quantities.
- [x] Implement secure image replacement logic (delete old image only after successful DB update).
- **Acceptance Criteria**: Admin can successfully view and edit a stock sheet, and the image can be replaced cleanly without leaving orphans.

## Phase 6: Testing & Optimization
**Goal**: Ensure reliability and quality.
- Write Vitest unit tests for calculations and validation.
- Write Playwright E2E tests for the primary flows (login, create, generate PDF).
- **Acceptance Criteria**: Tests pass consistently. No secrets exposed.
