export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress;
}

export function escapeCSVValue(value) {
  if (typeof value !== 'string') return value;
  if (/[",\n\r]/.test(value) || /^[=+@-]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
