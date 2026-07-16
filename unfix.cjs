const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const badStr = "&gt; {apiTrackerState.statusMessage || 'INITIALIZING SECURE HANDSHAKE...'}";
const pieces = code.split(badStr);
const original = pieces.join('');

fs.writeFileSync('App.tsx', original);
console.log("Restored App.tsx");
