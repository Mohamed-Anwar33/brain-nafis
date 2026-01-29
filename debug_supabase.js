import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cyhssotgsllqaxrrhrsj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log("Testing connection to Supabase...");

    // 1. Test basic Table Access (to verify Key)
    console.log("\n1. Testing Table Access (questions)...");
    try {
        const { data, error } = await supabase.from('questions').select('count', { count: 'exact', head: true });
        if (error) {
            console.error("❌ Table Access Failed:", error.message);
        } else {
            console.log("✅ Table Access Successful. Count:", data);
        }
    } catch (err) {
        console.error("❌ Table Access Exception:", err);
    }

    // 2. Test Function Invocation
    console.log("\n2. Testing Function Invocation (exam-start)...");
    try {
        // Determine the user session (anonymous for now)
        const { data: funcData, error: funcError } = await supabase.functions.invoke('exam-start', {
            body: { student_name: "Test User With Four Words" }
        });

        if (funcError) {
            console.error("❌ Function Invocation Failed:", funcError);
            // Access underlying response if possible? 
            // funcError might be specific.
        } else {
            console.log("✅ Function Invocation Successful:", funcData);
        }
    } catch (err) {
        console.error("❌ Function Invocation Exception:", err);
    }
}

testConnection();
