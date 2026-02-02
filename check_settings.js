
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cyhssotgsllqaxrrhrsj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("--- Checking 'app_settings' for Email Config ---");
    const { data: appSettingsData, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['admin_email', 'resend_api_key']);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(JSON.stringify(appSettingsData, null, 2));
}

check();
