const crypto = require('crypto');

function generateApiKey() {
  // Create a secure random 12-byte buffer and format into groups
  const buf = crypto.randomBytes(9); // 9 bytes -> 18 hex chars
  const hex = buf.toString('hex').toUpperCase();
  // split into 3 groups of 4,4,4 after prefix
  const part1 = hex.slice(0,4);
  const part2 = hex.slice(4,8);
  const part3 = hex.slice(8,12);
  return `APF-${part1}-${part2}-${part3}`;
}

module.exports = generateApiKey;
