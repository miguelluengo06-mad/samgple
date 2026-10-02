/**
 * Security validation utilities
 */

// UUID v4 regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Sanitize string for safe display (basic XSS prevention)
 */
export function sanitizeString(input: string, maxLength = 200): string {
  if (typeof input !== 'string') return '';

  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validate email format (improved regex)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // More robust email regex that requires at least 2 chars in domain parts
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate image URL for logos
 * SECURITY: Prevents XSS via javascript: URLs and ensures it's a proper image URL
 */
export function isValidImageUrl(urlString: string): { valid: boolean; error?: string } {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Max length to prevent DoS
  if (urlString.length > 2048) {
    return { valid: false, error: 'URL is too long' };
  }

  try {
    const url = new URL(urlString);

    // SECURITY: Only allow HTTPS (and HTTP for development)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, error: 'URL must use HTTP or HTTPS' };
    }

    // SECURITY: Block javascript: and data: URLs
    const blockedProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (blockedProtocols.some(p => urlString.toLowerCase().startsWith(p))) {
      return { valid: false, error: 'Invalid URL protocol' };
    }

    // Check for common image extensions or known image CDNs
    const pathname = url.pathname.toLowerCase();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
    const imageCdns = [
      'images.unsplash.com',
      'cdn.jsdelivr.net',
      'githubusercontent.com',
      'cloudinary.com',
      'imgix.net',
      's3.amazonaws.com',
      'storage.googleapis.com',
    ];

    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    const isImageCdn = imageCdns.some(cdn => url.hostname.includes(cdn));

    // Allow if it has an image extension or is from a known image CDN
    // Also allow any HTTPS URL (user responsibility for valid images)
    if (!hasImageExtension && !isImageCdn && url.protocol !== 'https:') {
      return { valid: false, error: 'URL should point to an image file' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Rate limiter with in-memory cache
 *
 * IMPORTANT: In-memory rate limiting has limitations on serverless platforms
 * because each function invocation may use a different instance. However, it
 * still provides protection against:
 * - Rapid bursts from a single client hitting the same instance
 * - Basic abuse prevention during warm function invocations
 *
 * For production-grade rate limiting, consider:
 * - @upstash/ratelimit for Vercel/serverless (recommended)
 * - ioredis with a managed Redis instance
 * - Vercel KV or Cloudflare Workers KV
 *
 * The in-memory approach is kept as a defense-in-depth measure and works
 * well enough for most use cases with Vercel's function instance reuse.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup interval - runs every 100 requests on average
const CLEANUP_PROBABILITY = 0.01;
// Max entries to prevent memory bloat
const MAX_ENTRIES = 10000;

/**
 * Sanitize CSS to prevent XSS attacks
 * SECURITY: Blocks dangerous CSS properties and values that can execute code
 *
 * This sanitizer blocks:
 * - HTML tags (including script, style)
 * - javascript: and data: URLs in CSS
 * - expression() (IE-specific XSS vector)
 * - behavior and -moz-binding (browser-specific XSS)
 * - @import (could load external malicious CSS)
 * - @charset (could affect encoding-based attacks)
 *
 * @param css - Raw CSS string
 * @param maxLength - Maximum allowed length (default 10000)
 * @returns Sanitized CSS string
 */
export function sanitizeCSS(css: string, maxLength = 10000): string {
  if (!css || typeof css !== 'string') return '';

  // Trim and limit length
  let sanitized = css.slice(0, maxLength).trim();

  // Remove HTML tags completely (XSS via embedded HTML)
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove javascript: URLs (case-insensitive, handles obfuscation like java\nscript:)
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, '');

  // Remove data: URLs (can execute scripts in some contexts)
  sanitized = sanitized.replace(/data\s*:/gi, 'invalid:');

  // Remove vbscript: URLs (IE-specific)
  sanitized = sanitized.replace(/vbscript\s*:/gi, '');

  // Remove expression() - IE-specific XSS vector
  sanitized = sanitized.replace(/expression\s*\(/gi, 'blocked(');

  // Remove behavior property (IE-specific, can load HTC files)
  sanitized = sanitized.replace(/behavior\s*:/gi, 'blocked:');

  // Remove -moz-binding (Firefox-specific XSS via XBL)
  sanitized = sanitized.replace(/-moz-binding\s*:/gi, 'blocked:');

  // Remove @import rules (can load external CSS that might contain malicious code)
  sanitized = sanitized.replace(/@import\s+/gi, '/* @import blocked */ ');

  // Remove @charset (encoding manipulation attacks)
  sanitized = sanitized.replace(/@charset\s+/gi, '/* @charset blocked */ ');

  // Remove url() with protocols (allow relative URLs and safe image URLs)
  // This blocks url(javascript:...), url(data:...), url(vbscript:...)
  sanitized = sanitized.replace(/url\s*\(\s*["']?\s*(javascript|data|vbscript)\s*:/gi, 'url(blocked:');

  // Remove CSS escape sequences that could be used for obfuscation
  // \6a\61\76\61 etc. (hex encoding of "java" etc.)
  sanitized = sanitized.replace(/\\[0-9a-fA-F]{1,6}/g, '');

  return sanitized;
}

/**
 * Validate CSS syntax for widget customization
 * Returns validation result with sanitized CSS if valid
 */
export function validateAndSanitizeCSS(css: string, maxLength = 10000): { valid: boolean; sanitized: string; error?: string } {
  if (!css || typeof css !== 'string') {
    return { valid: true, sanitized: '' };
  }

  if (css.length > maxLength) {
    return { valid: false, sanitized: '', error: `CSS exceeds maximum length of ${maxLength} characters` };
  }

  const sanitized = sanitizeCSS(css, maxLength);

  // Check for obvious attempts to break out of CSS context
  if (sanitized.includes('</style>') || sanitized.includes('</script>')) {
    return { valid: false, sanitized: '', error: 'Invalid CSS: contains HTML closing tags' };
  }

  return { valid: true, sanitized };
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Probabilistic cleanup of expired entries to prevent memory bloat
  if (Math.random() < CLEANUP_PROBABILITY || rateLimitMap.size > MAX_ENTRIES) {
    const expiredKeys: string[] = [];
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        expiredKeys.push(k);
      }
    }
    for (const k of expiredKeys) {
      rateLimitMap.delete(k);
    }
    // If still over limit after cleanup, clear oldest half
    if (rateLimitMap.size > MAX_ENTRIES) {
      const entries = Array.from(rateLimitMap.entries())
        .sort((a, b) => a[1].resetTime - b[1].resetTime);
      const toDelete = entries.slice(0, Math.floor(entries.length / 2));
      for (const [k] of toDelete) {
        rateLimitMap.delete(k);
      }
    }
  }

  if (!record || record.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}
