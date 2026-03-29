# CitizenCare 🏛️

An intelligent AI-powered citizen grievance classification and tracking portal that enables seamless complaint submission, real-time status tracking, and efficient authority dashboard management.

## 🎯 Features

- **Multi-Language Support**: Submit complaints in 10 Indian languages (English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, Odia)
- **Voice & Text Input**: Record complaints directly or type them in
- **Smart Classification**: AI-powered keyword parser automatically categorizes complaints and assigns departments
- **Urgency Detection**: System intelligently identifies critical issues and triggers instant alerts
- **Real-Time Tracking**: Citizens can track complaint status with unique complaint IDs
- **Authority Dashboard**: Comprehensive dashboard for government officials to manage and resolve complaints
- **Visual Analytics**: Charts and filters to analyze complaint patterns by department and urgency
- **Secure Authentication**: Role-based access control with Supabase Auth
- **Responsive Design**: Beautiful, mobile-friendly UI with vibrant color scheme

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Supabase Auth
- **Voice Recognition**: Browser Web Speech API + OpenAI Whisper fallback
- **Email Alerts**: SendGrid (for critical complaints)
- **Charts**: Chart.js + react-chartjs-2
- **Hosting**: Vercel (recommended)

## 📋 System Architecture

```
┌─────────────────┐
│  Citizen Portal │  (index.jsx, support.jsx)
├─────────────────┤
│   Voice/Text    │
│   Input Handler │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Processor  │  (api/process.js)
│   - Keywords    │
│   - Scoring     │
│   - Department  │
│   - Urgency     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │  (Supabase)
│    - Store      │
│    - Realtime   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Authority      │  (dashboard.jsx)
│  Dashboard      │
│  - View         │
│  - Filter       │
│  - Update       │
└─────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Supabase account
- SendGrid account (for alerts)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/SAI-RAHUL-ROKKAM/CitizenCare.git
cd CitizenCare
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env.local
```

4. **Fill in your environment variables in `.env.local`**
```
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
SENDGRID_API_KEY=your_sendgrid_key
ALERT_EMAIL=authority@yourcity.gov.in
LOCATIONIQ_KEY=your_locationiq_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open in browser**
```
http://localhost:3000
```

## 📱 Usage

### For Citizens
1. Visit `http://localhost:3000`
2. Type or record a complaint in any supported language
3. Click "Submit complaint"
4. View generated complaint summary, department, and urgency
5. Copy complaint ID to track status
6. Use "Track complaint" tab to check real-time updates

### For Authorities
1. Visit `http://localhost:3000/login`
2. Sign up or use test credentials:
   - Email: `authority-test@citizencare.test`
   - Password: `Test@1234`
3. View dashboard with:
   - Statistics (total, pending, resolved, critical)
   - Charts by department and urgency
   - Complaint list with filters
   - Click any complaint to view details and update status

## 🔐 Security

- ✅ Environment variables protected in `.env.local` (excluded from Git)
- ✅ `.env.example` contains only dummy keys
- ✅ Supabase Row Level Security (RLS) for database access control
- ✅ Role-based authentication for authority dashboard
- ✅ No API keys exposed in source code
- ✅ SendGrid alerts only for critical complaints

## 📁 Project Structure

```
CitizenCare/
├── pages/
│   ├── _app.jsx                 # App wrapper
│   ├── index.jsx                # Citizen portal (submit/track)
│   ├── dashboard.jsx            # Authority dashboard
│   ├── login.jsx                # Authentication
│   ├── support.jsx              # FAQ & help center
│   └── api/
│       ├── process.js           # Complaint parser & classifier
│       ├── status.js            # Track complaint status
│       ├── alert.js             # Send critical alerts
│       └── transcribe.js        # Voice transcription
├── lib/
│   └── supabase.js              # Supabase client config
├── styles/
│   └── globals.css              # Global styles & animations
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind configuration
└── postcss.config.js            # PostCSS configuration
```

## 🧠 How It Works

### Complaint Processing Flow

1. **Input**: Citizen submits text/voice in any language
2. **Detection**: System detects language from Unicode script
3. **Scoring**: Multi-keyword scoring system finds best department match
4. **Rules**: Override rules for critical medical/safety terms
5. **Extraction**: Location parsing using regex patterns
6. **Classification**: Department, urgency, and action items assigned
7. **Storage**: Complaint saved to Supabase with `status: pending`
8. **Alerts**: If critical → SendGrid email sent to authority
9. **Tracking**: Citizen gets unique ID to track status

### Department Keywords

System supports keywords in 10 languages for:
- Health, Hospital
- Police
- Sanitation
- Roads, Water, Electricity
- Education
- Transport
- Municipal
- Environment
- Rescue
- Other (fallback)

## 🎓 Example Test Cases

### Test 1: Health Emergency ✅
**Input**: "my teacher got a heart attack our school is at lalitha nagar , rajahmundry"
**Result**: 
- Department: Health
- Urgency: Critical
- ETA: 12 hours

### Test 2: Road Issue ✅
**Input**: "large pothole near Ramaiah School on MG Road. Two bikes fell last week"
**Result**:
- Department: Roads
- Urgency: High
- ETA: 24-48 hours

### Test 3: Sanitation ✅
**Input**: "गंदगी और कचरे के ढेर हमारे इलाके में"
**Result**:
- Department: Sanitation
- Urgency: Medium
- ETA: 3-5 days

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

```bash
git push origin main
# Vercel auto-deploys
```

### Environment Variables for Production
Set these in your hosting platform (Vercel, Netlify, etc.):
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SENDGRID_API_KEY`
- `ALERT_EMAIL`
- `LOCATIONIQ_KEY`
- `NEXT_PUBLIC_BASE_URL` (your domain)

## 📊 Performance

- **Processing Time**: < 3 seconds for complaint classification
- **Database**: Real-time sync using Supabase subscriptions
- **Voice Input**: Supports 10 languages with offline fallback
- **Responsive**: Mobile, tablet, and desktop optimized

## 🔮 Future Enhancements

- [ ] ML/NLP model for intent classification
- [ ] Map-based geo-visualization of complaints
- [ ] SMS/WhatsApp citizen notifications
- [ ] Advanced admin dashboard with SLA tracking
- [ ] Automated translation to English
- [ ] Chat support interface
- [ ] Gamification (badges/credits for citizens)
- [ ] Photo/video attachments
- [ ] Integration with government databases
- [ ] Analytics and reporting tools

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Check the FAQ in `/support` page
- Visit help center at `http://localhost:3000/support`

## 👨‍💻 Authors

- **SAI RAHUL ROKKAM** - Initial development

Built for the National Hackathon 2026

---

**Made with ❤️ for better citizen-government communication**
