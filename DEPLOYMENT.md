# Deployment Guide

## Quick Deployment Options

### Option 1: Vercel (Recommended - Easiest)

**Pros:** Free tier, GitHub integration, automatic deploys, great for Node.js

**Steps:**

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial ai-compiler demo"
git remote add origin https://github.com/YOUR_USERNAME/ai-compiler-demo.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Import your repository
   - Framework: `Other`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment: No env vars needed
   - Deploy

3. Your app will be live at `https://your-project-name.vercel.app`

---

### Option 2: Railway (Very Easy)

**Pros:** Simple UI, good for startups, Node.js friendly

**Steps:**

1. Push to GitHub (same as above)

2. Go to [railway.app](https://railway.app)
   - Connect GitHub account
   - Select your repository
   - Railway auto-detects Node.js
   - Set PORT=3000 in variables if needed
   - Deploy

3. Your app will be live at a Railway-provided URL

---

### Option 3: Render (Easy)

**Pros:** Free tier, manual deploy option available

**Steps:**

1. Push to GitHub

2. Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect GitHub
   - Select repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Deploy

3. Your app will be live at a Render-provided URL

---

## Local Development Before Deployment

Make sure everything works:

```bash
npm run check    # TypeScript compile check
npm run build    # Build for production
npm run start    # Test production build locally
```

Then visit: `http://localhost:3000`

---

## Environment Configuration

No environment variables required for this demo, but if you add API keys:

**Vercel:** Set in project Settings > Environment Variables
**Railway:** Set in project Variables tab
**Render:** Set in Environment section during creation

---

## Testing Deployment

Once deployed:

1. Test the UI: Open the live URL
2. Test the API: Generate a config via the web form
3. Verify the output is valid JSON

Example request:
```bash
curl -X POST https://your-live-url.com/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Build a CRM with login and contacts"}'
```

---

## Troubleshooting

**Build fails:**
- Check `npm run check` passes locally
- Verify `package.json` has all dependencies

**Port issues:**
- Deployment platforms provide `PORT` env variable
- `src/server.ts` uses `process.env.PORT || 4000`

**Public files not serving:**
- Verify `public/index.html` exists
- Check Express middleware order in `src/server.ts`

---

## Cost

- **Vercel Free:** ✅ Sufficient for demo
- **Railway Free:** ✅ $5/month credits
- **Render Free:** ✅ Limited but works
- **Heroku:** Paid tier (no longer free)

