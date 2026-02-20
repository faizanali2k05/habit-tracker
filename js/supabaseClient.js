const supabaseUrl = "https://ogwemptjmefaruexvaft.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nd2VtcHRqbWVmYXJ1ZXh2YWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODA1NTMsImV4cCI6MjA4NzE1NjU1M30.auesJxoG0homWtWkZhPhDJuZxBi3MkE2k1HvriyupyQ";

const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);
