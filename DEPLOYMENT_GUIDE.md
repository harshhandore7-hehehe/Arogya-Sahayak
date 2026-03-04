# 🚀 Arogya Sahayak — Deployment Guide
### All files are pre-built. Just follow these steps.

---

## ✅ What's Already Done For You

Every file is pre-created. Your folder looks like this:

```
arogya-sahayak/
├── frontend/
│   ├── src/
│   │   ├── App.jsx        ✅ Main React app
│   │   ├── main.jsx       ✅ Entry point
│   │   └── index.css      ✅ Global styles
│   ├── public/
│   │   ├── manifest.json  ✅ PWA manifest
│   │   └── favicon.svg    ✅ App icon
│   ├── index.html         ✅ HTML shell
│   ├── package.json       ✅ Dependencies
│   ├── vite.config.js     ✅ Vite config
│   ├── tailwind.config.js ✅ Tailwind config
│   ├── postcss.config.js  ✅ PostCSS config
│   ├── vercel.json        ✅ Vercel deploy config
│   └── .env.example       ✅ Env template
├── backend/
│   ├── main.py            ✅ FastAPI backend
│   ├── requirements.txt   ✅ Python packages
│   └── .env.example       ✅ Env template
├── render.yaml            ✅ Render deploy config
└── .gitignore             ✅ Git ignore rules
```

---

## Step 1 — Run Locally (5 minutes)

### Frontend
```bash
cd arogya-sahayak/frontend
npm install
npm run dev
```
→ Open **http://localhost:5173** — the app works immediately!
→ No API key needed. Built-in triage engine runs instantly.

### Backend (optional for local)
```bash
cd arogya-sahayak/backend
python -m venv venv

# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt

# Optional: create your .env file
cp .env.example .env
# Edit .env → add your GROQ_API_KEY if you have one

uvicorn main:app --reload --port 8000
```
→ API docs at **http://localhost:8000/docs**

---

## Step 2 — Push to GitHub

```bash
# Go to github.com → New Repository
# Name it: arogya-sahayak
# Set to Public → Create

cd arogya-sahayak
git init
git add .
git commit -m "Initial commit — Arogya Sahayak"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/arogya-sahayak.git
git push -u origin main
```

---

## Step 3 — Deploy Backend on Render (Free)

1. Go to **[render.com](https://render.com)** → Sign up free with GitHub

2. Click **New +** → **Web Service**

3. Connect your `arogya-sahayak` repo

4. Fill in these settings:

   | Field | Value |
   |-------|-------|
   | Name | `arogya-sahayak-api` |
   | Region | **Singapore** (closest to India) |
   | Root Directory | `backend` |
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | Plan | **Free** |

5. Scroll to **Environment Variables** → Add:

   | Key | Value |
   |-----|-------|
   | `GROQ_API_KEY` | `gsk_your_key_here` *(get free at console.groq.com)* |
   | `GROQ_MODEL` | `llama-3.1-8b-instant` |
   | `ENVIRONMENT` | `production` |
   | `PYTHON_VERSION` | `3.11.0` |

   > ⚠️ If you skip `GROQ_API_KEY`, the backend still works using the built-in rule engine.

6. Click **Create Web Service** → wait ~3 minutes

7. Your backend URL: `https://arogya-sahayak-api.onrender.com`

8. Test it:
   ```
   https://arogya-sahayak-api.onrender.com/health
   ```
   Should return: `{"status":"ok","ai_mode":"groq"}`

---

## Step 4 — Deploy Frontend on Vercel (Free)

1. Go to **[vercel.com](https://vercel.com)** → Sign up free with GitHub

2. Click **Add New Project** → Import your `arogya-sahayak` repo

3. Configure:

   | Field | Value |
   |-------|-------|
   | Framework Preset | **Vite** |
   | Root Directory | `frontend` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://arogya-sahayak-api.onrender.com` |

5. Click **Deploy** → wait ~2 minutes

6. Your live app: `https://arogya-sahayak.vercel.app` 🎉

---

## Step 5 — Get Free Groq API Key (Optional but Recommended)

1. Go to **[console.groq.com](https://console.groq.com)**
2. Click **Sign Up** — use Google or email, **no credit card**
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)
5. **In the app**: tap ⚙️ Settings → paste your key → done!
6. The app now uses **Llama 3 AI** for smarter responses

Free limits: **14,400 requests/day** — more than enough.

---

## Step 6 — Custom Domain (Optional, ~₹700/year)

### Buy a domain
- Go to **[hostinger.in](https://hostinger.in)**
- Search `arogyasahayak.in` → ~₹699/year
- Buy domain only (no hosting needed)

### Link to Vercel (frontend)
1. Vercel → Your Project → **Settings** → **Domains**
2. Add `arogyasahayak.in`
3. Vercel shows you two DNS records to add
4. Go to Hostinger → **DNS Zone** → add these records:

   | Type | Name | Value |
   |------|------|-------|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

5. Wait 15-30 min → your domain is live with free SSL!

### Link to Render (backend API)
1. Add a CNAME record in Hostinger:

   | Type | Name | Value |
   |------|------|-------|
   | CNAME | `api` | `arogya-sahayak-api.onrender.com` |

2. Render → Your Service → **Settings** → **Custom Domains** → Add `api.arogyasahayak.in`

3. Update Vercel env: `VITE_API_URL` = `https://api.arogyasahayak.in`

---

## Step 7 — Keep Backend Awake (Free Render Fix)

Render's free tier sleeps after 15 minutes of inactivity. Fix it:

1. Go to **[uptimerobot.com](https://uptimerobot.com)** → Sign up free
2. Click **Add New Monitor**
3. Choose **HTTP(s)**
4. URL: `https://arogya-sahayak-api.onrender.com/health`
5. Monitoring interval: **Every 5 minutes**
6. Save → your backend stays awake 24/7!

---

## Final Checklist

- [ ] `npm run dev` works locally at localhost:5173
- [ ] Symptom typing returns a triage card
- [ ] Voice input works on Chrome
- [ ] Doctor listing shows 5 doctors
- [ ] Backend `/health` returns `{"status":"ok"}`
- [ ] Vercel URL loads the app
- [ ] Emergency banner appears for chest pain
- [ ] Hindi/Tamil language switch works
- [ ] Click sounds play on buttons

---

## Cost Summary

| Service | Cost |
|---------|------|
| Vercel (frontend) | **Free** |
| Render (backend) | **Free** |
| Groq AI / Llama 3 | **Free** |
| UptimeRobot | **Free** |
| Domain (optional) | ~₹700/year |
| **Total** | **₹0/month** |

---

## Troubleshooting

**Voice not working?**
→ Must use **HTTPS** (Vercel gives this automatically). On Chrome Android: tap the lock icon → allow microphone.

**API calls failing?**
→ Check Render logs. Make sure `FRONTEND_URL` in Render env matches your Vercel URL exactly.

**Vercel build failing?**
→ Make sure Root Directory is set to `frontend` in Vercel settings, not the repo root.

**Groq returning errors?**
→ App automatically falls back to the built-in rule engine. Check your API key is correct in settings.

---
*Arogya Sahayak · ET-Gen AI Hackathon 2024 · 100% Free Stack*
