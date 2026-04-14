import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atkwdzfcixegrakmmotq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0a3dkemZjaXhlZ3Jha21tb3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mjk5ODQsImV4cCI6MjA5MDEwNTk4NH0.HpOdwMxEYsvGbXG-ZYTnjkm6GuSKJ2MkxbtKTox9LeY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  // Login as a TM
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tharindudh@lionbeer.com',
    password: 'password123' // assuming default password or we can just check policies
  });
  
  console.log("Auth:", authData?.user?.email, authError?.message);
  
  const { data, error } = await supabase.from('products').select('*');
  console.log("Products fetch:", data?.length, error);
}
test();
