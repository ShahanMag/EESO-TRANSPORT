# Saudi Payment Management System

A comprehensive employee and vehicle payment management system built with Next.js 14, MongoDB, shadcn/ui, and Tailwind CSS 3.

## Features

- **Employee Management**: Manage employees (drivers/agents) with Saudi validations
  - Iqama ID: 10 digits validation
  - Phone: +966XXXXXXXXX format

- **Vehicle Management**: Manage vehicles with format ABC-1234, assign to employees

- **Payment Records**: Track payments on vehicles
  - Auto-calculated dues (totalAmount - paidAmount)
  - Color-coded status badges (green=paid, yellow=partial, red=unpaid)
  - Remarks support

- **Bills Management**: Track income/expense bills linked to agents
  - Income vs expense tracking
  - Employee assignment

- **Reports**: Four comprehensive reports with date filters
  1. Employee Report - List with vehicle counts
  2. Vehicle Report - List with assigned employees
  3. Payment Records Report - Filter by vehicle/date, show totals and dues
  4. Bills Report - Filter by type/agent/date, show income vs expense summary

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB (Local)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS 3
- **Language**: TypeScript

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running locally on port 27017

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start MongoDB**:
   Make sure MongoDB is running on `mongodb://localhost:27017`

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── (dashboard)/        # Dashboard layout group
│   │   ├── employees/      # Employee management
│   │   ├── vehicles/       # Vehicle management
│   │   ├── payments/       # Payment records
│   │   ├── bills/          # Bills management
│   │   └── reports/        # Reports dashboard
│   ├── api/                # API routes
│   │   ├── employees/      # Employee CRUD
│   │   ├── vehicles/       # Vehicle CRUD
│   │   ├── payments/       # Payment CRUD
│   │   ├── bills/          # Bill CRUD
│   │   └── reports/        # Report endpoints
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── sidebar.tsx         # Navigation sidebar
├── lib/
│   ├── mongodb.ts          # MongoDB connection
│   └── utils.ts            # Utility functions
├── models/                 # Mongoose models
│   ├── Employee.ts
│   ├── Vehicle.ts
│   ├── Payment.ts
│   └── Bill.ts
└── .env.local             # Environment variables
```

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees (with search & type filter)
- `POST /api/employees` - Create employee
- `GET /api/employees/[id]` - Get employee by ID
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee

### Vehicles
- `GET /api/vehicles` - Get all vehicles (with search & employee filter)
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/[id]` - Get vehicle by ID
- `PUT /api/vehicles/[id]` - Update vehicle
- `DELETE /api/vehicles/[id]` - Delete vehicle

### Payments
- `GET /api/payments` - Get all payments (with vehicle & date filters)
- `POST /api/payments` - Create payment
- `GET /api/payments/[id]` - Get payment by ID
- `PUT /api/payments/[id]` - Update payment
- `DELETE /api/payments/[id]` - Delete payment

### Bills
- `GET /api/bills` - Get all bills (with type, employee & date filters)
- `POST /api/bills` - Create bill
- `GET /api/bills/[id]` - Get bill by ID
- `PUT /api/bills/[id]` - Update bill
- `DELETE /api/bills/[id]` - Delete bill

### Reports
- `GET /api/reports/employees` - Employee report with vehicle counts
- `GET /api/reports/vehicles` - Vehicle report with assigned employees
- `GET /api/reports/payments` - Payment records with totals and dues
- `GET /api/reports/bills` - Bills report with income vs expense summary

## Validations

- **Iqama ID**: Must be exactly 10 digits
- **Phone**: Must be in format +966XXXXXXXXX (Saudi format)
- **Vehicle Number**: Must be in format ABC-1234
- **Paid Amount**: Cannot exceed total amount

## Features Highlights

1. **Search & Filter**: All management pages have search functionality
2. **Modal Dialogs**: Add/Edit operations use clean modal dialogs
3. **Color-Coded Status**: Payment status badges with colors
4. **Auto-Calculated Dues**: Automatic calculation of dues
5. **Summary Cards**: Dashboard and reports show summary statistics
6. **Responsive Design**: Works on desktop and mobile devices

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

MIT
