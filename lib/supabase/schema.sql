-- HousePadi Database Schema

-- Custom Types
CREATE TYPE user_role AS ENUM ('super_admin', 'agency', 'agent');
CREATE TYPE property_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'unavailable');
CREATE TYPE media_type AS ENUM ('image', 'fbx', 'obj', 'glb', 'gltf', 'usdz');

-- Subscription Tiers
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  max_listings INTEGER NOT NULL DEFAULT 10,
  max_images_per_listing INTEGER NOT NULL DEFAULT 5,
  max_upload_size_mb INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Organizations (Agencies)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  subscription_tier_id UUID REFERENCES subscription_tiers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Users (Extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'agent',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Properties (Listings)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2) NOT NULL,
  land_size DECIMAL(10, 2), -- in sq meters/ft
  bathrooms INTEGER,
  has_light BOOLEAN DEFAULT FALSE,
  has_water BOOLEAN DEFAULT FALSE,
  has_parking_lot BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  status property_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Property Media (3D models and images)
CREATE TABLE IF NOT EXISTS property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type media_type NOT NULL,
  file_size INTEGER, -- in bytes
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Inquiries (Demo Requests)
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies Setup
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Super Admin Policy (Can do everything)
-- We will use a function to check if a user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Organizations RLS
CREATE POLICY "Public can view active organizations" ON organizations FOR SELECT USING (status = 'active');
CREATE POLICY "Super admins can manage organizations" ON organizations USING (is_super_admin());

-- Users RLS
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can manage users" ON users USING (is_super_admin());
CREATE POLICY "Agencies can view their agents" ON users FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'agency')
);

-- Properties RLS
CREATE POLICY "Public can view approved properties" ON properties FOR SELECT USING (status = 'approved' AND is_available = true);
CREATE POLICY "Super admins can manage all properties" ON properties USING (is_super_admin());
CREATE POLICY "Agencies and agents can manage their organization properties" ON properties 
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Property Media RLS
CREATE POLICY "Public can view approved property media" ON property_media FOR SELECT USING (
  property_id IN (SELECT id FROM properties WHERE status = 'approved' AND is_available = true)
);
CREATE POLICY "Super admins can manage all media" ON property_media USING (is_super_admin());
CREATE POLICY "Agencies and agents can manage their property media" ON property_media
  USING (property_id IN (SELECT id FROM properties WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())));

-- Inquiries RLS
CREATE POLICY "Super admins can view all inquiries" ON inquiries FOR SELECT USING (is_super_admin());
CREATE POLICY "Agents can view their own inquiries" ON inquiries FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Agencies can view their org inquiries" ON inquiries FOR SELECT USING (
  agent_id IN (SELECT id FROM users WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
);
CREATE POLICY "Public can insert inquiries" ON inquiries FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_properties_agent ON properties(agent_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_media_property ON property_media(property_id);
CREATE INDEX idx_inquiries_property ON inquiries(property_id);
CREATE INDEX idx_inquiries_agent ON inquiries(agent_id);
