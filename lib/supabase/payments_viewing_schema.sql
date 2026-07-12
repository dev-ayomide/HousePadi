-- Migration to add viewing_requests and payment_type to payment_transaction

-- 1. Alter payment_transaction to add payment_type column
ALTER TABLE public.payment_transaction 
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) NOT NULL DEFAULT 'CONTACT' 
CHECK (payment_type IN ('CONTACT', 'VIEWING'));

-- 2. Create viewing_requests table
CREATE TABLE IF NOT EXISTS public.viewing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumer_account(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL,
  listing_type VARCHAR(100) NOT NULL,
  requested_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'RESCHEDULED')),
  payment_reference VARCHAR(255) UNIQUE REFERENCES public.payment_transaction(paystack_reference) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_viewing_requests_consumer ON public.viewing_requests(consumer_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_listing ON public.viewing_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_reference ON public.viewing_requests(payment_reference);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Allow select for viewing_requests" ON public.viewing_requests;
CREATE POLICY "Allow select for viewing_requests" ON public.viewing_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for viewing_requests" ON public.viewing_requests;
CREATE POLICY "Allow insert for viewing_requests" ON public.viewing_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for viewing_requests" ON public.viewing_requests;
CREATE POLICY "Allow update for viewing_requests" ON public.viewing_requests FOR UPDATE USING (true) WITH CHECK (true);
