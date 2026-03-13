// Simple Safari Debug System - Uses basic alerts for maximum compatibility
// This is a fallback for cases where the full mobile debugger might not work

const getApiUrl = () => {
  // Use environment variable if set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  
  const hostname = window.location.hostname;
  
  // Production: use api.autoflopro.com subdomain
  if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
    return 'https://api.autoflopro.com/api';
  }
  
  // Always use HTTPS to avoid mixed content issues
  const protocol = 'https';
  
  return `${protocol}://${hostname}:5001/api`;
};

export const runQuickSafariDebug = async (email: string, password: string) => {
  const results: string[] = [];
  
  // 1. Browser Detection
  const ua = navigator.userAgent;
  const isSafari = ua.includes('Safari') && !ua.includes('Chrome');
  const isIPhone = ua.includes('iPhone');
  results.push(`🌐 Browser: ${isSafari ? 'Safari' : 'Not Safari'} ${isIPhone ? 'iPhone' : ''}`);
  
  // 2. Protocol & Mixed Content Analysis
  const frontendProtocol = window.location.protocol;
  const frontendUrl = `${frontendProtocol}//${window.location.host}`;
  const apiUrl = getApiUrl();
  const apiProtocol = apiUrl.startsWith('https') ? 'https:' : 'http:';
  
  results.push(`🔒 Frontend: ${frontendUrl}`);
  results.push(`🔗 API URL: ${apiUrl}`);
  results.push(`📊 Protocols: Page=${frontendProtocol} API=${apiProtocol}`);
  
  // Check for mixed content
  if (frontendProtocol === 'https:' && apiProtocol === 'http:') {
    results.push('🚨 MIXED CONTENT DETECTED!');
    results.push('❌ HTTPS page cannot call HTTP API');
    results.push('🔧 Solution: Backend must use HTTPS');
  } else if (frontendProtocol === apiProtocol) {
    results.push('✅ Protocol Match: No mixed content');
  }
  
  // 3. Storage Test
  let localStorageWorks = false;
  let sessionStorageWorks = false;
  let cookiesWork = false;
  
  try {
    localStorage.setItem('__debug__', 'test');
    localStorage.removeItem('__debug__');
    localStorageWorks = true;
  } catch (e) {
    results.push('❌ localStorage BLOCKED');
  }
  
  try {
    sessionStorage.setItem('__debug__', 'test');
    sessionStorage.removeItem('__debug__');
    sessionStorageWorks = true;
  } catch (e) {
    results.push('❌ sessionStorage BLOCKED');
  }
  
  try {
    document.cookie = '__debug__=test';
    cookiesWork = document.cookie.includes('__debug__=test');
    if (cookiesWork) {
      document.cookie = '__debug__=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  } catch (e) {
    results.push('❌ Cookies BLOCKED');
  }
  
  if (!localStorageWorks && !sessionStorageWorks) {
    results.push('🚨 CRITICAL: All storage blocked! Private Browsing?');
  } else {
    results.push('✅ Storage Available');
  }
  
  // 4. Email Analysis
  const normalizedEmail = email.toLowerCase().trim();
  if (email !== normalizedEmail) {
    results.push(`📧 Email auto-capitalized: "${email}" → "${normalizedEmail}"`);
  } else {
    results.push('✅ Email format OK');
  }
  
  // 5. HTTPS Certificate Test First
  try {
    const baseUrl = apiUrl.replace('/api', '');
    results.push(`🔒 Testing certificate: ${baseUrl}`);
    
    const testResponse = await fetch(`${baseUrl}`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors'
    });
    
    if (testResponse.ok) {
      results.push(`✅ HTTPS Certificate: Accepted`);
    } else {
      results.push(`❌ HTTPS Certificate: Response ${testResponse.status}`);
    }
  } catch (error: any) {
    results.push(`❌ HTTPS Certificate: ${error.message}`);
    if (error.message.includes('Load failed') || error.message.includes('NetworkError')) {
      results.push('🔒 Certificate not accepted in browser');
      results.push(`💡 Visit: ${apiUrl.replace('/api', '')} and accept certificate`);
    }
  }
  
  // 6. API Health Check
  try {
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push(`✅ API Health: SUCCESS`);
      results.push(`📊 Status: ${data.status || 'unknown'}`);
    } else {
      results.push(`❌ API Health: FAILED (${response.status})`);
    }
  } catch (error: any) {
    results.push(`❌ API Health: ${error.message}`);
    if (error.message.includes('Load failed')) {
      results.push('🔒 Likely certificate issue');
    }
  }
  
  // 7. Login Test (only if no mixed content detected)
  if (frontendProtocol === 'https:' && apiProtocol === 'http:') {
    results.push('⏭️ Skipping login test - Mixed content will fail');
  } else {
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: normalizedEmail,
          password: password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        results.push(`✅ Login Test: SUCCESS`);
        results.push(`🎫 Token: ${data.token ? 'Present' : 'Missing'}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'No error data' }));
        results.push(`❌ Login Test: FAILED (${response.status})`);
        results.push(`📝 Error: ${errorData.error || 'Unknown'}`);
      }
    } catch (error: any) {
      results.push(`❌ Login Test: ${error.message}`);
      
      if (error.message.includes('Load failed') || error.message.includes('NetworkError')) {
        results.push('🔍 Certificate or Mixed Content issue');
        results.push('💡 Check: Browser security warnings');
      }
    }
  }
  
  // Show results
  const report = results.join('\n\n');
  alert(`🔍 HTTPS SAFARI DEBUG REPORT\n\n${report}`);
  
  // Also log to console
  console.log('🔍 HTTPS Safari Debug Report:', results);
  
  return results;
};

export const showSimpleStorageInfo = () => {
  const info: string[] = [];
  
  // Check current storage
  try {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    info.push(`Token: ${token ? 'Present' : 'Missing'}`);
    info.push(`Stored Email: ${email || 'None'}`);
  } catch (e) {
    info.push('Cannot access localStorage');
  }
  
  try {
    const sessionToken = sessionStorage.getItem('token');
    info.push(`Session Token: ${sessionToken ? 'Present' : 'Missing'}`);
  } catch (e) {
    info.push('Cannot access sessionStorage');
  }
  
  const report = info.join('\n');
  alert(`💾 STORAGE INFO\n\n${report}`);
};

export const testApiOnly = async () => {
  const apiUrl = getApiUrl();
  
  // Check for mixed content first
  const frontendProtocol = window.location.protocol;
  const apiProtocol = apiUrl.startsWith('https') ? 'https:' : 'http:';
  
  if (frontendProtocol === 'https:' && apiProtocol === 'http:') {
    alert('🚨 MIXED CONTENT DETECTED!\n\nHTTPS page cannot call HTTP API.\n\nThe backend server must use HTTPS.\n\nCurrent setup:\nFrontend: HTTPS ✅\nBackend: HTTP ❌');
    return;
  }
  
  try {
    // Test the health endpoint which should definitely exist
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      alert(`✅ HTTPS API Connection: SUCCESS\n\nServer Status: ${data.status}\nMessage: ${data.message}\nProtocol: ${data.protocol}\nSecure: ${data.secure}`);
    } else {
      alert(`❌ HTTPS API Connection: FAILED\nStatus: ${response.status}\n\nThe server responded but the health endpoint returned an error.`);
    }
  } catch (error: any) {
    if (error.message.includes('Load failed') || error.message.includes('NetworkError')) {
      const baseUrl = apiUrl.replace('/api', '');
      alert(`❌ HTTPS API Connection: CERTIFICATE ISSUE\n\nError: ${error.message}\n\nSolution:\n1. Visit ${baseUrl} directly\n2. Accept the security certificate\n3. Try again`);
    } else {
      alert(`❌ HTTPS API Connection: ERROR\n${error.message}\n\nCheck:\n- Server running on HTTPS?\n- Same network?\n- Certificate valid?`);
    }
  }
}; 