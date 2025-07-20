#!/bin/bash

echo "🧹 Clearing development cache and service workers..."

# Remove build and cache directories
echo "📁 Removing build directories..."
rm -rf dev-dist/
rm -rf dist/
rm -rf node_modules/.vite/

echo "✅ Development cache cleared!"
echo ""
echo "🌐 Additional steps for complete cleanup:"
echo "   1. Clear browser cache:"
echo "      - Chrome: Ctrl/Cmd + Shift + Delete → Clear all data"
echo "      - Firefox: Ctrl/Cmd + Shift + Delete → Clear all data"
echo "      - Safari: Develop → Empty Caches"
echo ""
echo "   2. Unregister service workers manually:"
echo "      - Chrome: F12 → Application → Service Workers → Unregister"
echo "      - Firefox: F12 → Application → Service Workers → Unregister"
echo ""
echo "   3. Open in incognito/private mode for clean test"
echo ""
echo "🚀 Ready to start development server with: npm run dev" 