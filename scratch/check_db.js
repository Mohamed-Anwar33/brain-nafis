import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cyhssotgsllqaxrrhrsj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  try {
    const { data: sections } = await supabase.from('wheel_sections').select('id, name, domain_id');
    console.log('Sections:', JSON.stringify(sections));
  } catch (e) {
    console.error('Catch Error:', e);
  }
}

check();
