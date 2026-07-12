-- ==========================================
-- HOUSEPADI EXPLORE SPACES SCHEMA & MIGRATION
-- ==========================================

-- 1. Listing Type Registry Table
CREATE TABLE IF NOT EXISTS public.listing_type_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  contact_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  viewing_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Consumer Account Table
CREATE TABLE IF NOT EXISTS public.consumer_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  auth_token TEXT,
  otp_code TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Favorites Table (Polymorphic Association)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumer_account(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL,
  listing_type VARCHAR(100) NOT NULL, -- references listing_type_registry.slug (e.g. 'apartment', 'event_center', 'public_space')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_consumer_favorite UNIQUE(consumer_id, listing_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_favorites_consumer ON public.favorites(consumer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON public.favorites(listing_id, listing_type);

-- 4. Payment Transaction Table
CREATE TABLE IF NOT EXISTS public.payment_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference VARCHAR(255) UNIQUE NOT NULL,
  consumer_id UUID NOT NULL REFERENCES public.consumer_account(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL,
  listing_type VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESSFUL', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_consumer ON public.payment_transaction(consumer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transaction(paystack_reference);

-- 5. Seeding default spaces/listing types
INSERT INTO public.listing_type_registry (name, slug, contact_fee, viewing_fee)
VALUES 
  ('Apartment', 'apartment', 1500.00, 3000.00),
  ('Event Center', 'event_center', 5000.00, 10000.00),
  ('Public Space', 'public_space', 2000.00, 5000.00)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  contact_fee = EXCLUDED.contact_fee,
  viewing_fee = EXCLUDED.viewing_fee;

-- 6. Helper function to rebuild the unified listings view
CREATE OR REPLACE FUNCTION public.rebuild_unified_listings_view()
RETURNS VOID AS $$
DECLARE
  v_sql TEXT := '';
  v_rec RECORD;
BEGIN
  FOR v_rec IN SELECT slug FROM public.listing_type_registry LOOP
    IF v_sql <> '' THEN
      v_sql := v_sql || ' UNION ALL ';
    END IF;
    
    IF v_rec.slug = 'apartment' THEN
      v_sql := v_sql || '
        SELECT 
          id, name, price, address, state, thumbnail_path, model_url, 
          agent_id, agency_id, phone_number, status::text AS status, file_size, 
          listing_type::text AS listing_type, rent_interval::text AS rent_interval, 
          created_at, updated_at, ''apartment''::varchar(100) AS listing_type_slug,
          jsonb_build_object(
            ''land_size'', land_size,
            ''num_bedrooms'', num_bedrooms,
            ''num_bathrooms'', num_bathrooms,
            ''has_water'', has_water,
            ''other_features'', other_features
          ) AS features,
          COALESCE(favorite_count, 0) AS favorite_count,
          gallery
        FROM public.apartments';
    ELSIF v_rec.slug = 'event_center' THEN
      v_sql := v_sql || '
        SELECT 
          id, name, price, address, state, thumbnail_path, model_url, 
          agent_id, agency_id, phone_number, status::text AS status, file_size, 
          listing_type::text AS listing_type, rent_interval::text AS rent_interval, 
          created_at, updated_at, ''event_center''::varchar(100) AS listing_type_slug,
          jsonb_build_object(
            ''sitting_capacity'', sitting_capacity,
            ''parking_yard'', parking_yard,
            ''generator'', generator,
            ''security'', security,
            ''other_features'', other_features
          ) AS features,
          COALESCE(favorite_count, 0) AS favorite_count,
          gallery
        FROM public.event_centers';
    ELSIF v_rec.slug = 'public_space' THEN
      v_sql := v_sql || '
        SELECT 
          id, name, price, address, state, thumbnail_path, model_url, 
          agent_id, agency_id, phone_number, status::text AS status, file_size, 
          listing_type::text AS listing_type, rent_interval::text AS rent_interval, 
          created_at, updated_at, ''public_space''::varchar(100) AS listing_type_slug,
          jsonb_build_object(
            ''floor_area'', floor_area,
            ''power_supply'', power_supply,
            ''parking'', parking,
            ''internet'', internet,
            ''other_features'', other_features
          ) AS features,
          COALESCE(favorite_count, 0) AS favorite_count,
          gallery
        FROM public.public_space';
    ELSE
      -- Dynamically registered types have the unified column layout with a JSONB features column natively.
      v_sql := v_sql || '
        SELECT 
          id, name, price, address, state, thumbnail_path, model_url, 
          agent_id, agency_id, phone_number, status::text AS status, file_size, 
          listing_type::text AS listing_type, rent_interval::text AS rent_interval, 
          created_at, updated_at, ''' || v_rec.slug || '''::varchar(100) AS listing_type_slug,
          features,
          0 AS favorite_count,
          gallery
        FROM public.' || quote_ident(v_rec.slug);
    END IF;
  END LOOP;

  IF v_sql <> '' THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.unified_listings AS ' || v_sql;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Helper function to dynamically create a new space table
CREATE OR REPLACE FUNCTION public.create_dynamic_listing_table(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  -- Perform sanitization and dynamic table creation
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS public.%I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      price DECIMAL(15, 2) NOT NULL,
      address TEXT NOT NULL,
      state TEXT NOT NULL,
      thumbnail_path TEXT,
      model_url TEXT,
      agent_id UUID NOT NULL,
      agency_id UUID NOT NULL,
      phone_number TEXT,
      status VARCHAR(50) DEFAULT ''PENDING'',
      file_size BIGINT DEFAULT 0,
      listing_type VARCHAR(20) DEFAULT ''SALE'',
      rent_interval VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(''utc''::text, now()),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(''utc''::text, now()),
      features JSONB DEFAULT ''{}''::jsonb
    )
  ', p_slug);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebuild view to register initial view configuration
SELECT public.rebuild_unified_listings_view();
