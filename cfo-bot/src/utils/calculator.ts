export type AIModel =
  | 'gpt-4.1o-beta'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-haiku-4.5'
  | 'gemini-2.5-pro'
  | 'gemini-3-flash'
  | 'gemini-3-pro'
  | 'gemini-3.1-pro'
  | 'raptor-mini';

export type ComputeProvider =
  | 'firebase-spark'
  | 'firebase-blaze'
  | 'aws-lambda'
  | 'gcp-cloud-run'
  | 'aws-t3-micro'
  | 'aws-t3-small'
  | 'gcp-e2-micro'
  | 'gcp-e2-small'
  | 'azure-b1s'
  | 'azure-b2s'
  | 'do-basic-1-1'
  | 'do-basic-1-2'
  | 'pscloud-vps'
  | 'qaztelecom-lite'
  | 'qaztelecom-stand';

export type StorageProvider =
  | 'firebase'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'digitalocean'
  | 'pscloud'; // includes Qaztelecom

export type BandwidthProvider =
  | 'firebase'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'digitalocean'
  | 'pscloud'; // includes Qaztelecom

export interface InputParams {
  daily_messages: number;
  monthly_active_users: number;
  tokens_in: number;
  tokens_out: number;
  avg_exec_ms: number;
  memory_gb: number;
  ai_model: AIModel;
  compute_id: ComputeProvider;
  storage_id: StorageProvider;
  bandwidth_id: BandwidthProvider;
  exchange_rate?: number;
}

export interface CostBreakdown {
  ai: number;
  compute: number;
  storage: number;
  bandwidth: number;
}

export interface CalculationResult {
  total_usd: number;
  total_kzt: number;
  cost_per_message: number;
  breakdown: CostBreakdown;
}

// -----------------------------------------------------
// PRICING CONSTANTS (from SSOT)
// -----------------------------------------------------

export const AI_MODELS: Record<AIModel, { in: number; out: number; free: boolean }> = {
  'gpt-4.1o-beta': { in: 0, out: 0, free: true },
  'gpt-4o': { in: 2.5, out: 10.0, free: false },
  'gpt-4o-mini': { in: 0.4, out: 1.6, free: false },
  'claude-haiku-4.5': { in: 0.8, out: 4.0, free: false },
  'gemini-2.5-pro': { in: 1.25, out: 10.0, free: false },
  'gemini-3-flash': { in: 0.075, out: 0.3, free: false },
  'gemini-3-pro': { in: 1.25, out: 5.0, free: false },
  'gemini-3.1-pro': { in: 1.25, out: 5.0, free: false },
  'raptor-mini': { in: 0, out: 0, free: true },
};

export const COMPUTE_MODELS: Record<
  ComputeProvider,
  { type: 'serverless' | 'vps'; fixed?: number; pricePer1M?: number; pricePerGbSec?: number; freeInvoc?: number; freeGbSec?: number }
> = {
  'firebase-spark': { type: 'serverless', pricePer1M: 0, pricePerGbSec: 0, freeInvoc: 125000, freeGbSec: 0 },
  'firebase-blaze': { type: 'serverless', pricePer1M: 0.4, pricePerGbSec: 0.00001, freeInvoc: 0, freeGbSec: 0 }, // Unclear standard free for Blaze beyond Spark, assuming 0
  'aws-lambda': { type: 'serverless', pricePer1M: 0.2, pricePerGbSec: 0.00001667, freeInvoc: 0, freeGbSec: 0 },
  'gcp-cloud-run': { type: 'serverless', pricePer1M: 0.4, pricePerGbSec: 0, freeInvoc: 2000000, freeGbSec: 0 }, // no mention of GB-sec logic for GCP
  'aws-t3-micro': { type: 'vps', fixed: 7.59 },
  'aws-t3-small': { type: 'vps', fixed: 15.18 },
  'gcp-e2-micro': { type: 'vps', fixed: 6.11 },
  'gcp-e2-small': { type: 'vps', fixed: 12.23 },
  'azure-b1s': { type: 'vps', fixed: 7.59 },
  'azure-b2s': { type: 'vps', fixed: 15.18 },
  'do-basic-1-1': { type: 'vps', fixed: 4.0 },
  'do-basic-1-2': { type: 'vps', fixed: 6.0 },
  'pscloud-vps': { type: 'vps', fixed: 7.8 },
  'qaztelecom-lite': { type: 'vps', fixed: 4.44 },
  'qaztelecom-stand': { type: 'vps', fixed: 8.89 },
};

