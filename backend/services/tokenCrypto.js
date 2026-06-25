const crypto = require('crypto');

// Bank tokens are encrypted at rest with AES-256-GCM. The key can be any
// string — it is hashed to 256 bits. Without it we fall back to plaintext so
// dev environments without bank features keep working.
const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
const key = rawKey ? crypto.createHash('sha256').update(rawKey).digest() : null;

if (!key && process.env.NODE_ENV === 'production') {
  console.warn('TOKEN_ENCRYPTION_KEY is not set — bank tokens will be stored unencrypted');
}

const PREFIX = 'enc:v1:';

function encryptToken(plain) {
  if (plain == null || !key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('hex')).join(':');
}

function decryptToken(stored) {
  // Rows written before encryption existed are plaintext — pass them through
  if (stored == null || !stored.startsWith(PREFIX)) return stored;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is required to decrypt stored bank tokens');
  const [ivHex, tagHex, dataHex] = stored.slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = { encryptToken, decryptToken };
