import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atkwdzfcixegrakmmotq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0a3dkemZjaXhlZ3Jha21tb3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mjk5ODQsImV4cCI6MjA5MDEwNTk4NH0.HpOdwMxEYsvGbXG-ZYTnjkm6GuSKJ2MkxbtKTox9LeY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error, count } = await supabase.from('products').select('*', { count: 'exact' });
  console.log("Total products:", count);
  console.log("Data length:", data?.length);
}
test();
