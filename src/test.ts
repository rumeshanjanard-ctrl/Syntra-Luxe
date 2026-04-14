import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://atkwdzfcixegrakmmotq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0a3dkemZjaXhlZ3Jha21tb3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mjk5ODQsImV4cCI6MjA5MDEwNTk4NH0.HpOdwMxEYsvGbXG-ZYTnjkm6GuSKJ2MkxbtKTox9LeY');
async function run() {
  const { data, error } = await supabase.from('stock_entries').select('*').limit(1);
  console.log(data);
}
run();
