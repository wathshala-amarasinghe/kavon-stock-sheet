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

## Phase 3: Dashboard & Form UI (Frontend)
**Goal**: Build the user interface for viewing and creating stock sheets.
- Implement the Home screen listing saved sheets.
- Build the Stock Sheet form using React Hook Form, Zod, and shadcn/ui.
- Implement responsive design and accessible form controls.
- **Acceptance Criteria**: UI matches design references and handles client-side validation (with clear loading/error states).

## Phase 4: Integration & Server Actions (Backend)
**Goal**: Connect the frontend forms to the database and storage.
- Implement Server Actions for saving, editing, and archiving stock sheets.
- Ensure server-side total recalculation.
- Handle image uploads to private storage.
- **Acceptance Criteria**: Admin can successfully create, edit, view, and archive a stock sheet.

## Phase 5: PDF Generation
**Goal**: Allow preview and download of branded PDFs.
- Create PDF template using `@react-pdf/renderer`.
- Integrate KAVON branding (colors, logo, footer).
- Implement PDF preview and download functionality.
- **Acceptance Criteria**: Generated PDF accurately reflects stock sheet data and matches branding requirements.

## Phase 6: Testing & Optimization
**Goal**: Ensure reliability and quality.
- Write Vitest unit tests for calculations and validation.
- Write Playwright E2E tests for the primary flows (login, create, generate PDF).
- **Acceptance Criteria**: Tests pass consistently. No secrets exposed.
