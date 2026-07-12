-- API Documentation Schema

CREATE TABLE IF NOT EXISTS public.api_documentation (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    section_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for API Documentation
ALTER TABLE public.api_documentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to published api docs"
    ON public.api_documentation FOR SELECT
    USING (is_published = true);

CREATE POLICY "Allow moderators full access to api docs"
    ON public.api_documentation
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'MODERATOR'
        )
    );

-- Initial Content
INSERT INTO public.api_documentation (title, content, section_order, is_published)
VALUES 
(
  'Introduction & Overview',
  'Welcome to the HousePadi API Documentation. 

The HousePadi Developer API provides secure, programmatic access to query and retrieve public data from our immersive real estate platform. 

### Primary Capabilities
- **Read-Only Access:** The API is currently designed for read-only interactions. It allows developers to securely fetch data regarding property listings (apartments, event centers, public spaces), active vendor profiles, and basic platform configurations.
- **Data Integration:** Agencies and partners can use these endpoints to display real-time HousePadi properties on their own websites or internal dashboards.
- **RESTful Architecture:** All endpoints follow standard REST conventions and return responses in structured JSON format.',
  1,
  true
),
(
  'Authentication & API Keys',
  'To interact with the HousePadi API, you must authenticate your requests using a valid API key.

### Generating an API Key
1. Log in to the HousePadi Developer Portal.
2. Navigate to your Developer Settings.
3. Generate a new API key. Keep this key secure and do not expose it in client-side code.

### Making Authenticated Requests
All requests must include your API key in the Authorization header:
```http
Authorization: Bearer YOUR_API_KEY
```

If an API key is missing, invalid, or revoked, the API will return a `401 Unauthorized` or `403 Forbidden` response.',
  2,
  true
);
