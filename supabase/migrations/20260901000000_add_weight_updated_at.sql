-- Add missing columns to pets table
-- weight: for tracking pet weight
-- updated_at: for tracking last update time

-- Add weight column
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2);

-- Add updated_at column with default
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to pets table
DROP TRIGGER IF EXISTS update_pets_updated_at ON public.pets;
CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Add same columns to life_journey_events for consistency
ALTER TABLE public.life_journey_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.life_journey_events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.life_journey_events
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