export const STORAGE_MODELS: Record<StorageProvider, { freeGB: number; priceGB: number }> = {
  firebase: { freeGB: 1, priceGB: 0.18 },
  aws: { freeGB: 5, priceGB: 0.023 },
  gcp: { freeGB: 5, priceGB: 0.02 },
  azure: { freeGB: 5, priceGB: 0.018 },
  digitalocean: { freeGB: 25, priceGB: 0.02 },
  pscloud: { freeGB: 20, priceGB: 0.022 },
};

export const BANDWIDTH_MODELS: Record<BandwidthProvider, { freeGB: number; priceGB: number }> = {
  firebase: { freeGB: 10, priceGB: 0.08 },
  aws: { freeGB: 1024, priceGB: 0.085 }, // 1 TB
  gcp: { freeGB: 10, priceGB: 0.08 },
  azure: { freeGB: 5, priceGB: 0.087 },
  digitalocean: { freeGB: 1024, priceGB: 0.01 }, // 1 TB
  pscloud: { freeGB: 100, priceGB: 0.05 },
};

// -----------------------------------------------------
// CORE CALCULATIONS
// -----------------------------------------------------

export function calculateCost(params: InputParams): CalculationResult {
  // 1. Validation Rules
  if (params.daily_messages <= 0) throw new Error('daily_messages must be > 0');
  if (params.tokens_in + params.tokens_out <= 0) throw new Error('tokens_in + tokens_out must be > 0');
  if (params.memory_gb < 0.125) throw new Error('memory_gb must be >= 0.125');
  if (params.avg_exec_ms < 100) throw new Error('avg_exec_ms must be >= 100');

  const monthly_messages = params.daily_messages * 30;

  // 2. AI Cost
  let cost_ai = 0;
  const ai = AI_MODELS[params.ai_model];
  if (!ai.free) {
    const costIn = (monthly_messages * params.tokens_in / 1000000) * ai.in;
    const costOut = (monthly_messages * params.tokens_out / 1000000) * ai.out;
    cost_ai = costIn + costOut;
  }

  // 3. Compute Cost
  let cost_compute = 0;
  const compute = COMPUTE_MODELS[params.compute_id];
  if (compute.type === 'vps') {
    cost_compute = compute.fixed || 0;
  } else {
    const invocations = monthly_messages * 2;
    const gb_seconds = invocations * (params.avg_exec_ms / 1000) * params.memory_gb;
    const billedInvocations = Math.max(0, invocations - (compute.freeInvoc || 0));
    const billedGbSec = Math.max(0, gb_seconds - (compute.freeGbSec || 0));

    cost_compute = (billedInvocations / 1000000) * (compute.pricePer1M || 0) + billedGbSec * (compute.pricePerGbSec || 0);
  }

  // 4. Storage Cost
  const stored_bytes = monthly_messages * 2000 + params.monthly_active_users * 1000;
  const stored_gb = stored_bytes / 1073741824;
  const storageModel = STORAGE_MODELS[params.storage_id];
  const billed_storage_gb = Math.max(0, stored_gb - storageModel.freeGB);
  const cost_storage = billed_storage_gb * storageModel.priceGB;

  // 5. Bandwidth Cost
  const message_traffic = monthly_messages * 500;
  const asset_traffic = params.monthly_active_users * 2097152; // 2 MB
  const total_egress_gb = (message_traffic + asset_traffic) / 1073741824;
  const bandwidthModel = BANDWIDTH_MODELS[params.bandwidth_id];
  const billed_egress_gb = Math.max(0, total_egress_gb - bandwidthModel.freeGB);
  const cost_bandwidth = billed_egress_gb * bandwidthModel.priceGB;

  // 6. Totals
  const total_usd = cost_ai + cost_compute + cost_storage + cost_bandwidth;
  const cost_per_message = total_usd / monthly_messages;
  const exchange_rate = params.exchange_rate || 480;
  const total_kzt = total_usd * exchange_rate;

  return {
    total_usd,
    total_kzt,
    cost_per_message,
    breakdown: {
      ai: cost_ai,
      compute: cost_compute,
      storage: cost_storage,
      bandwidth: cost_bandwidth
    }
  };
}
