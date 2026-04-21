
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cyhssotgsllqaxrrhrsj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c"

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWheelSections() {
  console.log('--- wheel_sections ---')
  const { data, error } = await supabase
    .from('wheel_sections')
    .select('*')
    .order('created_at', { ascending: true })
  
  if (error) console.error(error)
  else console.table(data.map(s => ({id: s.id, name: s.name, is_active: s.is_active})))
}

checkWheelSections()
