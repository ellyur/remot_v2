# RETMOT Apartment Management System

## Overview

RETMOT is a comprehensive apartment management system designed for property administrators and tenants. The application streamlines tenant management, payment tracking, maintenance request handling, and agreement management. It features role-based access control with separate interfaces for administrators and tenants, built on a modern full-stack TypeScript architecture.

The system provides administrators with complete oversight of tenant information, payment verification, maintenance requests, and reporting capabilities. Tenants can submit payment proofs, report maintenance issues, manage their profile, and accept rental agreements (Kasunduan).

## Recent Changes (April 2026)

### Accurate Due Dates, Pagination, and SMS Reminders
- Added `moveInDate` (date) column to `tenants`; backfilled existing rows from earliest payment month or today; included idempotent ALTER + backfill in `server/init-database.ts`.
- New billing-period engine (`buildBillingPeriodsForTenant` in `server/routes.ts`) generates one period per month from each tenant's move-in date through the current month, applying the configurable `payment_due_day` and assigning `paid` / `pending` / `rejected` / `unpaid` / `overdue` status per month.
- Endpoints: `GET /api/tenants/:id/billing-periods`, `GET /api/tenant/billing-periods?userId=`, `GET /api/admin/billing-summary` (per-tenant unpaid/overdue counts and total due), and rewrote `GET /api/payments/overdue` to span all months from move-in to today instead of only the current month.
- Admin Payments page now has tabs: "Submissions" (existing list, paginated) and "Billing Status" (per-tenant rows with unpaid/overdue counts, expandable to show each unpaid month, with per-row and per-month "Remind" buttons).
- SMS reminders: `POST /api/payments/remind` (`{tenantId, month}`) sends a Tagalog reminder via PhilSMS using `notifyPaymentReminder` in `server/services/sms.ts`.
- 10-per-page pagination added to admin Tenants, admin Maintenance, and both Payments tables via reusable `client/src/components/DataTablePagination.tsx`.
- Tenant create/edit form now includes Move-in Date (admin-only field).

## Recent Changes (December 2025)

### GCash Payment Integration
- Added settings table to store landlord GCash information
- Created admin settings page (`/admin/settings`) for managing GCash number, account name, and payment instructions
- Added GCashPaymentDialog component for tenants to view payment instructions and submit payments
- Tenants can now pay via GCash by viewing the landlord's payment details and uploading proof

### Overdue Payment Alerts
- Added `/api/payments/overdue` endpoint to calculate overdue payments based on configurable due day
- Admin dashboard shows prominent alert card for overdue payments
- Admin payments page displays overdue payments with days overdue count

### Payment Filtering
- Added comprehensive filtering on admin payments page
- Filter by: status, tenant, month, and search by name/unit
- Shows filtered count vs total payments

### Settings Management
- Admin settings page with tabs for: Payment (GCash info), Landlord Info, and Reminders
- Configurable payment due day (1-28)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool

**Routing**: Wouter for client-side routing with role-based protected routes

**UI Component Library**: Shadcn/ui (New York style) built on Radix UI primitives
- Uses Tailwind CSS for styling with custom design tokens
- Material Design principles for visual hierarchy and elevation
- Inter font family from Google Fonts for typography
- Responsive layouts with mobile-first approach

**State Management**:
- TanStack Query (React Query) for server state management and caching
- React Context API for authentication state (AuthContext)
- Local storage for session persistence

**Form Handling**: React Hook Form with Zod schema validation for type-safe form management

**Design System**:
- Custom color scheme with HSL values for theming
- Shadcn component variants with class-variance-authority
- Consistent spacing using Tailwind's spacing scale (units of 3, 4, 6, 8, 12)
- Hover and active elevation states for interactive elements

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Pattern**: RESTful API with JSON request/response format
- Route handlers separated into `/api` endpoints
- Express middleware for JSON parsing and request logging
- Session-based authentication using bcrypt for password hashing

**File Upload Handling**: Multer middleware for image uploads
- Stores files in local `uploads/` directory
- 5MB file size limit
- Image validation (jpeg, jpg, png, gif only)

**Development**: TSX for TypeScript execution in development mode

### Database Layer

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database**: Neon Serverless PostgreSQL with WebSocket connection pooling

**Schema Design**:
- `users` - Authentication and role management (admin/tenant)
- `tenants` - Detailed tenant information (full name, contact, unit ID, rent amount, occupation)
- `payments` - Payment proof tracking with status workflow (pending/verified)
- `maintenanceReports` - Maintenance request tracking with status workflow (pending/in progress/resolved)
- `kasunduan` - Agreement acceptance tracking
- `settings` - Landlord/admin configuration (GCash info, payment due dates, etc.)

**Relationships**:
- User to Tenant: One-to-one via userId foreign key with cascade delete
- Tenant to Payments: One-to-many with cascade delete
- Tenant to Maintenance Reports: One-to-many with cascade delete

**Migration Strategy**: Drizzle Kit for schema migrations with push-based deployment

### Authentication & Authorization

**Authentication Method**: Session-based with username/password
- Bcrypt password hashing with salt rounds
- User roles: 'admin' and 'tenant'
- LocalStorage persistence for client-side session management

**Authorization Pattern**: Role-based access control (RBAC)
- Protected routes using ProtectedRoute component wrapper
- Separate route groups for admin (`/admin/*`) and tenant (`/tenant/*`) roles
- Server-side validation of user roles on API endpoints

### Application Structure

**Monorepo Layout**:
- `/client` - React frontend application
- `/server` - Express backend application
- `/shared` - Shared TypeScript types and Zod schemas
- `/uploads` - File storage for payment proofs and maintenance images

**Code Organization**:
- Path aliases configured: `@/` for client src, `@shared/` for shared code
- Component separation: UI components in `/components/ui`, feature components in `/components/admin` and `/components/tenant`
- Page-based routing with admin and tenant page directories

**Build Process**:
- Vite builds client into `dist/public`
- esbuild bundles server into `dist/` as ESM
- Production mode serves static files from Express

## External Dependencies

### UI Framework
- **Radix UI**: Complete set of accessible component primitives (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, radio-group, scroll-area, select, separator, slider, switch, tabs, toast, tooltip)
- **Shadcn/ui**: Pre-configured component library built on Radix UI

### Database & ORM
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL database
- **Drizzle ORM**: TypeScript ORM for schema definition and queries
- **@neondatabase/serverless**: Neon database driver with WebSocket support

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx & tailwind-merge**: Conditional className composition

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: TypeScript-first schema validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### File Uploads
- **Multer**: Multipart/form-data handling for file uploads
- Configured for local disk storage with filename hashing

### Date Handling
- **date-fns**: Date utility library for formatting and manipulation

### Security
- **bcryptjs**: Password hashing and comparison

### Development Tools
- **Replit Plugins**: vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner for enhanced development experience
- **TypeScript**: Type safety across full stack
- **ESLint & Prettier** (implicit): Code quality and formatting

### Fonts
- **Google Fonts - Inter**: Variable font family for all typography

### Icons
- **Lucide React**: Icon library for UI elements (Home, Users, DollarSign, Wrench, LogOut, FileText, Building2, etc.)