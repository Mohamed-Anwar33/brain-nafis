import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cyhssotgsllqaxrrhrsj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const PHYSICS_ID = '3662649d-72d5-4cec-b52a-5c291c5380c7';
const CHEMISTRY_ID = 'a349d300-6da8-4232-b932-3114f3440c9c';

async function move() {
  console.log('Attempting to move sections 1 and 2 to Chemistry...');
  
  // 1. Find the sections
  const { data: sections, error: sError } = await supabase
    .from('wheel_sections')
    .select('id, name')
    .in('name', ['1', '2'])
    .eq('domain_id', PHYSICS_ID);
    
  if (sError) {
    console.error('Error finding sections:', sError);
    return;
  }
  
  if (!sections || sections.length === 0) {
    console.log('No sections found named 1 or 2 in Physics.');
    return;
  }
  
  const sectionIds = sections.map(s => s.id);
  console.log('Found section IDs:', sectionIds);
  
  // 2. Update wheel_sections
  const { error: updateError } = await supabase
    .from('wheel_sections')
    .update({ domain_id: CHEMISTRY_ID })
    .in('id', sectionIds);
    
  if (updateError) {
    console.error('Error updating sections:', updateError);
    console.log('--- This likely means the anon key does not have update permissions. ---');
    return;
  }
  
  console.log('Updated wheel_sections successfully.');
  
  // 3. Update wheel_section_questions
  const { error: qUpdateError } = await supabase
    .from('wheel_section_questions')
    .update({ domain_id: CHEMISTRY_ID })
    .in('section_id', sectionIds);
    
  if (qUpdateError) {
    console.error('Error updating questions:', qUpdateError);
  } else {
    console.log('Updated wheel_section_questions successfully.');
  }
}

move();
