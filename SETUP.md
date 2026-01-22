# Local Development Setup Guide

This guide will help you set up and run the RETMOT Apartment Management System locally on your Windows machine.

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (version 20 or higher)
   - Download from: https://nodejs.org/
   - This will also install npm (Node Package Manager)
   - To verify installation, open PowerShell and run:
     ```powershell
     node --version
     npm --version
     ```

## Installation Steps

### 1. Install Dependencies

Open PowerShell or Command Prompt in the project directory and run:

```powershell
npm install
```

This will install all the required packages listed in `package.json`.

### 2. Set Up Environment Variables

Create a `.env` file in the root directory of the project with the following content:

```
DATABASE_URL=postgresql://neondb_owner:npg_7SbyAzsfCBh9@ep-nameless-sky-adjiab7s-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
PORT=5000
```

**Note:** The `.env` file is already configured with your database URL. If you need to change it, edit the `.env` file.

### 3. Start the Development Server

Run the following command in PowerShell or Command Prompt:

```powershell
npm run dev
```

The server will start on **http://localhost:5000**

### 4. Open in Browser

Once the server is running, open your web browser and navigate to:

```
http://localhost:5000
```

## Default Admin Credentials

When you first run the application, an admin user is automatically created:

- **Username:** `admin`
- **Password:** `admin123`

**Important:** Change this password after your first login for security purposes.

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, you can change it by modifying the `PORT` value in your `.env` file.

### Database Connection Issues

If you encounter database connection errors:
1. Verify that the `DATABASE_URL` in your `.env` file is correct
2. Check your internet connection (the database is hosted on Neon)
3. Ensure the database URL includes the SSL parameters

### Node.js Version Issues

Make sure you're using Node.js version 20 or higher. You can check your version with:
```powershell
node --version
```

### Windows PowerShell Script Issues

The npm scripts have been configured to work on Windows. If you encounter issues with environment variables, make sure you're using the latest version of npm.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server (requires build first)
- `npm run check` - Type-check the TypeScript code
- `npm run db:push` - Push database schema changes to the database

## Project Structure

- `/client` - React frontend application
- `/server` - Express backend application
- `/shared` - Shared TypeScript types and schemas
- `/uploads` - File storage for payment proofs and maintenance images

## Need Help?

If you encounter any issues, check:
1. All dependencies are installed (`npm install`)
2. The `.env` file exists and contains the correct `DATABASE_URL`
3. Node.js version is 20 or higher
4. Port 5000 is not being used by another application
