import {createClient,type SupabaseClient} from "@supabase/supabase-js";
export const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
let client:SupabaseClient|undefined;
export function browserDb(){if(!configured)throw new Error("Configura las variables de Supabase en .env.local.");return client??=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);}
