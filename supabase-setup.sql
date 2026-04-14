-- Create the outlets table
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  im_code TEXT,
  outlet_name TEXT,
  channel TEXT,
  market TEXT,
  field_role TEXT,
  tm_code TEXT,
  tm_name TEXT,
  tm_email TEXT
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin'
);

-- Create products table for dropdowns
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  main_brand TEXT,
  sub_brand TEXT
);

-- Create stock_sheet table (Replaces stock_entries)
CREATE TABLE IF NOT EXISTS stock_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES outlets(id),
  category TEXT,
  main_brand TEXT,
  sub_brand TEXT,
  stock INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market_stock_requests table
CREATE TABLE IF NOT EXISTS market_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tm_email TEXT,
  tm_name TEXT,
  market TEXT,
  product_id UUID REFERENCES products(id),
  sub_brand TEXT,
  quantity INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure 'market' column exists if the table was created previously without it
ALTER TABLE market_stock_requests ADD COLUMN IF NOT EXISTS market TEXT;

-- Reload PostgREST schema cache to fix PGRST204 errors
NOTIFY pgrst, 'reload schema';

-- For this prototype using anon key and application-level filtering, we can allow anon read access:
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access for prototype outlets" ON outlets FOR SELECT TO anon USING (true);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access for prototype admins" ON admins FOR SELECT TO anon USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access for prototype products" ON products FOR SELECT TO anon USING (true);

ALTER TABLE stock_sheet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access for prototype stock_sheet" ON stock_sheet FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert access for prototype stock_sheet" ON stock_sheet FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update access for prototype stock_sheet" ON stock_sheet FOR UPDATE TO anon USING (true);

ALTER TABLE market_stock_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access for prototype market_stock_requests" ON market_stock_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert access for prototype market_stock_requests" ON market_stock_requests FOR INSERT TO anon WITH CHECK (true);

-- Dummy Data for Admins
-- INSERT INTO admins (email, name) VALUES ('admin@stockmaster.com', 'Super Admin');

-- Dummy Data for Products
-- INSERT INTO products (category, main_brand, sub_brand) VALUES
-- ('Spirits', 'Premium Spirits Co.', 'Aged Highland Single Malt'),
-- ('Spirits', 'Premium Spirits Co.', 'Classic Vodka'),
-- ('Wine', 'Vineyard Estates', 'Cabernet Sauvignon'),
-- ('Wine', 'Vineyard Estates', 'Chardonnay'),
-- ('Beer', 'Craft Brewers', 'IPA'),
-- ('Beer', 'Craft Brewers', 'Stout');

-- Dummy Data for stock_sheet (assuming outlets exist)
-- INSERT INTO stock_sheet (outlet_id, category, main_brand, sub_brand, stock)
-- SELECT id, 'Spirits', 'Premium Spirits Co.', 'Aged Highland Single Malt', floor(random() * 50 + 1)::int
-- FROM outlets;

-- You can insert some dummy data here to test:
-- INSERT INTO outlets (im_code, outlet_name, channel, market, field_role, tm_code, tm_name, tm_email)
-- VALUES 
-- ('IM001', 'Luxury Boutique Paris', 'Retail', 'Europe', 'TM', 'TM01', 'Robert Fox', 'robert@example.com'),
-- ('IM002', 'High-End Store London', 'Retail', 'Europe', 'TM', 'TM01', 'Robert Fox', 'robert@example.com'),
-- ('IM003', 'Premium Outlet NY', 'Wholesale', 'North America', 'TM', 'TM02', 'Jane Cooper', 'jane@example.com'),
-- ('IM004', 'Downtown Metro Hub', 'Retail', 'Asia', 'TM', 'TM03', 'Rumeshan', 'rumeshanjanard@gmail.com'),
-- ('IM005', 'City Center Mall', 'Wholesale', 'Asia', 'TM', 'TM03', 'Rumeshan', 'rumeshanjanard@gmail.com');
