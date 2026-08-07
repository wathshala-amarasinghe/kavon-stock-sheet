# KAVON Stock Sheet

Internal web application for managing KAVON stock orders.

## Project Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kavon-stock-sheet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Copy `.env.example` to `.env.local` and fill in the Supabase credentials.
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Technologies Used
- Next.js App Router (TypeScript)
- Tailwind CSS & shadcn/ui
- Supabase (PostgreSQL, Auth, Storage)
- React Hook Form & Zod
- @react-pdf/renderer
- Vitest & Playwright

## Deployment
See [Deployment Runbook](docs/deployment.md) for production deployment, custom domain configuration, and launch verification instructions.
