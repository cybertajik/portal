import crypto from 'crypto';

// Secret key for HMAC signing (loaded from env or generated persistently)
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'portal_admin_secure_key_2026_' + (process.env.ADMIN_PASSWORD || 'M@s!323993');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'M@s!323993';

/**
 * Timing-safe password verification
 */
export function verifyAdminPassword(inputPassword) {
  if (!inputPassword || typeof inputPassword !== 'string') return false;

  // Hash both with SHA-256 and compare with timingSafeEqual to prevent timing attacks
  const hashA = crypto.createHash('sha256').update(inputPassword).digest();
  const hashB = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();

  try {
    return crypto.timingSafeEqual(hashA, hashB);
  } catch (e) {
    return false;
  }
}

/**
 * Generate a signed admin session token valid for 8 hours
 */
export function generateAdminToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    role: 'admin',
    iat: now,
    exp: now + 8 * 3600 // 8 hours validity
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a signed admin session token
 */
export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;

  // Verify HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', ADMIN_JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  try {
    const bufA = Buffer.from(signature);
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length) return false;
    if (!crypto.timingSafeEqual(bufA, bufB)) return false;

    // Decode and verify expiration
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return false; // Expired
    }
    return payload.role === 'admin';
  } catch (err) {
    return false;
  }
}

/**
 * Express middleware to enforce admin authentication on sensitive routes
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required. Admin password must be verified to access this control.',
      requiresAuth: true 
    });
  }

  const token = authHeader.slice(7).trim();
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ 
      error: 'Admin session expired or invalid. Please re-authenticate.',
      requiresAuth: true 
    });
  }

  next();
}
