# Design Guidelines: RETMOT Apartment Management System

## Design Approach

**Selected Approach**: Design System - Material Design Principles
**Rationale**: This is a utility-focused property management application requiring clear information hierarchy, efficient data display, and professional credibility. Material Design's elevation system, structured layouts, and form patterns are ideal for dashboard-heavy applications with role-based access.

**Key Design Principles**:
- Professional trustworthiness through clean, structured layouts
- Clear visual hierarchy distinguishing admin vs tenant experiences
- Efficiency-first interaction patterns for frequent tasks
- Scannable data presentation with purposeful density

---

## Core Design Elements

### A. Typography

**Font Families**: Inter (via Google Fonts) - single family for consistency
- **Headings**: font-bold, tracking-tight
  - H1 (Dashboard Titles): text-3xl md:text-4xl
  - H2 (Section Headers): text-2xl md:text-3xl
  - H3 (Card Titles): text-xl
  - H4 (Sub-sections): text-lg
- **Body Text**: font-normal
  - Primary: text-base
  - Secondary/Labels: text-sm
  - Caption/Meta: text-xs
- **Data/Numbers**: font-semibold for emphasis on metrics and amounts

### B. Layout System

**Spacing Primitives**: Tailwind units of 3, 4, 6, 8, 12 for consistent rhythm
- Component padding: p-4, p-6, p-8
- Section margins: mb-6, mb-8, mb-12
- Grid gaps: gap-4, gap-6
- Container max-width: max-w-7xl for dashboards, max-w-2xl for forms

**Grid Patterns**:
- Dashboard stat cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Data tables: full-width with horizontal scroll on mobile
- Form layouts: single column max-w-2xl for better completion rates
- File upload areas: dedicated zones with clear boundaries

### C. Component Library

#### Navigation
- **Admin Sidebar**: Fixed left navigation (w-64) with role indicator badge at top
  - Dashboard, Tenants, Payments, Maintenance, Reports sections
  - User profile and logout at bottom
- **Tenant Navigation**: Horizontal top bar with fewer menu items
  - Dashboard, My Payments, Maintenance, Profile
  - Prominent account info display (unit number, rent amount)
- **Mobile**: Hamburger menu converting sidebar to overlay drawer

#### Dashboard Cards
- **Stat Cards** (Admin): Elevated containers displaying key metrics
  - Large number (text-4xl font-bold)
  - Label below (text-sm text-gray-600)
  - Icon in top-right corner (w-12 h-12)
  - Subtle border, rounded-lg, p-6
- **Summary Cards** (Tenant): Personal payment and maintenance status
  - Current month rent status with visual indicator
  - Payment history preview (last 3 months)
  - Pending maintenance count

#### Data Display
- **Tables**: Clean structure with alternating row backgrounds
  - Header: sticky top-0 with medium weight font
  - Cells: p-4 with aligned content (left for text, right for numbers)
  - Action buttons: text-sm in last column
  - Status badges: inline with rounded-full px-3 py-1
- **Status Indicators**:
  - Pending: amber badge
  - Verified/Completed: green badge
  - In Progress: blue badge
  - Overdue: red badge

#### Forms & Inputs
- **Input Fields**: Consistent styling across all forms
  - Label above: text-sm font-medium mb-2
  - Input: p-3 rounded-lg border focus:ring-2
  - Helper text: text-xs mt-1
  - Error state: red border with error message
- **File Upload Zone**: 
  - Dashed border container (border-2 border-dashed rounded-lg)
  - Center-aligned upload icon and instruction text
  - Preview thumbnail after upload (w-32 h-32)
  - File name and remove option below preview
- **Buttons**:
  - Primary: px-6 py-3 rounded-lg font-medium
  - Secondary: outlined variant with transparent background
  - Danger: red variant for delete actions
  - Icon buttons: square (w-10 h-10) with centered icon

#### Modals & Overlays
- **Add/Edit Tenant Modal**: Center-screen overlay
  - Header with title and close button
  - Form content in scrollable body
  - Footer with cancel and submit actions
  - Backdrop with slight blur effect
- **Confirmation Dialogs**: Smaller centered modal for destructive actions
  - Warning icon at top
  - Clear question/statement
  - Dual action buttons (Cancel, Confirm)

#### Kasunduan Agreement Page
- **Layout**: Full-height centered content (max-w-4xl)
  - Header: "Kasunduan ng Pagpapaupa" (text-3xl font-bold mb-8)
  - Content area: Scrollable container (max-h-96 overflow-y-auto) with white background, p-8, border
  - Agreement text: prose formatting with readable line-height
  - Checkbox: Large, prominent "I have read and agree" with text-base label
  - Accept button: Full-width, large (py-4), disabled state until checkbox checked
  - Bottom-aligned sticky action area on mobile

#### Authentication
- **Login Page**: Centered card on neutral background
  - Logo/branding at top
  - Role selector (Admin/Tenant) as tab-style toggle
  - Username and password fields
  - Remember me checkbox
  - Full-width login button
  - Container: max-w-md mx-auto with shadow-lg

### D. Responsive Breakpoints
- Mobile-first approach
- Sidebar → Drawer on < lg breakpoint
- 3-column stats → 2-column → 1-column as viewport narrows
- Tables: horizontal scroll on mobile with sticky first column
- Forms: maintain single column on all sizes
- Touch targets: minimum 44px height on mobile

### E. Animations
Use very sparingly:
- Button hover: subtle scale transform (scale-105)
- Modal entry: fade-in with slight slide-up (150ms)
- Status changes: smooth transition-colors (200ms)
- NO scroll animations, parallax, or complex interactions

---

## Images

**Logo/Branding**: RETMOT logo in navigation header (h-10)

**File Upload Previews**: 
- Payment proof thumbnails in admin verification view (w-24 h-24 rounded object-cover)
- Maintenance report images (w-full max-w-md rounded-lg)
- Expandable to full-size lightbox on click

**Empty States**: Simple illustration or icon when no data exists
- Empty payment history: Document icon with "No payments yet" message
- No maintenance reports: Wrench icon with "No reports submitted"

**Profile Placeholders**: Generic avatar icons for user profiles (w-10 h-10 rounded-full)

**No Hero Images**: This is a dashboard application - no marketing hero sections needed

---

## Admin vs Tenant Visual Distinction

**Admin Interface**:
- Broader layout with sidebar navigation
- Data-dense tables and comprehensive views
- Elevated cards with subtle shadows for depth
- Action-heavy interfaces (edit, delete, verify buttons prominent)

**Tenant Interface**:
- Simpler top navigation
- Card-based personal dashboard focusing on their unit
- Larger touch targets for mobile-first use
- Fewer options, streamlined task completion flows

Both interfaces maintain consistent typography, spacing, and component styling while adapting layout complexity to role needs.