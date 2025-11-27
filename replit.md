# PortföyTakip - Turkish Investment & Portfolio Tracking Platform

## Project Overview
A Turkish-language web-based investment and portfolio tracking platform where users can add and track stocks (hisse senedi), ETFs, cryptocurrencies (kripto), and real estate (gayrimenkul) assets. The dashboard displays net worth, asset distribution percentages, and monthly performance graphs.

## Technology Stack
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Charts**: Recharts for data visualization
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state

## Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── asset-distribution-chart.tsx
│   │   │   ├── asset-form.tsx
│   │   │   ├── delete-confirm-dialog.tsx
│   │   │   ├── performance-chart.tsx
│   │   │   ├── portfolio-table.tsx
│   │   │   ├── summary-cards.tsx
│   │   │   └── user-nav.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── assets.tsx      # Varlıklarım
│   │   │   ├── home.tsx        # Portföyüm (Dashboard)
│   │   │   ├── landing.tsx     # Landing page
│   │   │   ├── reports.tsx     # Raporlar
│   │   │   ├── settings.tsx    # Ayarlar
│   │   │   └── transactions.tsx # İşlemler
│   │   ├── hooks/
│   │   │   └── useAuth.ts      # Authentication hook
│   │   ├── lib/
│   │   │   ├── authUtils.ts
│   │   │   └── queryClient.ts
│   │   └── App.tsx             # Main app with routing
│   └── index.html
├── server/                 # Backend Express application
│   ├── db.ts               # Database connection
│   ├── index.ts            # Server entry point
│   ├── replitAuth.ts       # Replit Auth setup
│   ├── routes.ts           # API routes
│   └── storage.ts          # Database storage layer
├── shared/
│   └── schema.ts           # Drizzle schema definitions
└── design_guidelines.md    # Design specifications
```

## Database Schema
- **users**: User profiles (id, email, firstName, lastName, profileImageUrl)
- **sessions**: Session storage for authentication
- **assets**: Portfolio assets (name, type, symbol, quantity, purchasePrice, currentPrice)
- **transactions**: Buy/sell transaction history
- **performanceSnapshots**: Monthly performance tracking

## API Endpoints
- `GET /api/auth/user` - Get current user
- `GET /api/assets` - Get all user assets
- `POST /api/assets` - Create new asset
- `PATCH /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `GET /api/transactions` - Get transaction history
- `GET /api/portfolio/summary` - Get portfolio summary metrics
- `GET /api/portfolio/performance` - Get monthly performance data

## Turkish Language
All UI elements are in Turkish:
- Portföyüm (Dashboard)
- Varlıklarım (Assets)
- İşlemler (Transactions)
- Raporlar (Reports)
- Ayarlar (Settings)

## Design Theme
- Primary color: #1E3A8A (dark blue)
- Success color: #10B981 (green for gains)
- Warning color: #F59E0B (orange for losses)
- Font: Inter/Roboto
- Border radius: 8px
- Professional financial dashboard aesthetic

## Running the Application
```bash
npm run dev          # Start development server
npm run db:push      # Push schema changes to database
```

## Authentication
Uses Replit Auth with OpenID Connect. Users can sign in with:
- Email/password
- Google
- GitHub
- Apple
- X (Twitter)

## Recent Changes
- Initial implementation with full CRUD for assets
- Dashboard with summary cards, charts, and portfolio table
- Turkish language support throughout the application
- Responsive design with collapsible sidebar
