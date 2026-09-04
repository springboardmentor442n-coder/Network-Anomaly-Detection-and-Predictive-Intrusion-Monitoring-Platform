# 🚀 NetShield AI - Production Deployment Guide

This guide outlines the production deployment setup for **NetShield AI Threat Monitoring System**.

---

## 🛠️ Production Architecture Overview

- **Frontend**: React + Vite + Tailwind CSS served via Nginx (SPA routing + Gzip + SSL termination).
- **Backend**: FastAPI + Python 3.12 + Uvicorn/Gunicorn workers running trained **CICIDS2017 & UNSW-NB15** dual XGBoost models.
- **Containerization**: Multi-stage Docker builds orchestrated via `docker-compose`.

---

## 🐋 Option 1: 1-Click Docker Compose Deployment (Recommended)

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Docker Compose on your server.

### Command to Deploy
Run the following command from the root directory (`SpringBoardProject`):

```bash
docker compose up -d --build
```

### Accessing your Production Deployment
- **Frontend Console**: `http://localhost` (Port `80`)
- **Backend API Docs**: `http://localhost:8000/docs` (Port `8000`)

---

## ☁️ Option 2: Cloud PaaS Deployment (Vercel / Render / Railway)

### 1. Deploying Backend (Render / Railway / Render Docker)
1. Push your repository to GitHub.
2. Log in to [Render](https://render.com) or [Railway](https://railway.app).
3. Select **New Web Service** ➔ Connect your GitHub repository.
4. Set Root Directory to `backend`.
5. Set Build Command: `pip install -r requirements.txt`
6. Set Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Copy your deployed backend URL (e.g. `https://netshield-backend.onrender.com`).

### 2. Deploying Frontend (Vercel / Netlify)
1. Log in to [Vercel](https://vercel.com).
2. Click **New Project** ➔ Import repository ➔ Select `frontend` directory.
3. Add Environment Variable:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://netshield-backend.onrender.com/api/v1`
4. Click **Deploy**!

---

## 🖥️ Option 3: Production Linux VPS Deployment (Ubuntu + Nginx + SSL)

### Step 1: Install Dependencies
```bash
sudo apt update && sudo apt install -y nginx docker.io docker-compose git certbot python3-certbot-nginx
```

### Step 2: Clone & Build
```bash
git clone <your-repo-url> /var/www/netshield
cd /var/www/netshield
docker compose up -d --build
```

### Step 3: Enable Free HTTPS/SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔐 Production Pre-Configured Credentials

| User Email | Password | Assigned Role | Workspace Permissions |
| :--- | :--- | :--- | :--- |
| **`admin@netshield.ai`** | `admin123` | **Admin** | All 6 Tabs (Full System Control & RBAC) |
| **`analyst@netshield.ai`** | `analyst123` | **Security Analyst** | 5 Operational Tabs (AI Predictor, Alerts, Blocking) |
| **`operator@netshield.ai`** | `operator123` | **SOC Operator** | 3 Read-Only Monitoring Tabs |
