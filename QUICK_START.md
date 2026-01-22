# Quick Start Guide

## For Windows Users

### Step 1: Install Node.js
If you don't have Node.js installed:
1. Download from https://nodejs.org/ (version 20 or higher)
2. Run the installer
3. Verify installation by opening PowerShell and running:
   ```powershell
   node --version
   npm --version
   ```

### Step 2: Run Setup Script (Recommended)
Open PowerShell in the project directory and run:
```powershell
.\setup.ps1
```

This script will:
- Check if Node.js is installed
- Create the `.env` file with your database URL
- Install all dependencies

### Step 3: Start the Server
```powershell
npm run dev
```

### Step 4: Open in Browser
Navigate to: **http://localhost:5000**

### Step 5: Login
- Username: `admin`
- Password: `admin123`

---

## Manual Setup (Alternative)

If you prefer to set up manually:

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Create `.env` file** in the root directory with:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_7SbyAzsfCBh9@ep-nameless-sky-adjiab7s-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   PORT=5000
   ```

3. **Start the server:**
   ```powershell
   npm run dev
   ```

4. **Open browser:** http://localhost:5000

---

## Troubleshooting

**Port 5000 already in use?**
- Change `PORT=5000` to a different port in your `.env` file (e.g., `PORT=3000`)
- Then access the app at `http://localhost:3000`

**Database connection errors?**
- Check your internet connection
- Verify the `DATABASE_URL` in your `.env` file is correct

**Script execution policy error?**
If you get an error running `setup.ps1`, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

For more detailed information, see [SETUP.md](SETUP.md).
