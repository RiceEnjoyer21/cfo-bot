# Implementation Plan and Test Specifications

Ensure flawlessly accurate math for the CFO Bot cloud cost calculator by detailing an architecture and rigorous test specification based entirely on the provided Single Source of Truth (SSOT).

## User Review Required

> [!IMPORTANT]
> Please review this Implementation Plan and confirm if there are any preferred structures for your codebase (e.g., specific JavaScript/TypeScript test frameworks like Jest or Vitest), or if you would like me to generate a complete React/TS application from scratch.

## Proposed Changes

The implementation will focus on creating a deterministic, pure-function based calculation module that guarantees no side effects and highly accurate float mathematics, ideally executed client-side or on Firebase Functions.

### 1. Calculation Core Module

We will create a pure functional module (e.g., `calculator.ts`) exporting individual cost functions and an aggregate `calculateTotalCost` function.

**Variables Parsing:**
- `monthly_messages = daily_messages * 30`

**AI Cost (`cost_ai`):**
- Inputs: `monthly_messages`, `tokens_in`, `tokens_out`, `model`
- Logic:
  - If model is `GPT-4.1o Beta` or `Raptor mini` -> Return `0`.
  - Else -> `(monthly_messages * tokens_in / 1_000_000) * input_price + (monthly_messages * tokens_out / 1_000_000) * output_price`

**Compute Cost (`cost_compute`):**
- Inputs: `monthly_messages`, `avg_exec_ms`, `memory_gb`, `fixed_monthly_price`, `isServerless`
- Logic:
  - If VPS -> Return `fixed_monthly_price`
  - If Serverless ->
    - `invocations = monthly_messages * 2`
    - `gb_seconds = invocations * (avg_exec_ms / 1000) * memory_gb`
    - Calculate max beyond free limits: 
      - `max(0, invocations - free_invocations) / 1_000_000 * price_per_million`
      - `max(0, gb_seconds - free_gb_seconds) * price_per_gb_second`
    - Sum the serverless components.

**Storage Cost (`cost_storage`):**
- Inputs: `monthly_messages`, `monthly_active_users`, `free_storage_gb`, `price_per_gb`
- Logic:
  - `stored_bytes = (monthly_messages * 2000) + (monthly_active_users * 1000)`
  - `stored_gb = stored_bytes / 1073741824`
  - `cost_storage = max(0, stored_gb - free_storage_gb) * price_per_gb`

**Bandwidth Cost (`cost_bandwidth`):**
- Inputs: `monthly_messages`, `monthly_active_users`, `free_egress_gb`, `price_per_gb`
- Logic:
  - `message_traffic = monthly_messages * 500`
  - `asset_traffic = monthly_active_users * 2097152` (2 MB in bytes)
  - `total_egress_gb = (message_traffic + asset_traffic) / 1073741824`
  - `cost_bandwidth = max(0, total_egress_gb - free_egress_gb) * price_per_gb`

**Aggregation Module:**
- Sums `TOTAL_USD = cost_ai + cost_compute + cost_storage + cost_bandwidth`
- Calculates `cost_per_message = TOTAL_USD / monthly_messages`
- Outputs `TOTAL_KZT = TOTAL_USD * exchange_rate`

### 2. Validation Module

Implements constraints checking before calculations:
- `daily_messages > 0`
- `tokens_in + tokens_out > 0`
- `memory_gb >= 0.125`
- `avg_exec_ms >= 100`

Return descriptive exceptions or Error objects if constraint checks fail.

## Test Specifications

To guarantee mathematical flawlessness, standard double-precision floating-point edge cases (like `0.1 + 0.2`) will be mitigated by calculating in smaller units internally or using appropriate rounding functions (`Number.prototype.toFixed(2)` for financial display, though internal math preserves standard precision).

We will write unit tests matching the following specification matrix:

### Input Validation Tests
- **Valid parameters**: Passes without error.
- **`daily_messages` ≤ 0**: Fails with Error.
- **`tokens_in + tokens_out` ≤ 0**: Fails with Error.
- **`memory_gb` < 0.125**: Fails with Error.
- **`avg_exec_ms` < 100**: Fails with Error.
- **Division by zero guard**: Tests attempting to divide by zero fail gracefully.

### AI Cost Tests
- **Free-Tier Model Test**: Validate `GPT-4.1o Beta` evaluates to $0.00 exactly regardless of `daily_messages` and token quantities.
- **Standard Use Case**: E.g. Claude Haiku 4.5 checking exact formula outcome.
- **Extremely High Load**: Ensure 64-bit integer equivalent math doesn't overflow when computing billions of tokens.

### Compute Cost Tests
- **Serverless Free-Tier Exhaustion**:
  - Test below the Firebase Spark Free limit (e.g., 100k invocations) -> Compute = $0.00.
  - Test just past the Firebase Spark limit (e.g., 125,001) -> Validates exact billing of the 1 overage.
- **VPS Hardcoded Costs**: Ensure VPS tiers (e.g. AWS EC2 t3.micro) consistently return their mapped `$7.59` fixed amount regardless of usage scaling.

### Storage & Bandwidth Tests
- **Storage Sub-Free Limit Test**: Check AWS S3 usage < 5GB returns $0.00.
- **Bandwidth Heavy Assets Test**: High `monthly_active_users` (e.g., 1 million) testing the 2MB multiplier properly computes Total Egress GB, deducts free tier, and calculates cost.
- **Byte to GB Conversion Accuracy Check**: Verify exact `/ 1,073,741,824` mapping.

### Aggregation and Result Payload Tests
- **All Costs Zero (Free Tier Usage)**: Verify `TOTAL_USD = 0`, JSON mapping correctly reflects $0 for all properties.
- **Exchange Rate Application**: Ensure `TOTAL_KZT` is properly multiplied (default multiplier `480` and custom multiplier cases).
- **JSON Payload Format Test**: Verify function output exactly returns the struct:
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

## Open Questions

- What framework should we build this logic in? Would you like me to start configuring a `Node.js` utility, or bootstrap a `React` front-end application with this included?
- Do you have a preferred test runner (Jest, Mocha, Vitest)?
- Should I start implementing the exact model data tables directly into a database or keep them as hardcoded constants array in code as per SSOT?

## Verification Plan

### Automated Tests
1. Generate test suites verifying all the mathematical formulas against hand-calculated constants.
2. Run test runners to ensure 100% pass rate.

### Manual Verification
1. Compare individual component breakdown against formula outputs manually.
2. Confirm return data structures identically match section "12. Output Format" from `SSOT.md`.
