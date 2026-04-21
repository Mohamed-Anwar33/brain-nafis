
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cyhssotgsllqaxrrhrsj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c"

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDuplicates() {
  const names = ['كيمياء', 'فيزياء', 'كهرباء']
  const { data, error } = await supabase.from('central_domains').select('*').in('name', names)
  
  if (error) {
    console.error(error)
    return
  }

  console.log(`Found ${data.length} records.`)
  console.table(data.map(d => ({id: d.id, name: d.name, grade_subject_id: d.grade_subject_id, sort_order: d.sort_order})))
}

checkDuplicates()
