
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cyhssotgsllqaxrrhrsj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c"

const supabase = createClient(supabaseUrl, supabaseKey)

async function findDomains() {
  console.log('Searching for domains by name...')
  const searchNames = ['كيمياء', 'فيزياء', 'كهرباء']
  
  const { data, error } = await supabase
    .from('central_domains')
    .select('*')
    .in('name', searchNames)
  
  if (error) {
    console.error('Error:', error)
    return
  }

  if (data.length === 0) {
    console.log('No domains found with those names. Listing all domains:')
    const { data: allData } = await supabase.from('central_domains').select('*')
    console.table(allData)
  } else {
    console.table(data)
  }
}

findDomains()
