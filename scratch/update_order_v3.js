
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cyhssotgsllqaxrrhrsj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c"

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateOrder() {
  console.log('Fetching domains to verify their existence and current status...')
  const { data: domains, error: fetchError } = await supabase
    .from('central_domains')
    .select('*')
  
  if (fetchError) {
    console.error('Fetch error:', fetchError)
    return
  }

  console.log(`Found ${domains.length} domains.`)
  
  const targetOrder = ['كيمياء', 'فيزياء', 'كهرباء']
  
  for (let i = 0; i < targetOrder.length; i++) {
    const name = targetOrder[i]
    const sortOrder = i + 1
    
    // Find domain by name (case sensitive potentially, let's be careful)
    const domain = domains.find(d => d.name === name)
    
    if (domain) {
      console.log(`Matching domain found: ${name} (ID: ${domain.id}). Updating to sort_order ${sortOrder}...`)
      const { data, error } = await supabase
        .from('central_domains')
        .update({ sort_order: sortOrder })
        .eq('id', domain.id)
        .select()
      
      if (error) {
        console.error(`Update error for ${name}:`, error)
      } else {
        console.log(`Success! ${name} updated. Rows affected: ${data?.length}`)
      }
    } else {
      console.log(`Domain NOT found: ${name}`)
    }
  }

  // Final list
  const { data: finalData } = await supabase
    .from('central_domains')
    .select('name, sort_order')
    .order('sort_order', { ascending: true })
  
  console.table(finalData)
}

updateOrder()
