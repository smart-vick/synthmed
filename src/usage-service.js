import { recordUsage, getUsageByAccount, getUsageStats as getUsageStatsDb } from '../db.js';

// Pricing tiers (in cents per 1000 records)
const TIER_PRICING = {
  free: {
    monthlyRecords: 1000,
    costPerThousand: 0,
    rateLimitPerHour: 100,
  },
  starter: {
    monthlyRecords: 50000,
    costPerThousand: 50, // $0.50 per 1000 records
    rateLimitPerHour: 5000,
  },
  pro: {
    monthlyRecords: 500000,
    costPerThousand: 25, // $0.25 per 1000 records
    rateLimitPerHour: 50000,
  },
  enterprise: {
    monthlyRecords: null, // Unlimited
    costPerThousand: 10, // $0.10 per 1000 records
    rateLimitPerHour: null, // Unlimited
  },
};

// Calculate cost in cents
export function calculateCost(tier, recordsGenerated) {
  const pricing = TIER_PRICING[tier] || TIER_PRICING.free;
  if (pricing.costPerThousand === 0) return 0;
  return Math.ceil((recordsGenerated / 1000) * pricing.costPerThousand);
}

// Track API usage - CRITICAL FIX: Now accepts actual tier for accurate billing
export function trackUsage(accountId, apiKeyId, endpoint, recordsGenerated = 1, tier = 'free') {
  // CRITICAL: Use the actual tier, not hardcoded 'free'
  const costCents = calculateCost(tier, recordsGenerated);
  const now = new Date().toISOString();

  try {
    const result = recordUsage.run({
      account_id: accountId,
      api_key_id: apiKeyId,
      endpoint,
      records_generated: recordsGenerated,
      cost_cents: costCents,
      created_at: now,
    });

    return {
      id: result.lastInsertRowid,
      recordsGenerated,
      costCents,
      tier,
    };
  } catch (err) {
    console.error('[usage-service] Failed to track usage:', err.message);
    return null;
  }
}

// Get usage stats for account (last 30 days)
export function getUsageStats(accountId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = getUsageStatsDb.get(accountId, thirtyDaysAgo);
    return {
      totalRequests: result.total_requests || 0,
      totalRecords: result.total_records || 0,
      totalCostCents: result.total_cost || 0,
      totalCostDollars: ((result.total_cost || 0) / 100).toFixed(2),
    };
  } catch (err) {
    console.error('[usage-service] Failed to get stats:', err.message);
    return null;
  }
}

// Check rate limit
export function checkRateLimit(tier) {
  const limits = TIER_PRICING[tier] || TIER_PRICING.free;
  return limits.rateLimitPerHour;
}

// Get tier pricing
export function getTierPricing(tier) {
  return TIER_PRICING[tier] || TIER_PRICING.free;
}

// Get all tiers with pricing
export function getAllTierPricing() {
  return Object.entries(TIER_PRICING).map(([tier, pricing]) => ({
    tier,
    ...pricing,
  }));
}
