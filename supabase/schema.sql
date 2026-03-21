-- If The Shoe Fits — Scan Records Schema
-- Run this in Supabase Dashboard -> SQL Editor -> New Query

CREATE TABLE scans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,

  -- Contact info (LEAD-01)
  first_name      text NOT NULL,
  email           text NOT NULL,
  phone           text,
  current_shoe_size text,

  -- Left foot measurements
  left_length_mm  numeric,
  left_width_mm   numeric,
  left_arch_mm    numeric,
  left_toe_box_mm numeric,
  left_heel_mm    numeric,

  -- Right foot measurements
  right_length_mm numeric,
  right_width_mm  numeric,
  right_arch_mm   numeric,
  right_toe_box_mm numeric,
  right_heel_mm   numeric,

  -- STL reference (3DM-05)
  stl_path        text,

  -- Order status (MFR-04)
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'in-progress', 'completed', 'shipped'))
);

-- Enable Row Level Security
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Public INSERT: anonymous users can submit lead forms
CREATE POLICY "Public lead insert"
ON scans FOR INSERT
TO anon
WITH CHECK (true);

-- Authenticated SELECT: admins see all scans
CREATE POLICY "Admins view all scans"
ON scans FOR SELECT
TO authenticated
USING (true);

-- Authenticated UPDATE: admins can update order status
CREATE POLICY "Admins update order status"
ON scans FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
