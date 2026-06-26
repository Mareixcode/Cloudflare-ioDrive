export function parseUA(ua: string): { browser: string; os: string; deviceType: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

  if (!ua) return { browser, os, deviceType };

  // Browser detection (order matters — Safari checks must come after Chrome)
  const ua_lower = ua.toLowerCase();

  if (ua.includes('Edg/') || ua_lower.includes('edge/') || ua_lower.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browser = 'Opera';
  } else if (ua_lower.includes('chrome/') && ua_lower.includes('safari/')) {
    browser = 'Chrome';
  } else if (ua_lower.includes('safari/') && !ua_lower.includes('chrome/')) {
    browser = 'Safari';
  } else if (ua_lower.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua_lower.includes('trident/') || ua_lower.includes('msie')) {
    browser = 'IE';
  }

  // OS detection — check iOS before macOS to avoid "like Mac OS X" UAs being misclassified
  if (ua_lower.includes('windows nt 11')) {
    os = 'Windows 11';
  } else if (ua_lower.includes('windows nt 10')) {
    os = 'Windows 10';
  } else if (ua_lower.includes('windows nt 6.3')) {
    os = 'Windows 8.1';
  } else if (ua_lower.includes('windows nt 6.1')) {
    os = 'Windows 7';
  } else if (ua_lower.includes('windows')) {
    os = 'Windows';
  } else if (ua_lower.includes('iphone') || ua_lower.includes('ipad') || ua_lower.includes('ipod')) {
    os = 'iOS';
  } else if ((ua_lower.includes('mac os x') && !ua_lower.includes('like mac os x')) || ua_lower.includes('macintosh')) {
    const m = ua.match(/Mac OS X (\d+[._]\d+)/);
    os = m ? 'macOS ' + m[1].replace('_', '.') : 'macOS';
  } else if (ua_lower.includes('android')) {
    os = 'Android';
    const m = ua.match(/Android (\d+(?:\.\d+)?)/);
    if (m) os += ' ' + m[1];
  } else if (ua_lower.includes('linux')) {
    os = 'Linux';
  } else if (ua_lower.includes('cros')) {
    os = 'Chrome OS';
  }

  // Device type
  if (ua_lower.includes('iphone') || ua_lower.includes('ipod') || (ua_lower.includes('android') && ua_lower.includes('mobile'))) {
    deviceType = 'mobile';
  } else if (ua_lower.includes('ipad') || ua_lower.includes('tablet') || ua_lower.includes('playbook') || ua_lower.includes('silk')) {
    deviceType = 'tablet';
  }

  return { browser, os, deviceType };
}
