-- =============================================
-- AI COPYWRITING SYSTEM TABLES
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brand profiles table
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  
  -- Business basics
  business_name TEXT NOT NULL,
  industry TEXT,
  what_you_sell TEXT,
  target_customer TEXT,
  
  -- Voice analysis (AI-generated from samples)
  voice_profile JSONB, -- {tone_scores, signature_phrases, style_summary}
  voice_samples TEXT[], -- Array of copy examples they provided
  transcript_samples TEXT[], -- Array of transcripts they provided
  
  -- Voice of Customer data
  customer_reviews TEXT[], -- Array of pasted reviews/testimonials
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products and offers library
CREATE TABLE IF NOT EXISTS user_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'course', 'coaching', 'membership', 'service', 'affiliate'
  price DECIMAL(10,2),
  affiliate_link TEXT, -- Only for affiliates
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OpenAI API keys (encrypted)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  
  encrypted_key TEXT NOT NULL, -- Encrypted OpenAI key
  key_status TEXT DEFAULT 'untested', -- 'untested', 'valid', 'invalid'
  last_tested TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated copy history
CREATE TABLE IF NOT EXISTS ai_copy_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  content_type TEXT NOT NULL, -- 'welcome_email', 'sales_page', etc
  prompt_context JSONB, -- What they asked for
  generated_copy TEXT NOT NULL,
  
  -- Learning system
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 10),
  feedback_text TEXT,
  feedback_tags TEXT[],
  user_edited_version TEXT,
  
  -- Metadata
  product_promoted UUID REFERENCES user_products(id) ON DELETE SET NULL,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt refinement tracking (learning system)
CREATE TABLE IF NOT EXISTS prompt_refinements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  content_type TEXT NOT NULL,
  
  tone_adjustments JSONB DEFAULT '{}',
  learned_preferences JSONB DEFAULT '{}',
  avg_rating DECIMAL(3,2),
  total_generations INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, content_type)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_copy_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_refinements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_profiles
CREATE POLICY "Users can view own brand profile"
  ON brand_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand profile"
  ON brand_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand profile"
  ON brand_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand profile"
  ON brand_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_products
CREATE POLICY "Users can view own products"
  ON user_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON user_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON user_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON user_products FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_api_keys
CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON user_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON user_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_copy_generations
CREATE POLICY "Users can view own generations"
  ON ai_copy_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON ai_copy_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations"
  ON ai_copy_generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations"
  ON ai_copy_generations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for prompt_refinements
CREATE POLICY "Users can view own refinements"
  ON prompt_refinements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refinements"
  ON prompt_refinements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own refinements"
  ON prompt_refinements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own refinements"
  ON prompt_refinements FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_brand_profiles_user ON brand_profiles(user_id);
CREATE INDEX idx_user_products_user ON user_products(user_id);
CREATE INDEX idx_ai_generations_user_created ON ai_copy_generations(user_id, created_at DESC);
CREATE INDEX idx_ai_generations_rating ON ai_copy_generations(user_id, user_rating) WHERE user_rating IS NOT NULL;
CREATE INDEX idx_prompt_refinements_user_type ON prompt_refinements(user_id, content_type);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER update_brand_profiles_updated_at
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompt_refinements_updated_at
  BEFORE UPDATE ON prompt_refinements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();