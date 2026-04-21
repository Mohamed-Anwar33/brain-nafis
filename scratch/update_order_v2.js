
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cyhssotgsllqaxrrhrsj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c"

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateOrder() {
  const updates = [
    { id: '3e56683f-4228-4efc-8d18-36c1e55e81d7', name: 'كيمياء', sort_order: 1 },
    { id: '70932145-ab2d-4f7f-8566-3d2b27484d85', name: 'فيزياء', sort_order: 2 },
    { id: '5df40ccd-1ea8-484c-bf53-b984e0f0a915', name: 'كهرباء', sort_order: 3 }
  ]

  console.log('Updating domains order by ID...')

  for (const update of updates) {
    const { data, error } = await supabase
      .from('central_domains')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)
      .select()
    
    if (error) {
      console.error(`Error updating ${update.name}:`, error)
    } else {
      console.log(`Updated ${update.name} (ID: ${update.id}) to sort_order ${update.sort_order}. Result rows: ${data.length}`)
    }
  }

  // Final check
  const { data, error } = await supabase
    .from('central_domains')
    .select('name, sort_order')
    .in('id', updates.map(u => u.id))
    .order('sort_order', { ascending: true })
  
  if (error) console.error('Error fetching final order:', error)
  else console.table(data)
}

updateOrder()
