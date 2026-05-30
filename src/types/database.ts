// Simple Database type for Supabase client
// Using 'any' for now to avoid complex type issues during development

export interface Database {
  public: {
    Tables: {
      [key: string]: any
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
  }
}
