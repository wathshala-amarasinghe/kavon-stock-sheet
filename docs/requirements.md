# Business Scope & Requirements

## Core Features
1. **Secure Administrator Login**
   - Administrators must be able to log in securely.
2. **Dashboard (Home Screen)**
   - Displays a list of previously saved stock sheets.
   - Contains a "Create New Stock Sheet" button.
3. **Stock Sheet Entity**
   - Automatically generated reference number.
   - Design name.
   - Uploaded T-shirt design image (JPG, PNG, WebP, max 10MB).
   - Garment colour name.
   - Optional colour HEX value.
   - Quantities for S, M, L, XL, XXL.
   - Automatically calculated total.
4. **Stock Sheet Management**
   - Admin can save, view, edit, and archive stock sheets.
5. **PDF Generation**
   - Preview and download a branded PDF.
   - PDF contents: KAVON logo, reference number, design name & image, garment colour, size quantities, total quantity, created date, KAVON design elements (matte black, deep crimson, white, chrome-grey), and footer “Wear Power. Wear KAVON.”.

## Non-Functional Requirements
- **Responsive Design**: Interface matches provided references for desktop, tablet, and mobile.
- **Security & Authorization**:
  - Secure server-side authorization.
  - Row Level Security (RLS) in Supabase.
  - No public design-image URLs (private storage).
  - No service-role secret in browser code.
  - No secrets committed to Git.
- **Data Validation**:
  - Server must recalculate totals and never trust client-provided totals.
  - Strict input validation with Zod.
- **UX/UI**:
  - Clear loading, empty, success, and error states.
  - Accessible form controls.
