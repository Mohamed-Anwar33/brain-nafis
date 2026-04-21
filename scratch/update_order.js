
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cyhssotgsllqaxrrhrsj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c"

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateOrder() {
  const gradeSubjectId = 'd5d10da4-4861-456d-a7a4-0b124e9a16d1'
  
  const updates = [
    { name: 'كيمياء', new_sort_order: 1 },
    { name: 'فيزياء', new_sort_order: 2 },
    { name: 'كهرباء', new_sort_order: 3 }
  ]

  console.log('Updating domains order...')

  for (const update of updates) {
    const { error } = await supabase
      .from('central_domains')
      .update({ sort_order: update.new_sort_order })
      .match({ name: update.name, grade_subject_id: gradeSubjectId })
    
    if (error) {
      console.error(`Error updating ${update.name}:`, error)
    } else {
      console.log(`Updated ${update.name} to sort_order ${update.new_sort_order}`)
    }
  }

  // Final check
  const { data, error } = await supabase
    .from('central_domains')
    .select('name, sort_order')
    .eq('grade_subject_id', gradeSubjectId)
    .order('sort_order', { ascending: true })
  
  if (error) console.error('Error fetching final order:', error)
  else console.table(data)
}

updateOrder()
