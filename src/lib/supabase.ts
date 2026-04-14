import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atkwdzfcixegrakmmotq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0a3dkemZjaXhlZ3Jha21tb3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mjk5ODQsImV4cCI6MjA5MDEwNTk4NH0.HpOdwMxEYsvGbXG-ZYTnjkm6GuSKJ2MkxbtKTox9LeY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Outlet {
  id: string;
  im_code: string;
  outlet_name: string;
  channel: string;
  market: string;
  field_role: string;
  tm_code: string;
  tm_name: string;
  tm_email: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface StockSheet {
  id: string;
  outlet_id: string;
  product_id?: string;
  user_email?: string;
  category: string;
  main_brand: string;
  sub_brand: string;
  stock_count: number;
  previous_stock?: number;
  sales_qty?: number;
  updated_at: string;
}

export interface Product {
  id: string;
  category: string;
  main_brand: string;
  sub_brand: string;
}
