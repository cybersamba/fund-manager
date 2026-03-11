import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gusyswbgrqrbxjqxrzgo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1c3lzd2JncnFyYnhqcXhyemdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODEzMzksImV4cCI6MjA4NzM1NzMzOX0.DeTnTWIIEGvACcFvM68AswsbbStyQCHVLIrihuap9eY'

export const supabase = createClient(supabaseUrl, supabaseKey)
