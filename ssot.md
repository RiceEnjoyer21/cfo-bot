# CFO Bot – System Specification (SSOT)

> **Single Source of Truth.** No implementation may deviate from this specification.

---

## 1. Executive Summary

CFO Bot is a **deterministic cloud cost estimation system** for Chat Bot applications.

### The system allows users to:
- Input workload assumptions (traffic, tokens, users)
- Select cloud infrastructure and AI model
- Receive a fully transparent monthly cost breakdown

### The system outputs:
- Total cost (USD)
- Equivalent cost in KZT
- Cost per message
- Component-level breakdown (AI, compute, storage, bandwidth)

---

## 2. System Scope

### 2.1 Included Components

The system **MUST** calculate costs for:

- AI Inference
- Compute (Serverless or VPS)
- Storage
- Network Egress (Bandwidth)

### 2.2 Excluded Components

The system **DOES NOT** include:

- DevOps costs (CI/CD, monitoring)
- Human labor costs
- Discounts or enterprise contracts
- Taxes (VAT, etc.)

---

## 3. Supported Cloud Providers & Pricing

### 3.1 Hosting / Compute

| Type       | Provider            | Tier / Plan                  | Monthly USD                              | Notes                          |
|------------|---------------------|------------------------------|------------------------------------------|--------------------------------|
| Serverless | Firebase (Google)   | Spark Free                   | $0.00                                    | 125K fn invocations free       |
| Serverless | Firebase (Google)   | Blaze Pay-as-you-go          | $0.40/1M calls + $0.00001/GB-sec         | —                              |
| Serverless | AWS                 | Lambda                       | $0.20/1M req + $0.00001667/GB-sec        | —                              |
| Serverless | GCP                 | Cloud Run                    | $0.00 first 2M req, $0.40/1M after       | —                              |
| VPS        | AWS                 | EC2 t3.micro                 | $7.59                                    | 2 vCPU, 1 GB RAM, us-east-1   |
| VPS        | AWS                 | EC2 t3.small                 | $15.18                                   | 2 vCPU, 2 GB RAM               |
| VPS        | GCP                 | Compute e2-micro             | $6.11                                    | 2 vCPU, 1 GB RAM               |
| VPS        | GCP                 | Compute e2-small             | $12.23                                   | 2 vCPU, 2 GB RAM               |
| VPS        | Azure               | B1s Standard                 | $7.59                                    | 1 vCPU, 1 GB RAM               |
| VPS        | Azure               | B2s Standard                 | $15.18                                   | 2 vCPU, 4 GB RAM               |
| VPS        | DigitalOcean        | Basic Droplet                | $4.00                                    | 1 vCPU, 1 GB RAM               |
| VPS        | DigitalOcean        | Basic Droplet                | $6.00                                    | 1 vCPU, 2 GB RAM               |
| VPS        | PS Cloud (KZ) 🇰🇿   | Standard VPS                 | $7.80 (~3,500 KZT)                       | 2 vCPU, 4 GB RAM               |
| VPS        | Qaztelecom (KZ) 🇰🇿 | VPS Lite                     | $4.44 (~2,000 KZT)                       | 1 vCPU, 1 GB RAM               |
| VPS        | Qaztelecom (KZ) 🇰🇿 | VPS Standard                 | $8.89 (~4,000 KZT)                       | 2 vCPU, 2 GB RAM               |

### 3.2 Storage

| Provider                   | Free Tier | Price Beyond Free |
|----------------------------|-----------|-------------------|
| Firebase Firestore         | 1 GB      | $0.18/GB          |
| AWS S3                     | 5 GB (12mo) | $0.023/GB       |
| GCP Cloud Storage          | 5 GB      | $0.020/GB         |
| Azure Blob Storage         | 5 GB (12mo) | $0.018/GB       |
| DigitalOcean Spaces        | 25 GB     | $0.02/GB          |
| PS Cloud / Qaztelecom 🇰🇿  | 20 GB     | $0.022/GB         |

### 3.3 Bandwidth / Egress

| Provider                   | Free Tier  | Price Beyond Free |
|----------------------------|------------|-------------------|
| Firebase Hosting CDN       | 10 GB/mo   | $0.08/GB          |
| AWS CloudFront             | 1 TB/mo    | $0.085/GB         |
| GCP CDN                    | 10 GB/mo   | $0.08/GB          |
| Azure CDN                  | 5 GB/mo    | $0.087/GB         |
| DigitalOcean CDN           | 1 TB/mo    | $0.01/GB          |
| PS Cloud / Qaztelecom 🇰🇿  | 100 GB/mo  | $0.05/GB          |

---

## 4. AI Model Pricing

> All prices are defined per **1,000,000 tokens (USD)**.

| Provider    | Model                        | Input $/1M | Output $/1M | Notes              |
|-------------|------------------------------|------------|-------------|--------------------|
| OpenAI      | GPT-4.1o (Free/Beta)         | $0.00      | $0.00       | Beta access        |
| OpenAI      | GPT-4o                       | $2.50      | $10.00      | —                  |
| OpenAI      | GPT-4o mini                  | $0.40      | $1.60       | —                  |
| Anthropic   | Claude Haiku 4.5             | $0.80      | $4.00       | 0.33× cost tag     |
| Google      | Gemini 2.5 Pro               | $1.25      | $10.00      | —                  |
| Google      | Gemini 3 Flash (Preview)     | $0.075     | $0.30       | 0.33× cost tag     |
| Google      | Gemini 3 Pro (Preview)       | $1.25      | $5.00       | —                  |
| Google      | Gemini 3.1 Pro (Preview)     | $1.25      | $5.00       | —                  |
| PS Cloud 🇰🇿 | Raptor mini (Preview)        | $0.00      | $0.00       | Free preview       |

