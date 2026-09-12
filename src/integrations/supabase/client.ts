// This file provides the configured Supabase client.
import { createClient } from '@supabase/supabase-js';

// Support both Next.js (process.env.NEXT_PUBLIC_*) and Vite (import.meta.env.*),
// with hardcoded fallback to the project credentials.
const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // @ts-ignore - Handle Vite import.meta.env safely
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return undefined;
};

const SUPABASE_URL =
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnvVar('VITE_SUPABASE_URL') ||
  'https://bxtktegoshzcdezgdrzm.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  'sb_publishable_mf-bxY8K56_7rOKvuC9Qpw_OpyBWGr0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
