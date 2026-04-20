import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cyhssotgsllqaxrrhrsj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data: domains, error: err1 } = await supabase
    .from('domains')
    .select('id, name, grade_subject_id');
  
  if (err1) console.error(err1);
  else console.log('Domains:', JSON.stringify(domains, null, 2));

  const { data: qs, error: err2 } = await supabase
    .from('wheel_section_questions')
    .select('id, text, track_type, grade_subject_id, domain_id')
    .eq('track_type', 'central');

  if (err2) console.error(err2);
  else console.log('Questions:', JSON.stringify(qs, null, 2));

}

check();
