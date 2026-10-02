// Variables de entorno del servidor (ver .env.example)
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';

      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      SUPABASE_URL?: string;

      [key: string]: string | undefined;
    }

    interface Process {
      env: ProcessEnv;
    }
  }

  var process: NodeJS.Process;
}

export {};