> **Free-tier / Preview models** (`GPT-4.1o Beta`, `Raptor mini`): `cost_ai = 0`

---

## 5. Mathematical Cost Models

> All calculations **MUST** be deterministic and side-effect free.

### 5.1 Derived Variables

```
monthly_messages = daily_messages × 30
```

### 5.2 AI Cost

```
cost_ai =
    (monthly_messages × tokens_in  / 1,000,000) × input_price
  + (monthly_messages × tokens_out / 1,000,000) × output_price
```

> If model is **free-tier**: `cost_ai = 0`

### 5.3 Compute Cost

#### Serverless Model

```
invocations = monthly_messages × 2

gb_seconds = invocations × (avg_exec_ms / 1000) × memory_gb

cost_compute =
    max(0, invocations - free_invocations) / 1,000,000 × price_per_million
  + max(0, gb_seconds - free_gb_seconds) × price_per_gb_second
```

#### VPS Model

```
cost_compute = fixed_monthly_price
```

### 5.4 Storage Cost

```
stored_bytes = (monthly_messages × 2000) + (monthly_active_users × 1000)

stored_gb = stored_bytes / 1,073,741,824

cost_storage = max(0, stored_gb - free_storage_gb) × price_per_gb
```

### 5.5 Bandwidth Cost

```
message_traffic = monthly_messages × 500 bytes
asset_traffic   = monthly_active_users × 2 MB

total_egress_gb = (message_traffic + asset_traffic) / 1,073,741,824

cost_bandwidth = max(0, total_egress_gb - free_egress_gb) × price_per_gb
```

### 5.6 Total Cost

```
TOTAL_USD = cost_ai + cost_compute + cost_storage + cost_bandwidth

cost_per_message = TOTAL_USD / monthly_messages

TOTAL_KZT = TOTAL_USD × exchange_rate
```

> **Default:** `exchange_rate = 480`  
> ⚠️ Recommended to make configurable via UI input (current market rate ~520+).

---

## 6. Input Specification

| Parameter            | Type  | Min | Max        | Default       |
|----------------------|-------|-----|------------|---------------|
| daily_messages       | int   | 1   | 10,000,000 | 1,000         |
| monthly_active_users | int   | 1   | 1,000,000  | 500           |
| tokens_in            | int   | 50  | 128,000    | 500           |
| tokens_out           | int   | 10  | 16,000     | 300           |
| avg_exec_ms          | int   | 100 | 30,000     | 800           |
| memory_gb            | float | 0.125 | 8        | 0.25          |
| provider             | enum  | —   | —          | firebase      |
| ai_model             | enum  | —   | —          | gemini-flash  |

---

## 7. Validation Rules

The system **MUST** enforce:

| Rule                          | Constraint       |
|-------------------------------|------------------|
| `daily_messages`              | > 0              |
| `tokens_in + tokens_out`      | > 0              |
| `memory_gb`                   | ≥ 0.125          |
| `avg_exec_ms`                 | ≥ 100            |

> **On invalid input:** Return error object with message. No calculation performed.

---

## 8. Edge Case Handling

| Case               | Behavior                    |
|--------------------|-----------------------------|
| All costs = 0      | Show **"Free Tier Usage"**  |
| Extremely high load | No overflow (use 64-bit math) |
| Invalid input      | Block calculation           |
| Free AI model      | `cost_ai = 0`               |
| Division by zero   | Prevent (validated earlier) |

---

## 9. System Architecture Constraints

### 9.1 Frontend
- React (or equivalent SPA)
- Real-time recalculation (no page reload)
- State-driven UI

### 9.2 Backend
- Firebase Functions (optional)
- Pure calculation can run client-side

### 9.3 Deployment
- MUST be hosted on **Firebase Hosting**
- Public URL required

---

## 10. UI/UX Contract

The UI **MUST** include:

### Layout
- **Left panel:** Inputs
- **Right panel:** Cost breakdown
- **Bottom:** Provider comparison chart

### Features
- Real-time updates
- USD + KZT display
- Color-coded cost indicator:

| Range        | Color  |
|--------------|--------|
| < $50        | 🟢 Green  |
| $50 – $500   | 🟡 Yellow |
| > $500       | 🔴 Red    |

### Additional
- Export to CSV / PDF
- Authentication (Firebase Auth)
- Mobile responsive

---

## 11. Non-Functional Requirements

| Requirement  | Constraint               |
|--------------|--------------------------|
| Performance  | < 100ms recalculation    |
| Accuracy     | ± $0.01 USD              |
| Availability | 99% uptime               |
| Scalability  | Up to 1,000,000 users    |
| Security     | No sensitive data stored |

---

## 12. Output Format

The system **MUST** return the following structure:

```json
{
  "total_usd": number,
  "total_kzt": number,
  "cost_per_message": number,
  "breakdown": {
    "ai": number,
    "compute": number,
    "storage": number,
    "bandwidth": number
  }
}
```
---

## 13. Provider Selection Logic

The system MUST support:

- Single-provider calculation mode
- Multi-provider comparison mode

In comparison mode:
- All providers are evaluated using identical input parameters
- Results are displayed side-by-side
