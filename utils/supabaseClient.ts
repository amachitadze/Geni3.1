import { createClient } from '@supabase/supabase-js';

// We will export a function to create the client dynamically, 
// as the keys might come from local storage or user input, not just env vars.
export const getSupabaseClient = (supabaseUrl: string, supabaseKey: string) => {
    return createClient(supabaseUrl, supabaseKey);
};

// Helper to check if we have env vars configured
export const getStoredSupabaseConfig = () => {
    // Check both REACT_APP_ (CRA) and VITE_ (Vite) prefixes just in case, plus standard process.env
    const envUrl = (typeof process !== 'undefined' && process.env) 
        ? (process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL) 
        : '';
    const envKey = (typeof process !== 'undefined' && process.env) 
        ? (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) 
        : '';
    
    const localUrl = localStorage.getItem('supabase_url');
    const localKey = localStorage.getItem('supabase_key');

    return {
        url: envUrl || localUrl || '',
        key: envKey || localKey || ''
    };
};