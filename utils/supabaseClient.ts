import { createClient } from '@supabase/supabase-js';

// We will export a function to create the client dynamically, 
// as the keys might come from local storage or user input, not just env vars.
export const getSupabaseClient = (supabaseUrl: string, supabaseKey: string) => {
    return createClient(supabaseUrl, supabaseKey);
};

// Helper to safely access env vars in Vite or standard process.env environments
const getEnvVar = (key: string, legacyKey?: string): string => {
    // Check import.meta.env (Vite standard)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        if (import.meta.env[key]) return import.meta.env[key];
        // @ts-ignore
        if (legacyKey && import.meta.env[legacyKey]) return import.meta.env[legacyKey];
    }

    // Check process.env (Node/Compat)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env[key]) return process.env[key] as string;
        if (legacyKey && process.env[legacyKey]) return process.env[legacyKey] as string;
    }

    return '';
};

// Helper to check if we have env vars configured
export const getStoredSupabaseConfig = () => {
    // Try VITE_ prefix first, then REACT_APP_ fallback
    const envUrl = getEnvVar('VITE_SUPABASE_URL', 'REACT_APP_SUPABASE_URL');
    const envKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY');
    
    const localUrl = localStorage.getItem('supabase_url');
    const localKey = localStorage.getItem('supabase_key');

    return {
        url: envUrl || localUrl || '',
        key: envKey || localKey || ''
    };
};

export const getAdminPassword = (): string => {
    return getEnvVar('VITE_ADMIN_PASSWORD', 'REACT_APP_ADMIN_PASSWORD');
};