-- Moderator Messaging System Schema

CREATE TABLE IF NOT EXISTS public.moderator_broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT', 'CRITICAL')),
    broadcast_type TEXT NOT NULL CHECK (broadcast_type IN ('SYSTEM', 'EMAIL')),
    recipient_group TEXT NOT NULL CHECK (recipient_group IN ('AGENCIES', 'AGENTS', 'CLIENTS', 'MODERATORS', 'ALL')),
    moderator_id UUID,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    broadcast_id UUID REFERENCES public.moderator_broadcasts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Flexible ID to link to agencies, agents, or clients
    user_role TEXT NOT NULL, -- 'AGENCY', 'AGENT', 'CLIENT'
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT DEFAULT 'NORMAL',
    is_read BOOLEAN DEFAULT FALSE,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sys_notif_user ON public.system_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_sys_notif_expiry ON public.system_notifications(expiry_date);

CREATE TABLE IF NOT EXISTS public.email_broadcast_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    broadcast_id UUID REFERENCES public.moderator_broadcasts(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    delivery_status TEXT DEFAULT 'PENDING' CHECK (delivery_status IN ('PENDING', 'DELIVERED', 'FAILED')),
    failure_reason TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_broadcast ON public.email_broadcast_logs(broadcast_id);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('SYSTEM', 'EMAIL', 'SMS', 'PUSH')),
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel)
);

-- RLS Policies
ALTER TABLE public.moderator_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Allow reading own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.system_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow updating own notifications (e.g. marking as read)
CREATE POLICY "Users can update their own notifications"
    ON public.system_notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow admin full access (Assume service_role key bypasses RLS)
