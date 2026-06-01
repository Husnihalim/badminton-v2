// Simple Database type for Supabase client.
// Replace this with generated Supabase types when the project schema is stable.

export interface Database {
  public: {
    Tables: {
      [key: string]: unknown
    }
    Views: {
      [key: string]: unknown
    }
    Functions: {
      [key: string]: unknown
    }
  }
}
