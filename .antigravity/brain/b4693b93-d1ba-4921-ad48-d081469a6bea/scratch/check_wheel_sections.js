import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cyhssotgsllqaxrrhrsj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('wheel_sections')
    .select('id, name, is_active, track_type, grade_subject_id, domain_id');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Wheel Sections:', JSON.stringify(data, null, 2));
  }
}

check();
