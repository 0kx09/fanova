-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add credits column to existing profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 10;
    UPDATE public.profiles SET credits = 10 WHERE credits IS NULL;
  END IF;
END $$;

-- Create models table
CREATE TABLE IF NOT EXISTS public.models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Basic Information
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 18),
  height NUMERIC,
  weight NUMERIC,
  nationality TEXT,
  occupation TEXT,

  -- Attributes (stored as JSONB for flexibility)
  attributes JSONB DEFAULT '{}'::jsonb,

  -- Facial Features
  facial_features JSONB DEFAULT '{}'::jsonb,

  -- Generation Settings
  generation_method TEXT CHECK (generation_method IN ('upload', 'describe')),

  -- Generated Prompt
  full_prompt TEXT,

  -- Selected Image URL (the one user chose)
  selected_image_url TEXT,

  -- Metadata
  generation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_images table
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reference_images table (for upload method)
CREATE TABLE IF NOT EXISTS public.reference_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Models policies
CREATE POLICY "Users can view own models"
  ON public.models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own models"
  ON public.models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON public.models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON public.models FOR DELETE
  USING (auth.uid() = user_id);

-- Generated images policies
CREATE POLICY "Users can view own generated images"
  ON public.generated_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = generated_images.model_id
      AND models.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own generated images"
  ON public.generated_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = generated_images.model_id
      AND models.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own generated images"
  ON public.generated_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = generated_images.model_id
      AND models.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own generated images"
  ON public.generated_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = generated_images.model_id
      AND models.user_id = auth.uid()
    )
  );

-- Reference images policies
CREATE POLICY "Users can view own reference images"
  ON public.reference_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = reference_images.model_id
      AND models.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own reference images"
  ON public.reference_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = reference_images.model_id
      AND models.user_id = auth.uid()
    )
  );

-- Functions and Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits)
  VALUES (NEW.id, NEW.email, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_models_user_id ON public.models(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_model_id ON public.generated_images(model_id);
CREATE INDEX IF NOT EXISTS idx_reference_images_model_id ON public.reference_images(model_id);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON public.models(created_at DESC);
