const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /> {apiTrackerState.statusMessage || 'INITIALIZING SECURE HANDSHAKE...'}/g,
  "&gt; {apiTrackerState.statusMessage || 'INITIALIZING SECURE HANDSHAKE...'}"
);

fs.writeFileSync('App.tsx', code);
console.log("Fixed JSX syntax");
