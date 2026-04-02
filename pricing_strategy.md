# Pricing Strategy Document: Chatbot Cloud Architecture

## 1. Executive Summary
This document outlines the selected cloud architecture and pricing strategy derived directly from the unit economics produced by the CFO Bot estimations. The objective of this architecture is to minimize operational overhead heavily during the initial launch phase by exploiting generous free tiers, while establishing a predictably uniform scaling curve using serverless infrastructure for future growth.

## 2. Assumed Baseline Usage Profile
To realistically justify our architecture, we simulated an aggressive initial startup scale within the CFO Bot:
- **Daily Messages:** ~4,200 (126,000 monthly transactions)
- **Monthly Active Users (MAU):** ~6,600 users
- **AI Token Load:** 300 Input Tokens / 210 Output Tokens per message
- **Compute Load:** 800ms Average execution runtime per request
- **Base Currency Context:** KZT / USD (Exchange rate ~480)

## 3. Selected Technology Stack
Based upon multi-provider sorting run through the estimator, we selected the following optimized stack:
1. **Compute Framework:** Google Cloud Run / Firebase Serverless Environment
2. **AI Inference Engine:** Gemini 3 Flash 
3. **Database & Storage:** Firebase Firestore
4. **CDN & Bandwidth:** Firebase Hosting CDN

### 3.1 Justification for Serverless Compute
At 126,000 incoming messages a month (triggering an estimated 252,000 structural invocations), we remain safely shielded within standard serverless free tiers (GCP Cloud Run provides up to 2 Million free requests). 

If we selected a constant Virtual Private Server (VPS) such as the **AWS EC2 t3.micro ($7.59/mo)** or **Azure B1s ($7.59/mo)**, we would pay a rigid monthly premium ensuring resources remain active even during zero-traffic idle hours. Leveraging serverless architecture structurally forces our Compute Cost to **$0.00 USD/month**, completely eliminating early-stage overhead.

### 3.2 AI Model Market Efficiency
The CFO Bot flags AI Inference as the single most dangerous pricing vector.
We bypassed heavy enterprise models like **GPT-4o ($2.50/$10.00 per 1M tokens)**, which would force unit costs substantially upwards. Instead, we secured **Gemini 3 Flash ($0.075 input / $0.30 output)**. 

* **The Math:** 126,000 requests utilizing roughly 64 Million total aggregated tokens evaluates to under **$3.00 USD** in API hits per month compared to an estimated $100+ on premium competitors, heavily compressing our operational bottleneck.

### 3.3 Storage and Network Distribution
Using 6,600 MAUs fetching 2MB interface assets alongside message arrays evaluates to roughly 13GB of bandwidth. Firebase’s 10GB free tier ensures we only pay an overage rate of `$0.08/GB` for the remaining 3GB. Active storage payload hovers below 1GB (100% free under native conditions).

## 4. Derived Unit Economics & Final Runway
Feeding this exact selection into the calculation engine yields unprecedented efficiency margins:

- **Compute Overhead:** $0.00
- **Storage Layer:** $0.00
- **Network Bandwidth:** ~$0.24
- **AI Inference (Gemini 3 Flash):** ~$3.50

**Total Projected Cloud Cost:** ~$3.74 USD / month (≈1,795 KZT)  
**Effective Cost per Message:** ≈ $0.000029 USD

## 5. Key Insights and Strategic Analysis

### 5.1 The "Free Tier Runway" Advantage
Our analysis reveals an extraordinary operational advantage: the "Free Tier Runway." Because Firebase Serverless and GCP Cloud Run provide massive baseline limits (e.g., 2 million invocations), **the business can operate indefinitely with zero compute costs during the highly volatile early-adoption phase.** Rather than bleeding cash on fixed AWS EC2 or DigitalOcean nodes sitting idle, capitalizing on this serverless free tier guarantees absolute financial safety until organic traction is mathematically proven.

### 5.2 AI Cost Domination
The central insight from the CFO Bot's breakdown is that **AI Inference constitutes nearly 94% of the calculated operational expense ($3.50 out of the $3.74 total).** Compute, Storage, and Bandwidth are effectively inconsequential at scale. Our strategy directly mandates treating AI API pricing as the primary margin threat. If the project reverted to heavy models like GPT-4o, monthly scaling bills would immediately surge 30x. Technical vendor agility—remaining structurally capable of swapping to highly efficient models like Claude Haiku or Gemini Flash through API configurations—is a fundamental requirement for survival.

### 5.3 Risk Profile: Vendor Lock-in vs. Margin Security
Relying aggressively on Firebase and GCP networking elements inherently limits architectural portability to varying extents. However, the financial analysis proves that avoiding GCP's serverless ecosystem early on would introduce immediate fixed server costs, potentially suffocating initial operational budgets. The calculated risk here firmly justifies the Firebase lock-in for the safety net of near-zero initial unit economics. 

## 6. Scaling and Migration Conclusion
This architecture achieves absolute maximum efficiency. As our application hits hyper-scale (surpassing 2,000,000 requests monthly), our compute infrastructure will automatically migrate into Google Cloud Run's paid brackets (`$0.40 per million calls`). 

Because we decoupled from fixed VPS resources, our total infrastructure expense will exclusively track with exact usage mathematically, guaranteeing perfect elasticity and safeguarding long-term profit margins.
