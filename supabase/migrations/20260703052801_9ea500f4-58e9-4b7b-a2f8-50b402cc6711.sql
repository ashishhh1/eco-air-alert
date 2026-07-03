
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  image_url TEXT,
  category TEXT NOT NULL,
  location_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence INTEGER NOT NULL DEFAULT 80,
  ai_message TEXT NOT NULL,
  description TEXT,
  wind_speed DOUBLE PRECISION,
  wind_deg DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Public insert reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update status" ON public.reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE INDEX reports_created_at_idx ON public.reports (created_at DESC);
