// Deployment Configuration Example
// Copy and rename this file based on your deployment environment

// Development Configuration
const development = {
  frontend: {
    VITE_API_BASE_URL: 'https://localhost:5001',
    VITE_UPLOAD_URL: 'https://localhost:5001/uploads'
  },
  backend: {
    NODE_ENV: 'development',
    PORT: 5001,
    JWT_SECRET: 'dev-secret-key-change-in-production',
    FRONTEND_URL: 'https://localhost:3000',
    DATABASE_URL: './database.sqlite',
    DATABASE_TYPE: 'sqlite'
  }
};

// Production Configuration for Vercel + Render
const production = {
  // Vercel Environment Variables (Frontend)
  frontend: {
    VITE_API_BASE_URL: 'https://your-render-app.onrender.com',
    VITE_UPLOAD_URL: 'https://your-render-app.onrender.com/uploads'
  },
  
  // Render Environment Variables (Backend)
  backend: {
    NODE_ENV: 'production',
    PORT: 10000, // Render uses port 10000
    JWT_SECRET: 'generated-by-render-or-your-secure-key',
    FRONTEND_URL: 'https://your-vercel-app.vercel.app',
    
    // Database - Render supports PostgreSQL
    DATABASE_URL: 'postgresql://user:password@host:port/database',
    DATABASE_TYPE: 'postgresql'
  }
};

module.exports = {
  development,
  production
};

/* 
DEPLOYMENT INSTRUCTIONS:

1. VERCEL (Frontend):
   - Set environment variables in Vercel dashboard:
     * VITE_API_BASE_URL: https://your-render-app.onrender.com
     * VITE_UPLOAD_URL: https://your-render-app.onrender.com/uploads
   
2. RENDER (Backend):
   - Set environment variables in Render dashboard:
     * NODE_ENV: production
     * JWT_SECRET: (generate a secure random string)
     * FRONTEND_URL: https://your-vercel-app.vercel.app
     * DATABASE_URL: (PostgreSQL connection string)
     * PORT: 10000
     
3. DATABASE MIGRATION:
   - Render doesn't support SQLite for production
   - Use Render's PostgreSQL addon or external PostgreSQL service
   - Run migration scripts to convert SQLite to PostgreSQL
*/ 