import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atkwdzfcixegrakmmotq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0a3dkemZjaXhlZ3Jha21tb3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mjk5ODQsImV4cCI6MjA5MDEwNTk4NH0.HpOdwMxEYsvGbXG-ZYTnjkm6GuSKJ2MkxbtKTox9LeY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('products').select('category, main_brand, sub_brand');
  const diageo = data.filter(d => d.category?.includes('Diageo'));
  const wines = data.filter(d => d.category?.includes('Wines'));
  console.log("Diageo count:", diageo.length);
  console.log("Wines count:", wines.length);
  if(diageo.length > 0) console.log("Sample Diageo:", diageo[0]);
  if(wines.length > 0) console.log("Sample Wines:", wines[0]);
  
  const allCategories = [...new Set(data.map(d => d.category))];
  console.log("All exact categories:", allCategories.map(c => `"${c}"`));
}
test();
