-- Litters Table (Birth Events / Groups)
CREATE TABLE IF NOT EXISTS public.litters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE NOT NULL,
  
  -- Litter Info
  name TEXT NOT NULL, -- e.g. 'Litter #003'
  birth_date DATE,
  location TEXT, -- 'Home', 'Vet Clinic', etc.
  notes TEXT,
  
  -- Parents (shared context)
  mother_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  father_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  mother_name TEXT, -- fallback if no Pet ID
  father_name TEXT, -- fallback if no Pet ID
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_litters_home_id ON public.litters(home_id);
CREATE INDEX IF NOT EXISTS idx_litters_created_by ON public.litters(created_by);

-- RLS
ALTER TABLE public.litters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view litters" ON public.litters
  FOR SELECT USING (
    home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
    OR home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
  );

CREATE POLICY "Members create litters" ON public.litters
  FOR INSERT WITH CHECK (
    home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
    OR home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
  );

CREATE POLICY "Members update litters" ON public.litters
  FOR UPDATE USING (
    home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
    OR home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
  );

-- Add litter_id and parent fields to pets
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS litter_id UUID REFERENCES public.litters(id) ON DELETE SET NULL;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS mother_id UUID REFERENCES public.pets(id) ON DELETE SET NULL;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS father_id UUID REFERENCES public.pets(id) ON DELETE SET NULL;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS birth_weight NUMERIC;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS birth_time TIME;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS special_traits TEXT[];
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS pet_code TEXT; -- e.g. PET-0003

-- Auto-generate pet_code trigger
CREATE OR REPLACE FUNCTION public.generate_pet_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pet_code IS NULL THEN
    NEW.pet_code := 'PET-' || LPAD(
      (SELECT COUNT(*) + 1 FROM public.pets WHERE home_id = NEW.home_id)::TEXT,
      4, '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pet_created ON public.pets;
CREATE TRIGGER on_pet_created
  BEFORE INSERT ON public.pets
  FOR EACH ROW EXECUTE PROCEDURE public.generate_pet_code();

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_pets_litter_id ON public.pets(litter_id);
CREATE INDEX IF NOT EXISTS idx_pets_mother_id ON public.pets(mother_id);
CREATE INDEX IF NOT EXISTS idx_pets_father_id ON public.pets(father_id);
