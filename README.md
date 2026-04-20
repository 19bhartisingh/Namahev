# ⚡ NAMAH EV — Premium Electric Vehicle E-Commerce

A complete, production-ready EV showroom and enquiry platform. **No login required** to browse. Customers simply explore and fill an enquiry form when interested.

## How It Works

| Who | What they do |
|-----|-------------|
| **Customer** | Browse freely → click any product → click "Enquire" → fill Name + Phone (+ optional Email/Message) → submitted ✅ |
| **Admin** | Click "Admin" link in footer → enter password → full CRM dashboard with all leads, status updates, call/WhatsApp buttons, CSV & JSON export |

## Deploy to Railway (2 minutes)

1. Push this project to a **GitHub repository**
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your repo — Railway auto-detects Node.js via `package.json`
4. Add **Environment Variables** in Railway dashboard:

| Variable | Value | Required |
|----------|-------|----------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | For Vega AI chat |
| `ADMIN_PASS` | Your password | Default: `namahev2025` |

5. Deploy! App goes live in ~90 seconds.

## Local Development

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... ADMIN_PASS=mypassword node server.js
# Open http://localhost:3000
```

## Data Storage

- **Leads** are saved to `leads.json` on the server (persists across restarts)
- **Fallback**: Also saved to browser localStorage if server is unreachable
- **Export**: Admin panel → Export CSV or Export JSON buttons

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/leads` | Public | Submit enquiry |
| `GET /api/leads?pass=X` | Admin | Fetch all leads |
| `GET /api/leads/export.csv?pass=X` | Admin | Download CSV |
| `GET /api/leads/export.json?pass=X` | Admin | Download JSON |
| `PATCH /api/leads/:id?pass=X` | Admin | Update lead status |
| `DELETE /api/leads/:id?pass=X` | Admin | Delete lead |
| `POST /api/chat` | Proxy | Vega AI (Anthropic) |

## Features

- ✅ **No-login browsing** — open to all visitors
- ✅ **Enquiry form** — Name + Phone required, Email + Message optional
- ✅ **Server-side lead storage** (leads.json) + localStorage fallback
- ✅ **Admin CRM** — password protected, full lead management
- ✅ **CSV + JSON export** — download leads for Excel or any CRM
- ✅ **Status tracking** — New / Contacted / Closed / Lost
- ✅ **Search & filter** in admin dashboard
- ✅ **Product detail modal** with 8-image gallery
- ✅ **Battery selector** — dynamic pricing per config
- ✅ **Wishlist** — saved to localStorage
- ✅ **WhatsApp integration** — enquiry pre-fill
- ✅ **Vega AI chat** — Anthropic API via backend proxy
- ✅ **6 languages** — EN, HI, TA, TE, BN, MR
- ✅ **Dark / Light mode**
- ✅ **PWA installable**
- ✅ **Fully responsive** — mobile first
