import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'users' });
  console.log('RPC Error:', error);
  
  // Alternative: just try to select a fake column
  const { error: err2 } = await supabase.from('users').select('phone').limit(1);
  console.log('Select phone error:', err2);
}

checkColumns();
