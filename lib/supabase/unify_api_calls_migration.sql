-- Database migration to unify API Requests and Embed Sessions into a single "Calls" metric

-- 1. Alter billing_tiers table
ALTER TABLE public.billing_tiers ADD COLUMN IF NOT EXISTS included_calls INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE public.billing_tiers ADD COLUMN IF NOT EXISTS overage_call_fee DECIMAL(10, 4) NOT NULL DEFAULT 0.00;

-- Copy existing data (mapping requests to calls)
UPDATE public.billing_tiers 
SET 
  included_calls = included_api_requests, 
  overage_call_fee = overage_request_fee;

-- Drop obsolete columns from billing_tiers
ALTER TABLE public.billing_tiers DROP COLUMN IF EXISTS included_api_requests;
ALTER TABLE public.billing_tiers DROP COLUMN IF EXISTS included_embed_sessions;
ALTER TABLE public.billing_tiers DROP COLUMN IF EXISTS overage_request_fee;
ALTER TABLE public.billing_tiers DROP COLUMN IF EXISTS overage_embed_fee;


-- 2. Alter api_keys table
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS current_period_calls_count INTEGER NOT NULL DEFAULT 0;

-- Copy and sum existing counts
UPDATE public.api_keys 
SET 
  current_period_calls_count = COALESCE(current_period_requests_count, 0) + COALESCE(current_period_embeds_count, 0);

-- Drop obsolete columns from api_keys
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS current_period_requests_count;
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS current_period_embeds_count;


-- 3. Update api_usage_logs type constraint
ALTER TABLE public.api_usage_logs DROP CONSTRAINT IF EXISTS api_usage_logs_type_check;
ALTER TABLE public.api_usage_logs ADD CONSTRAINT api_usage_logs_type_check CHECK (type IN ('REST_API', 'EMBED_VIEW', 'EMBED_CALL'));
