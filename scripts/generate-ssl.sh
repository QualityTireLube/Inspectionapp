#!/bin/bash

# Generate SSL certificates for local HTTPS development
echo "🔐 Generating SSL certificates for local development..."

# Create .cert directory if it doesn't exist
mkdir -p ../.cert

# Navigate to the .cert directory
cd ../.cert

# Create a config file for the certificate with SAN (Subject Alternative Names)
cat > cert.conf <<EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=State
L=City
O=Organization
OU=OrgUnit
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = 192.168.68.114
EOF

# Generate private key and certificate with SAN support
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -config cert.conf -extensions v3_req

# Clean up the config file
rm cert.conf

# Set appropriate permissions
chmod 600 key.pem
chmod 644 cert.pem

echo "✅ SSL certificates generated successfully!"
echo "📍 Located in: .cert/"
echo "📝 Files created:"
echo "   - key.pem (private key)"
echo "   - cert.pem (certificate)"
echo ""
echo "🔧 Your application is now configured for HTTPS!"
echo "🌐 Frontend: https://localhost:3000"
echo "🔙 Backend:  https://localhost:5001"
echo ""
echo "⚠️  Note: You'll need to accept the self-signed certificate in your browser"
echo "   - Chrome: Click 'Advanced' → 'Proceed to localhost (unsafe)'"
echo "   - Firefox: Click 'Advanced' → 'Accept the Risk and Continue'"
echo "   - Safari: Click 'Show Details' → 'visit this website'" 