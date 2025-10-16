# Setup Guide - Separated Backend and Frontend

This guide will help you set up and run the Saudi Payment Management System with the separated backend and frontend architecture.

## Project Structure

```
saudi/
├── backend/              # Express.js backend server
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── lib/         # Utilities (Cloudinary, etc.)
│   │   ├── middleware/  # Auth middleware
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # API routes
│   │   └── server.ts    # Main server file
│   ├── .env             # Backend environment variables
│   ├── package.json
│   └── tsconfig.json
│
└── (root)/              # Next.js frontend
    ├── app/             # Next.js app directory
    ├── components/      # React components
    ├── lib/             # Frontend utilities
    ├── .env.local       # Frontend environment variables
    ├── package.json
    └── next.config.js
```

## Prerequisites

- Node.js 18+ and npm installed
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account for file uploads

## Setup Instructions

### 1. Backend Setup

#### Install Backend Dependencies

```bash
cd backend
npm install
```

#### Configure Backend Environment

The `.env` file has been created in the `backend/` folder with your existing credentials. Verify and adjust if needed:

```bash
# backend/.env
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3000

MONGODB_URI=your_mongodb_uri
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Start Backend Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The backend will run on `http://localhost:5001`

### 2. Frontend Setup

#### Install Frontend Dependencies

```bash
cd ..  # Return to root directory
npm install
```

#### Configure Frontend Environment

The `.env.local` file has been updated to point to the backend API:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5001

# Cloudinary credentials (if needed for frontend)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Start Frontend Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Running Both Servers

You need to run both the backend and frontend simultaneously:

### Option 1: Two Terminal Windows

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
# From root directory
npm run dev
```

### Option 2: Using Concurrently (Recommended)

You can install `concurrently` to run both servers from one command:

```bash
# In root directory
npm install --save-dev concurrently
```

Add this script to your root `package.json`:

```json
{
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "next dev",
    "dev:all": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
  }
}
```

Then run:
```bash
npm run dev:all
```

## Accessing the Application

1. Start both backend and frontend servers
2. Open your browser to `http://localhost:3000`
3. The frontend will communicate with the backend API at `http://localhost:5001`

## API Endpoints

All API requests from the frontend will go to the backend server:

- Authentication: `http://localhost:5001/api/auth/*`
- Employees: `http://localhost:5001/api/employees/*`
- Vehicles: `http://localhost:5001/api/vehicles/*`
- Payments: `http://localhost:5001/api/payments/*`
- Bills: `http://localhost:5001/api/bills/*`
- And more...

## Next Steps - Frontend Migration

The backend is fully set up and ready. To complete the separation, you'll need to:

1. **Update all frontend fetch calls** to use the new API configuration
2. **Remove the old API routes** from `app/api/` directory
3. **Test all functionality** to ensure everything works with the separated backend

Example of how to update frontend API calls:

```typescript
// Old way (Next.js API routes)
const response = await fetch('/api/employees');

// New way (separate backend)
import { apiRequest } from '@/lib/api-config';
const response = await apiRequest('/api/employees');
```

## Troubleshooting

### CORS Errors
Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL

### Authentication Issues
Ensure `credentials: 'include'` is set in all fetch requests to pass cookies

### Connection Refused
Verify both servers are running and ports 3000 and 5001 are not blocked

### MongoDB Connection
Check your `MONGODB_URI` is correct and your IP is whitelisted in MongoDB Atlas

## Production Deployment

### Backend
- Deploy to services like Render, Railway, Heroku, or DigitalOcean
- Update `FRONTEND_URL` to your production frontend URL
- Set `NODE_ENV=production`

### Frontend
- Deploy to Vercel, Netlify, or similar
- Update `NEXT_PUBLIC_API_URL` to your production backend URL
- Ensure CORS is configured properly on the backend

## Benefits of This Separation

1. **Independent Scaling**: Scale backend and frontend separately
2. **Better Organization**: Clear separation of concerns
3. **Multiple Clients**: Can build mobile apps or other frontends using the same API
4. **Easier Testing**: Test backend API independently
5. **Team Collaboration**: Backend and frontend teams can work independently

## Notes

- The backend uses cookie-based authentication with httpOnly cookies
- All API routes (except login) require authentication
- Soft delete pattern is used throughout (data is never truly deleted)
- File uploads are handled by the backend and stored in Cloudinary
