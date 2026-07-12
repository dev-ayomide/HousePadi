-- HousePadi CMS & Platform Architecture
-- Run this in the Supabase SQL Editor

-- 1. ENUMS (If not already created)
-- Note: 'MODERATOR' is used instead of 'SUPER_ADMIN' based on previous updates.
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('MODERATOR', 'AGENCY', 'AGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE property_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNAVAILABLE', 'DRAFT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TESTIMONIALS CMS
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT,
    testimonial_text TEXT NOT NULL,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRICING TIERS CMS (Replacing old pricing_plans if needed)
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    monthly_price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb, -- Array of strings
    button_text TEXT DEFAULT 'Get Started',
    is_featured BOOLEAN DEFAULT false,
    listing_limit INTEGER NOT NULL DEFAULT 10,
    storage_limit_gb INTEGER NOT NULL DEFAULT 5,
    allowed_formats JSONB DEFAULT '["image", "video", "fbx", "glb"]'::jsonb,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ABOUT PAGE CMS
CREATE TABLE IF NOT EXISTS public.about_page_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT UNIQUE NOT NULL, -- e.g., 'hero', 'mission', 'story'
    title TEXT,
    description TEXT,
    content_body TEXT,
    image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default rows for About page
INSERT INTO public.about_page_content (section_key, title) 
VALUES 
  ('hero', 'Architecting the Future of Virtual Real Estate'),
  ('mission', 'Our Mission'),
  ('story', 'The HousePadi Story')
ON CONFLICT (section_key) DO NOTHING;

-- 5. MODERATOR PROFILE
CREATE TABLE IF NOT EXISTS public.moderator_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    position TEXT DEFAULT 'Platform Moderator',
    about_me TEXT,
    profile_image_url TEXT,
    is_public BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PLATFORM ANALYTICS (Materialized View or Aggregate Table)
-- For a CMS dashboard, sometimes caching daily stats is better than counting live.
CREATE TABLE IF NOT EXISTS public.daily_platform_stats (
    date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    total_agencies INTEGER DEFAULT 0,
    total_agents INTEGER DEFAULT 0,
    total_uploads INTEGER DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    total_storage_used_mb INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ENABLE RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_profiles ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES
-- Create a function to check for MODERATOR role if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'MODERATOR'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public can read active CMS content
CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public read pricing" ON public.subscription_tiers FOR SELECT USING (is_active = true);
CREATE POLICY "Public read about page" ON public.about_page_content FOR SELECT USING (true);
CREATE POLICY "Public read moderator profile" ON public.moderator_profiles FOR SELECT USING (is_public = true);

-- Moderators have ALL access to CMS content
CREATE POLICY "Moderator full access testimonials" ON public.testimonials USING (public.is_moderator());
CREATE POLICY "Moderator full access pricing" ON public.subscription_tiers USING (public.is_moderator());
CREATE POLICY "Moderator full access about page" ON public.about_page_content USING (public.is_moderator());
CREATE POLICY "Moderator full access moderator profile" ON public.moderator_profiles USING (public.is_moderator());
