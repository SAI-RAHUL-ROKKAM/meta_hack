# CivicAI — GenAI Citizen Complaint Summarizer

> National Hackathon Project · Built with React.js + Next.js + Claude API + Supabase

AI-powered platform that transforms unstructured citizen complaints into structured, actionable reports for government authorities — with multilingual support, voice input, real-time dashboards, and automated critical alerts.

---

## Setup in 5 steps

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Fill in API keys
Open `.env.local` and replace each placeholder with your real key:

```env
ANTHROPIC_API_KEY=sk-ant-...        # console.anthropic.com
OPENAI_API_KEY=sk-proj-...          # platform.openai.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SENDGRID_API_KEY=SG....             # sendgrid.com
ALERT_EMAIL=youremail@gmail.com
LOCATIONIQ_KEY=pk....               # locationiq.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Step 3 — Create Supabase table
Go to supabase.com → your project → SQL Editor → run:

```sql
create table complaints (
  id uuid primary key default gen_random_uuid(),
  raw_text text,
  language text,
  summary text,
  department text,
  urgency text,
  action_items jsonb,
  location text,
  estimated_resolution text,
  language_detected text,
  status text default 'pending',
  created_at timestamptz default now()
);
```

### Step 4 — Run locally
```bash
npm run dev
```
- Citizen portal: http://localhost:3000
- Authority dashboard: http://localhost:3000/dashboard

### Step 5 — Deploy to Vercel
```bash
npx vercel
```
Add all `.env.local` variables in Vercel → Settings → Environment Variables.
Change `NEXT_PUBLIC_BASE_URL` to your Vercel URL after deploying.

---

## Project structure

```
civicai/
├── pages/
│   ├── index.jsx           Citizen portal (submit + track)
│   ├── dashboard.jsx       Authority dashboard (charts + table)
│   └── api/
│       ├── process.js      Claude AI engine
│       ├── transcribe.js   Whisper voice-to-text
│       ├── alert.js        SendGrid critical alerts
│       └── status.js       Complaint status check
├── lib/
│   └── supabase.js
├── styles/
│   └── globals.css
├── .env.local              API keys (never commit!)
├── .gitignore
└── README.md
```

---

## GitHub upload (for hackathon submission)

```bash
# Inside the civicai folder:
git init
git add .
git commit -m "Initial commit — CivicAI hackathon project"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/civicai.git
git branch -M main
git push -u origin main
```

IMPORTANT: `.env.local` is in `.gitignore` so your API keys will NOT be uploaded.
Add your keys manually in Vercel environment variables for deployment.

---

## Free API tiers

| API | Free tier | Sign up |
|-----|-----------|---------|
| Claude API | $5 credits | console.anthropic.com |
| Whisper | $5 credits (~$0.006/min) | platform.openai.com |
| Supabase | 500MB DB free | supabase.com |
| SendGrid | 100 emails/day free | sendgrid.com |
| LocationIQ | 5,000 req/day free | locationiq.com |
