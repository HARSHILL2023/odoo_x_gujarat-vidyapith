# FleetFlow Deployment Guide

Follow these steps to deploy your Fleet Management System to production.

## 1. Prerequisites
- A GitHub repository with your project pushed.
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
- Accounts on [Render](https://render.com/) (Backend) and [Vercel](https://vercel.com/) (Frontend).

## 2. Database Setup (MongoDB Atlas)
1. **Sign Up**: Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign in.
2. **Create Project**: Click the **Project Dropdown** (top left) -> **New Project** -> Name it "FleetFlow" -> **Next** -> **Create Project**.
3. **Deploy Cluster**:
   - Click the big **"Create"** button.
   - Select **M0** (The Free tier).
   - Choose a **Cloud Provider** (e.g., AWS) and **Region** (e.g., N. Virginia or Mumbai).
   - Click **"Create"** at the bottom.
4. **Set Security (Network)**:
   - On the left sidebar, find **Security** -> Click **Network Access**.
   - Click **"Add IP Address"**.
   - Click **"Allow Access from Anywhere"** (this adds `0.0.0.0/0`).
   - Click **"Confirm"**.
5. **Create User (Database Access)**:
   - On the left sidebar, click **Database Access**.
   - Click **"Add New Database User"**.
   - Use **Password** auth. Enter a username (e.g., `admin`) and **Generate/Set a Password** (Copy this password! You'll need it).
   - Keep "Specific Privileges" as **Read and Write to any database**.
   - Click **"Add User"**.
6. **Get Connection String**:
   - Click **Database** (or Clusters) on the left sidebar.
   - Click the **"Connect"** button on your Cluster.
   - Choose **"Drivers"**.
   - Copy the string under **"Add your connection string"**.
   - It looks like: `mongodb+srv://admin:<password>@cluster0.abc.mongodb.net/...`
   - **Important**: Replace `<password>` in that string with your actual password.

7. **Connect with MongoDB Compass (Optional)**:
   - Open MongoDB Compass and click **"New Connection"**.
   - Paste the connection string from Step 6.
   - Click **"Connect"**.
   - **Note**: You will see system databases like `admin`, `config`, and `local`. This is normal. Your application data will appear in a `fleetflow` database once the backend is connected and running.

## 3. Backend Deployment (Render or Vercel)

### Option A: Render (Standard)
1. Sign in to Render and click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Set the following:
   - **Name**: `fleetflow-api`
   - **Root Directory**: `V2/fleetflow-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Go to **Environment** and add the variables listed below.

### Option B: Vercel (All-in-one)
1. Sign in to Vercel and click **Add New** -> **Project**.
2. Connect your GitHub repository.
3. In **Project Settings**:
   - **Root Directory**: `V2/fleetflow-api`
   - **Framework Preset**: `Other` (It will detect `vercel.json`)
4. Add the **Environment Variables** listed below and click **Deploy**.

### Backend Environment Variables
- `MONGODB_URI`: (Your MongoDB Atlas connection string)
- `CLIENT_ORIGIN`: (The URL of your frontend once deployed)
- `JWT_SECRET`: (A strong random string)

## 4. Frontend Deployment (Vercel)
1. Sign in to Vercel and click **Add New** -> **Project**.
2. Connect your GitHub repository.
3. In **Project Settings**:
   - **Root Directory**: `V2/fleetflow-ui`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://your-backend-url.vercel.app/api` (or render URL)
5. Click **Deploy**.

## 5. Final Connection
- Once the Vercel UI app is deployed, copy its URL.
- Go back to your Backend settings (Render or Vercel) -> Environment -> `CLIENT_ORIGIN` and update it with the Vercel UI URL.
- Redeploy the backend if necessary.

---
**Congratulations! Your FleetFlow system is now live.**
