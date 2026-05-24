import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://updasbsbemxihyvtjrhx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZGFzYnNiZW14aWh5dnRqcmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzQzNDUsImV4cCI6MjA5NTE1MDM0NX0.5tuO5PdWUoe32CQB6LkEAUoJt0h2lHSO9FAHWV_7vlU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);