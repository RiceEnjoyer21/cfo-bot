# CFO Bot — Cloud Cost Estimator for Chatbot Apps

Spec-Driven Development Project · Deployed on Firebase Hosting · Built with React + Vite

🔗 **Live Demo:** https://cfochatbot.firebaseapp.com/

---

## Project Overview

CFO Bot estimates the monthly cloud infrastructure cost of running a chatbot application. You input your workload assumptions, choose a provider and AI model — and get a fully transparent cost breakdown instantly.

**Supports:**
- 7 cloud providers: Firebase, AWS, GCP, Azure, DigitalOcean, PS Cloud 🇰🇿, Qaztelecom 🇰🇿
- 9 AI models: GPT-4.1o (Free), GPT-4o, GPT-4o mini, Claude Haiku 4.5, Gemini 2.5 Pro, Gemini 3 Flash, Gemini 3 Pro, Gemini 3.1 Pro, Raptor mini (Free)
- Dual currency: USD + KZT
- 4 cost components: AI API, Compute, Storage, Bandwidth
- Export results to CSV or PDF
- Color-coded cost indicator (🟢 < $50 / 🟡 $50–$500 / 🔴 > $500)

---

## Architecture

```
cfo-bot/
├── cfo-bot/
│   ├── src/
│   │   ├── config/pricing.config.js   # All pricing data
│   │   ├── utils/calculator.js        # Math engine (matches SSOT exactly)
│   │   └── components/                # React UI components
│   ├── firebase.json                  # Firebase Hosting config
│   └── vite.config.js
├── ssot.md                            # Single Source of Truth specification
├── implementation_plan.md             # Implementation plan
└── pricing_strategy.md                # Business & pricing strategy
```

All calculations run 100% client-side — no backend needed, instant results.

---

## Cost Model

```
TOTAL = cost_ai + cost_compute + cost_storage + cost_bandwidth

cost_ai = (monthly_messages × tokens_in  / 1,000,000 × price_input)
        + (monthly_messages × tokens_out / 1,000,000 × price_output)

cost_compute = fixed_usd                              (VPS)
             OR serverless invocation + GB-sec pricing

cost_storage   = max(0, stored_gb  - free_gb) × price_per_gb
cost_bandwidth = max(0, egress_gb  - free_gb) × price_per_gb

TOTAL_KZT = TOTAL_USD × 480
```

Full derivation in [`ssot.md`](./ssot.md).

---

## Local Setup

```bash
# Clone
git clone https://github.com/RiceEnjoyer21/cfo-bot.git
cd cfo-bot/cfo-bot

# Install
npm install

# Run locally
npm run dev
# Opens at http://localhost:5173

# Build
npm run build
```

## Firebase Deployment

```bash
# Install Firebase CLI (once)
npm install -g firebase-tools

# Login
firebase login

# Deploy
npm run build
firebase deploy
```

---

## SDD Workflow

| Phase | Artifact | Status |
|---|---|---|
| Phase 1 | SSOT Specification (`ssot.md`) | ✅ Done |
| Phase 2 | Implementation Plan (`implementation_plan.md`) | ✅ Done |
| Phase 3 | Firebase Deployment | 🔗 Live |
| Phase 4 | Pricing Strategy (`pricing_strategy.md`) | ✅ Done |
