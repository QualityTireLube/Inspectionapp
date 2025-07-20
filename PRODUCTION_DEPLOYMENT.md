# Production Deployment Guide

## Overview
This guide explains how to deploy your vehicle inspection app in production vs development.

## Development vs Production Differences

### Development Environment
- **Frontend:** `npm run dev` (Vite dev server on port 3000)
- **Backend:** `npm run dev:backend` (Express with nodemon on port 5001)
- **Features:** Hot reload, detailed errors, unminified code

### Production Environment
- **Frontend:** Built static files served by Express
- **Backend:** Single Express server serving both API and static files
- **Features:** Optimized, minified, single port deployment

## Production Deployment Steps

### 1. Build the Application
```bash
# Build frontend for production
npm run build:prod

# This creates optimized static files in the `dist/` folder
```

### 2. Start Production Server
```bash
# Start the production server (serves both API and static files)
npm run start:prod

# Or manually:
NODE_ENV=production cd server && npm start
```

### 3. Environment Variables (Production)
Create a `.env` file in the server directory:
```env
NODE_ENV=production
PORT=5001
JWT_SECRET=your-super-secure-jwt-secret-key
```

## Production Commands

| Command | Description |
|---------|-------------|
| `npm run build:prod` | Build frontend for production |
| `npm run start:prod` | Start production server |
| `npm run serve` | Build and preview locally |

## Key Differences

### Development
- **Two servers:** Frontend (3000) + Backend (5001)
- **Proxy:** Vite proxies API calls to backend
- **Hot reload:** Instant updates during development
- **Debug info:** Detailed error messages and source maps

### Production
- **Single server:** Express serves both API and static files
- **Optimized:** Minified code, no source maps
- **Static files:** React app built to static HTML/CSS/JS
- **Performance:** Optimized for speed and efficiency

## Deployment Options

### Option 1: Local Production
```bash
npm run build:prod
npm run start:prod
# App available at http://localhost:5001
```

### Option 2: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build:prod
EXPOSE 5001
CMD ["npm", "run", "start:prod"]
```

### Option 3: Cloud Deployment
- **Heroku:** Push to Heroku with Procfile
- **Vercel:** Deploy frontend, use serverless functions
- **AWS:** EC2 or ECS deployment
- **DigitalOcean:** App Platform or Droplet

## Security Considerations (Production)

1. **Environment Variables:** Use secure JWT secrets
2. **HTTPS:** Always use HTTPS in production
3. **Rate Limiting:** Stricter limits in production
4. **CORS:** Configure for your domain only
5. **File Uploads:** Validate and sanitize uploads
6. **Database:** Use production database (PostgreSQL, MySQL)

## Performance Optimizations

1. **Static Assets:** Serve from CDN
2. **Caching:** Implement proper caching headers
3. **Compression:** Enable gzip compression
4. **Database:** Optimize queries and indexes
5. **Monitoring:** Add logging and monitoring

## Troubleshooting

### Common Issues
1. **Port conflicts:** Change PORT environment variable
2. **Build errors:** Check TypeScript compilation
3. **API errors:** Verify environment variables
4. **File uploads:** Check uploads directory permissions

### Logs
- **Development:** Console logs and Vite dev server
- **Production:** Check server logs and error files 