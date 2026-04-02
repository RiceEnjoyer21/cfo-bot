import { describe, it, expect } from 'vitest';
import { calculateCost } from './calculator';
import type { InputParams } from './calculator';

const defaultParams: InputParams = {
  daily_messages: 1000,
  monthly_active_users: 500,
  tokens_in: 500,
  tokens_out: 300,
  avg_exec_ms: 800,
  memory_gb: 0.25,
  ai_model: 'gemini-3-flash',
  compute_id: 'firebase-spark',
  storage_id: 'firebase',
  bandwidth_id: 'firebase'
};

describe('Calculator Validation and Core Logic', () => {
  it('should throw an error if daily_messages is <= 0', () => {
    expect(() => calculateCost({ ...defaultParams, daily_messages: 0 })).toThrow('daily_messages must be > 0');
    expect(() => calculateCost({ ...defaultParams, daily_messages: -1 })).toThrow('daily_messages must be > 0');
  });

  it('should throw error if tokens_in + tokens_out <= 0', () => {
    expect(() => calculateCost({ ...defaultParams, tokens_in: 0, tokens_out: 0 })).toThrow('tokens_in + tokens_out must be > 0');
  });

  it('should throw error if memory_gb < 0.125', () => {
    expect(() => calculateCost({ ...defaultParams, memory_gb: 0.1 })).toThrow('memory_gb must be >= 0.125');
  });

  it('should throw error if avg_exec_ms < 100', () => {
    expect(() => calculateCost({ ...defaultParams, avg_exec_ms: 99 })).toThrow('avg_exec_ms must be >= 100');
  });
});

describe('AI Cost Tests', () => {
  it('should evaluate free-tier models to exactly $0.00', () => {
    const resultBeta = calculateCost({ ...defaultParams, ai_model: 'gpt-4.1o-beta' });
    expect(resultBeta.breakdown.ai).toBe(0);

    const resultRaptor = calculateCost({ ...defaultParams, ai_model: 'raptor-mini' });
    expect(resultRaptor.breakdown.ai).toBe(0);
  });

  it('should calculate accurate standard use cases (Claude Haiku 4.5)', () => {
    // 30,000 monthly messages. 500 in, 300 out.
    // 30000 * 500 / 1M = 15 million? No, 15 M tokens? 30,000 * 500 = 15,000,000 = 15M / 1M = 15 units.
    // Cost in: 15 * 0.8 = $12
    // Cost out: (30000 * 300 = 9M) -> 9 * 4.0 = $36
    // Total = $48
    const result = calculateCost({ ...defaultParams, ai_model: 'claude-haiku-4.5' });
    expect(result.breakdown.ai).toBe(48.0);
  });
});

describe('Compute Cost Tests', () => {
  it('should return fixed map prices for VPS models', () => {
    const micro = calculateCost({ ...defaultParams, compute_id: 'aws-t3-micro' });
    expect(micro.breakdown.compute).toBe(7.59);

    const qazlite = calculateCost({ ...defaultParams, compute_id: 'qaztelecom-lite' });
    expect(qazlite.breakdown.compute).toBe(4.44);
  });

  it('should return exactly $0 for serverless if within free tier (Firebase Spark)', () => {
    // 30000 msgs * 2 = 60000 invoc. < 125K limit
    const spark = calculateCost({ ...defaultParams, compute_id: 'firebase-spark' });
    expect(spark.breakdown.compute).toBe(0);
  });

  it('should correctly invoice overage beyond free tier', () => {
    // monthly_messages = 70000 -> 140000 invocations
    // overage = 15000 invoc
    const params: InputParams = {
        ...defaultParams,
        daily_messages: 70000 / 30, // 2333.33 => 70,000 monthly
        compute_id: 'firebase-spark', // wait, firebase-spark cost multiplier is $0!
    };
    const c1 = calculateCost(params);
    expect(c1.breakdown.compute).toBe(0); // since spark has 0 multipliers

    // Firebase Blaze: invoc limit is 0 (assumed), 0.40/1M, 0.00001/GBsec
    // monthly_messages = 100,000 -> invoc = 200,000
    // gbsec = 200,000 * (800/1000) * 0.25 = 40,000
    // cost = (200000 / 1000000)*0.4 + 40000*0.00001 = 0.08 + 0.4 = 0.48
    const blaze = calculateCost({ ...defaultParams, daily_messages: 100000/30, compute_id: 'firebase-blaze' });
    expect(blaze.breakdown.compute).toBeCloseTo(0.48);
  });
});

describe('Storage & Bandwidth Tests', () => {
  it('should not bill if under free storage limit', () => {
    const s3 = calculateCost({ ...defaultParams, storage_id: 'aws' }); // 5GB free
    expect(s3.breakdown.storage).toBe(0);
  });

  it('should accurately calculate heavy bandwidth with math reduction formula', () => {
    // 1M users = 1M * 2MB asset = 2,097,152,000,000 bytes 
    // Which is approx 1953 GB
    // Free AWS = 1024 GB. Overage = approx 929 GB * 0.085
    const heavyBM = calculateCost({ ...defaultParams, monthly_active_users: 1000000, bandwidth_id: 'aws' });
    
    const expectedStoredBytes = (30000 * 500) + (1000000 * 2097152); // 15,000,000 + 2,097,152,000,000 = 2,097,167,000,000
    const totalEgressGb = expectedStoredBytes / 1073741824; // 1953.1422
    const billedGb = totalEgressGb - 1024; // 929.1422
    const expectedPrice = billedGb * 0.085; // 78.977

    expect(heavyBM.breakdown.bandwidth).toBeCloseTo(expectedPrice);
  });
});

describe('Aggregation and Result Payload Test', () => {
  it('should securely calculate total combinations', () => {
    // use a static configuration testing all totals
    const result = calculateCost({
      daily_messages: 1000, // 30,000 monthly
      monthly_active_users: 500,
      tokens_in: 500, // 30k * 500 / 1M = 15m -> 15.
      tokens_out: 300, // 30k * 300 / 1M = 9m -> 9. 
      ai_model: 'gemini-3-flash', // (15 * 0.075) + (9 * 0.3) = 1.125 + 2.7 = 3.825
      compute_id: 'aws-t3-micro', // 7.59
      storage_id: 'firebase', // 1GB free > math = 0
      bandwidth_id: 'firebase', // 10GB free > math = 0
      avg_exec_ms: 800,
      memory_gb: 0.25,
      exchange_rate: 480
    });

    expect(result.breakdown.ai).toBeCloseTo(3.825);
    expect(result.breakdown.compute).toBe(7.59);
    expect(result.breakdown.storage).toBe(0);
    expect(result.breakdown.bandwidth).toBe(0);

    const total = 3.825 + 7.59;
    expect(result.total_usd).toBeCloseTo(total);
    expect(result.total_kzt).toBeCloseTo(total * 480);
    expect(result.cost_per_message).toBeCloseTo(total / 30000);
  });
});
