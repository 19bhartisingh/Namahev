# NAMAH EV — Railway Deployment Guide

## Folder structure
```
namahev/
├── server.js          ← Express backend
├── package.json       ← Node dependencies
├── leads.json         ← Lead storage (auto-created)
├── .gitignore
└── public/
    ├── index.html     ← Full SPA frontend
    └── BG1.png        ← Showroom background image
```

---

## Deploy to Railway (5 minutes)

### Step 1 — Upload to GitHub
1. Create a new **private** repository on github.com
2. Upload all files from this zip (keep folder structure)

### Step 2 — Connect to Railway
1. Go to [railway.app](https://railway.app) → New Project
2. Choose **Deploy from GitHub repo**
3. Select your repository → Deploy

### Step 3 — Set environment variables
In Railway dashboard → your project → **Variables** tab, add:

| Variable           | Value                        | Required |
|--------------------|------------------------------|----------|
| `FONNTE_TOKEN`     | Your token from fonnte.com   | ✅ Yes   |
| `WA_OWNER`         | `918000152351` (owner number)| ✅ Yes   |
| `ADMIN_PASS`       | Your admin password          | ✅ Yes   |
| `ANTHROPIC_API_KEY`| Your Anthropic key           | Optional |

### Step 4 — Get Fonnte token (5 min, free)
1. Register at [fonnte.com](https://fonnte.com)
2. Click **Connect Device** → scan QR with owner's WhatsApp
3. Go to **Devices** → copy the Token → paste as `FONNTE_TOKEN`

---

## Test WhatsApp is working
Open in browser (replace with your Railway URL):
```
https://your-app.railway.app/api/test-whatsapp?pass=YOUR_ADMIN_PASS&to=918000152351
```
Returns `{ "ok": true }` = working ✅

---

## Admin panel — view leads
```
GET  /api/leads?pass=YOUR_PASS              → all leads (JSON)
GET  /api/leads/export.csv?pass=YOUR_PASS  → download CSV
GET  /api/leads/export.json?pass=YOUR_PASS → download JSON
```

---

## WA_OWNER format
- India: `91` + 10-digit mobile → `918000152351`
- No spaces, no dashes, no `+`
