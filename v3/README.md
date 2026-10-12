# SolarScope — Solar Planning & Marketplace Workspace (v1)

SolarScope is an end-to-end solar energy estimation, rooftop engineering, and marketplace platform.

## Architecture
- **Framework**: Next.js App Router with TypeScript
- **Styling**: Design tokens & Custom CSS architecture, Inter typography
- **State & Icons**: Lucide React
- **Backend API**: NestJS REST API (Planned)
- **Database**: PostgreSQL with PostGIS extension for spatial rooftop calculations

## Getting Started

1. Navigate to this folder:
   ```bash
   cd "C:\Users\Abdul Wasay\OneDrive\Desktop\Final-year-project\Project\v1"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure
```text
Project/v1/
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   └── Badge.tsx
│   │   └── layout/
│   │       ├── AppSidebar.tsx
│   │       ├── AppHeader.tsx
│   │       └── AppShell.tsx
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   │   ├── api/
│   │   └── utils/
│   ├── providers/
│   ├── config/
│   ├── types/
│   └── styles/
│       ├── variables.css
│       ├── reset.css
│       └── utilities.css
└── tests/
```
