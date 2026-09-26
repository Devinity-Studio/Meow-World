-- QR Tokens Table
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Pet Info
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  
  -- Sender
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Context
  context TEXT NOT NULL CHECK (context IN ('sharing', 'vet', 'family', 'adoption')),
  message TEXT,
  
  -- Status
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMPTZ,
  
  -- Expiry (optional)
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_qr_tokens_pet_id ON public.qr_tokens(pet_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_sender_id ON public.qr_tokens(sender_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_is_used ON public.qr_tokens(is_used);

-- RLS Policies
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

-- Sender can view their own tokens
CREATE POLICY "Sender views own tokens" ON public.qr_tokens
  FOR SELECT USING (sender_id = auth.uid());

-- Anyone can view tokens (for adoption flow)
CREATE POLICY "Anyone can view tokens" ON public.qr_tokens
  FOR SELECT USING (true);

-- Sender can create tokens
CREATE POLICY "Sender creates tokens" ON public.qr_tokens
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Sender can update their own tokens
CREATE POLICY "Sender updates own tokens" ON public.qr_tokens
  FOR UPDATE USING (sender_id = auth.uid());

-- Anyone can mark token as used (for adoption flow)
CREATE POLICY "Anyone can use tokens" ON public.qr_tokens
  FOR UPDATE USING (true);
