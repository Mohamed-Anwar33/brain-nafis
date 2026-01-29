import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Simple .env parser since dotenv might not be installed
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env')
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8')
            const envVars = {}
            // Use regex to handle CRLF and simple parsing
            envContent.split(/\r?\n/).forEach(line => {
                line = line.trim()
                if (!line || line.startsWith('#')) return

                const idx = line.indexOf('=')
                if (idx !== -1) {
                    const key = line.substring(0, idx).trim()
                    let value = line.substring(idx + 1).trim()
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1)
                    }
                    envVars[key] = value
                }
            })
            return envVars
        }
    } catch (e) {
        console.warn('Could not read .env file:', e.message)
    }
    return {}
}

const env = loadEnv()
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://cyhssotgsllqaxrrhrsj.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY

console.log('--- Configuration ---')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey ? (supabaseKey.substring(0, 10) + '...') : 'MISSING')

if (!supabaseKey) {
    console.error('ERROR: VITE_SUPABASE_PUBLISHABLE_KEY is missing.')
    process.exit(1)
}

if (supabaseKey.startsWith('sb_publishable_')) {
    console.warn('WARNING: You are using a "sb_publishable_" key. This looks like a Loveable/Proxy key.')
    console.warn('If you are connecting directly to Supabase, this key will likely FAIL.')
    console.warn('Please update your .env with the standard Anon Key (starts with "ey...") from your Supabase Dashboard.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const email = 'admin_recovery@testwise.com'
const password = 'adminPassword123'

async function createAdmin() {
    console.log(`\nAttempting to create user: ${email}`)

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Admin User',
            },
        },
    })

    if (error) {
        console.error('Error creating user (signUp failed):')
        console.error('Message:', error.message)
        console.error('Status:', error.status)
        if (error.code) console.error('Code:', error.code)

        // Try to sign in just in case the user already exists
        console.log('\nTrying to sign in instead...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (signInError) {
            console.error('SignIn also failed:', signInError.message)
            process.exit(1)
        }

        console.log('SignIn successful! The user already existed.')
        // Fallthrough to success handling logic if needed, or just exit
        process.exit(0)
    }

    if (data.user) {
        console.log('-----------------------------------')
        console.log('User created successfully!')
        console.log(`Email:    ${email}`)
        console.log(`Password: ${password}`)
        console.log(`User ID:  ${data.user.id}`)
        console.log('-----------------------------------')
        if (data.session) {
            console.log('Session active (Auto-confirmed).')
        } else {
            console.log('User created successfully but session is null.')
            console.log('This usually means Email Confirmation is enabled.')
            console.log('Global Note: You must confirm the email in the Supabase Dashboard > Authentication > Users')
            console.log('OR disable "Confirm Email" in Authentication > Providers > Email.')
        }
    } else {
        console.log('User creation returned no data (unexpected).')
    }
}

createAdmin()
