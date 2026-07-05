-- Pollution Guardian AI — Supabase schema
-- Run this in the Supabase SQL editor before starting the backend.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'citizen', -- 'citizen' | 'official'
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  image_url text,
  category text not null,          -- smoke | dust | fire | factory_emission | construction
  description text,
  lat double precision not null,
  lng double precision not null,
  location_name text,
  detected_type text,
  confidence numeric,
  severity text,                   -- Low | Medium | High
  ai_message text,
  status text not null default 'pending_analysis', -- pending_analysis | analyzed | resolved
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists landmarks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,  -- school | hospital | residential
  lat double precision not null,
  lng double precision not null
);

create table if not exists weather_cache (
  id uuid primary key default gen_random_uuid(),
  lat text not null,
  lng text not null,
  aqi numeric,
  wind_speed numeric,
  wind_direction numeric,
  fetched_at timestamptz not null default now()
);

-- Seed a few demo landmarks so alert messages have something to reference.
-- Replace lat/lng with real coordinates for your demo city.
insert into landmarks (name, type, lat, lng) values
  ('Green Valley School', 'school', 17.7231, 83.3013),
  ('City General Hospital', 'hospital', 17.7180, 83.3050),
  ('Riverside Residential Colony', 'residential', 17.7260, 83.2990);

-- Seed a few demo reports so the heatmap looks populated on first load.
insert into reports (category, lat, lng, location_name, detected_type, confidence, severity, ai_message, status) values
  ('smoke', 17.7235, 83.3020, 'XYZ Road', 'smoke', 0.87, 'High', 'Possible garbage burning near XYZ Road. Smoke likely to affect schools near Green Valley School (~0.4 km away) within 2 hour(s).', 'analyzed'),
  ('dust', 17.7195, 83.3040, 'MG Road Construction Site', 'dust', 0.74, 'Medium', 'Possible dust from nearby construction or unpaved roads near MG Road. Dust pollution may spread to surrounding areas within 1.5 hour(s).', 'analyzed'),
  ('factory_emission', 17.7150, 83.3070, 'Industrial Belt', 'factory_emission', 0.85, 'High', 'Possible industrial emissions near Industrial Belt. Factory emissions likely to affect hospitals near City General Hospital (~1.1 km away) within 1 hour(s).', 'analyzed');
