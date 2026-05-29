# AI Compiler Demo - Deployment Instructions

## Recommended: Deploy on Vercel (5 minutes)

### Prerequisites
- GitHub account
- Vercel account (free)

### Deploy

1. **Push to GitHub:**
```bash
cd c:\Users\sivan\OneDrive\Desktop\mldemo
git init
git add .
git commit -m "AI compiler demo - ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/ai-compiler-demo.git
git push -u origin main
```

2. **Deploy on Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import from GitHub → select your repo
   - Framework: `Other`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click Deploy

3. **Test your live app:**
   - Vercel will give you a URL like `https://ai-compiler-demo-abcd.vercel.app`
   - Open it in browser
   - Try the form with: "Build a CRM with login and contacts"

---

## Alternative Options

### Railway (Similar difficulty)
- https://railway.app → Connect GitHub → Auto-deploy
- Output: `railway-yourproject.up.railway.app`

### Render (Similar difficulty)
- https://render.com → New Web Service → GitHub integration
- Output: `ai-compiler-demo.onrender.com`

---

## After Deployment

1. **Share the live URL** in the submission form
2. **Test with new prompts** from the evaluator:
   - "Build a community platform with member profiles, event calendar, premium groups, and moderation tools"
   - "Create a marketplace with seller accounts, product catalogs, checkout, and analytics"

3. **Monitor logs** for any errors:
   - Vercel: Deployments tab
   - Railway: Logs tab
   - Render: Logs tab

---

## Troubleshooting

**Build fails**
```bash
npm run check  # Check TypeScript locally first
```

**Server not starting**
- Check PORT is from `process.env.PORT` (platforms auto-set this)
- Verify `dist/server.js` exists after build

**Static files (UI) not serving**
- `public/index.html` is auto-served by Express middleware
- Check file exists: `ls public/index.html`

**API not responding**
- Test locally: `npm run dev` then `curl http://localhost:4000/health`
- Check Vercel logs for errors

