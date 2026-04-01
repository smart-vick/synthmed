import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://koreeokbppxvbecvoool.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Account operations
export const createAccount = {
  run: async (email, passwordHash, organization) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        email,
        password_hash: passwordHash,
        organization,
        tier: 'free',
        status: 'active',
        created_at: now,
        updated_at: now
      })
      .select('id');

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    return { lastID: data[0].id };
  }
};

export const getAccountByEmail = {
  get: async (email) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', email)
      .neq('status', 'deleted')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error.message);
      throw error;
    }

    return data || null;
  }
};

export const getAccountById = {
  get: async (id) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .neq('status', 'deleted')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error.message);
      throw error;
    }

    return data || null;
  }
};

export const updateAccountTier = {
  run: async (tier, updatedAt, id) => {
    const { error } = await supabase
      .from('accounts')
      .update({
        tier,
        updated_at: updatedAt
      })
      .eq('id', id);

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

export const updateStripeCustomerId = {
  run: async (stripeCustomerId, updatedAt, id) => {
    const { error } = await supabase
      .from('accounts')
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: updatedAt
      })
      .eq('id', id);

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

export const getAccountByStripeCustomerId = {
  get: async (stripeCustomerId) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .neq('status', 'deleted')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error.message);
      throw error;
    }

    return data || null;
  }
};

export const deleteAccount = {
  run: async (updatedAt, id) => {
    const { error } = await supabase
      .from('accounts')
      .update({
        status: 'deleted',
        updated_at: updatedAt
      })
      .eq('id', id);

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

// API Key operations
export const createApiKey = {
  run: async (accountId, keyHash, name, expiresAt) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        account_id: accountId,
        key: keyHash,
        name,
        expires_at: expiresAt,
        created_at: now
      })
      .select('id');

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    return { lastID: data[0].id };
  }
};

export const getApiKeyByKey = {
  get: async (keyHash) => {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', keyHash)
      .is('revoked_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error.message);
      throw error;
    }

    return data || null;
  }
};

export const getApiKeysByAccount = {
  all: async (accountId) => {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key, expires_at, created_at')
      .eq('account_id', accountId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    // Transform key to preview
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      key_preview: item.key.substring(0, 7) + '...',
      expires_at: item.expires_at,
      created_at: item.created_at
    }));
  }
};

export const revokeApiKey = {
  run: async (revokedAt, id, accountId) => {
    const { error } = await supabase
      .from('api_keys')
      .update({
        revoked_at: revokedAt
      })
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

// Usage tracking
export const recordUsage = {
  run: async (accountId, apiKeyId, endpoint, recordsGenerated, timestamp) => {
    const { error } = await supabase
      .from('usage_events')
      .insert({
        account_id: accountId,
        api_key_id: apiKeyId,
        endpoint,
        records_generated: recordsGenerated,
        timestamp
      });

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

export const getUserMonthlyUsage = {
  all: async (accountId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('usage_events')
      .select('timestamp, records_generated')
      .eq('account_id', accountId)
      .gte('timestamp', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    // Group by month and aggregate
    const grouped = {};
    (data || []).forEach(item => {
      const date = new Date(item.timestamp);
      const month = date.toISOString().substring(0, 7); // YYYY-MM

      if (!grouped[month]) {
        grouped[month] = { total_requests: 0, total_records: 0, month };
      }
      grouped[month].total_requests++;
      grouped[month].total_records += item.records_generated || 0;
    });

    return Object.values(grouped);
  }
};

// Audit logging
export const recordAudit = {
  run: async (accountId, action, resource, resourceId, ipAddress, userAgent, timestamp) => {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        account_id: accountId,
        action,
        resource,
        resource_id: resourceId,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp
      });

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

// Lead operations
export const insertLead = {
  run: async (name, email, organization, role, message, createdAt) => {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name,
        email,
        organization,
        role,
        message,
        created_at: createdAt
      })
      .select('id');

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    return { lastID: data[0].id };
  }
};

export const getAllLeads = {
  all: async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    return data || [];
  }
};

export const getLeadById = {
  get: async (id) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error.message);
      throw error;
    }

    return data || null;
  }
};

export const updateLeadStatus = {
  run: async (status, id) => {
    const { error } = await supabase
      .from('leads')
      .update({
        status
      })
      .eq('id', id);

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

export const getLeadsWithPagination = {
  all: async (limit, offset) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    return data || [];
  }
};

export const countAllLeads = {
  get: async () => {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    return { count };
  }
};

// Preview events
export const insertPreviewEvent = {
  run: async (province, conditionCategory, format, generatedAt) => {
    const { error } = await supabase
      .from('preview_events')
      .insert({
        province,
        condition_category: conditionCategory,
        format,
        generated_at: generatedAt
      });

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }
  }
};

export const getPreviewCount = {
  get: async () => {
    const { count, error } = await supabase
      .from('preview_events')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    return { count };
  }
};

export default { supabase };
