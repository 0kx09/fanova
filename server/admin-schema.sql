-- Admin System Schema
-- Run this in Supabase SQL Editor

-- Add admin columns to profiles table
DO $$
BEGIN
  -- Add is_admin column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add admin_role column (super_admin, admin, moderator)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'admin_role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN admin_role TEXT CHECK (admin_role IN ('super_admin', 'admin', 'moderator'));
  END IF;

  -- Add user status columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'banned_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN banned_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'locked_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN locked_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create admin_actions table for audit log
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('ban', 'unban', 'lock', 'unlock', 'delete_user', 'create_admin', 'update_user', 'view_user')),
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_role ON public.profiles(admin_role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_profiles_is_locked ON public.profiles(is_locked);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON public.admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);

-- Enable RLS on admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Admin actions policies (only admins can view)
CREATE POLICY "Admins can view admin actions"
  ON public.admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = TRUE
    )
  );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_admin = TRUE AND admin_role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
