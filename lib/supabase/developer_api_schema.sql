-- Migration for Developer API Platform with Pricing & Metering Layer

-- 1. Create billing_tiers table
CREATE TABLE IF NOT EXISTS public.billing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  base_monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  included_api_requests INTEGER NOT NULL DEFAULT 1000,
  included_embed_sessions INTEGER NOT NULL DEFAULT 100,
  overage_request_fee DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
  overage_embed_fee DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Seed default billing tiers
INSERT INTO public.billing_tiers (name, base_monthly_price, included_api_requests, included_embed_sessions, overage_request_fee, overage_embed_fee)
VALUES
  ('Free', 0.00, 1000, 100, 0.0500, 0.1000),
  ('Growth', 49.00, 10000, 1000, 0.0100, 0.0500),
  ('Scale', 199.00, 100000, 10000, 0.0020, 0.0100)
ON CONFLICT (name) DO UPDATE SET
  base_monthly_price = EXCLUDED.base_monthly_price,
  included_api_requests = EXCLUDED.included_api_requests,
  included_embed_sessions = EXCLUDED.included_embed_sessions,
  overage_request_fee = EXCLUDED.overage_request_fee,
  overage_embed_fee = EXCLUDED.overage_embed_fee;

-- 3. Alter api_keys table to include tier relations and usage counts
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.billing_tiers(id) ON DELETE SET NULL;

ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS paystack_subscription_id VARCHAR(255);

ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS current_period_requests_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS current_period_embeds_count INTEGER NOT NULL DEFAULT 0;

-- Set existing keys to Free tier if any
UPDATE public.api_keys 
SET tier_id = (SELECT id FROM public.billing_tiers WHERE name = 'Free') 
WHERE tier_id IS NULL;

-- 4. Create api_usage_logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('REST_API', 'EMBED_VIEW')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. RLS Policies
ALTER TABLE public.billing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Billing Tiers Policies
DROP POLICY IF EXISTS "Allow select for billing_tiers" ON public.billing_tiers;
CREATE POLICY "Allow select for billing_tiers" ON public.billing_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update for billing_tiers" ON public.billing_tiers;
CREATE POLICY "Allow update for billing_tiers" ON public.billing_tiers FOR UPDATE USING (true) WITH CHECK (true);

-- API Usage Logs Policies
DROP POLICY IF EXISTS "Allow select for api_usage_logs" ON public.api_usage_logs;
CREATE POLICY "Allow select for api_usage_logs" ON public.api_usage_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for api_usage_logs" ON public.api_usage_logs;
CREATE POLICY "Allow insert for api_usage_logs" ON public.api_usage_logs FOR INSERT WITH CHECK (true);

-- API Keys Policies
DROP POLICY IF EXISTS "Allow select for api_keys" ON public.api_keys;
CREATE POLICY "Allow select for api_keys" ON public.api_keys FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for api_keys" ON public.api_keys;
CREATE POLICY "Allow insert for api_keys" ON public.api_keys FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for api_keys" ON public.api_keys;
CREATE POLICY "Allow delete for api_keys" ON public.api_keys FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow update for api_keys" ON public.api_keys;
CREATE POLICY "Allow update for api_keys" ON public.api_keys FOR UPDATE USING (true) WITH CHECK (true);
