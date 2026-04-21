
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cyhssotgsllqaxrrhrsj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c"

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('--- central_domains ---')
  const { data: domains, error: domainError } = await supabase
    .from('central_domains')
    .select('*')
    .order('sort_order', { ascending: true })
  
  if (domainError) console.error(domainError)
  else console.table(domains.map(d => ({id: d.id, name: d.name, sort_order: d.sort_order})))

  console.log('\n--- study_subjects ---')
  const { data: subjects, error: subjectError } = await supabase
    .from('study_subjects')
    .select('*')
    .order('sort_order', { ascending: true })
  
  if (subjectError) console.error(subjectError)
  else console.table(subjects.map(s => ({id: s.id, name: s.name, sort_order: s.sort_order})))
}

checkData()
