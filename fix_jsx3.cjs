const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  "            || 'INITIALIZING SECURE HANDSHAKE...'}",
  "            &gt; {apiTrackerState.statusMessage || 'INITIALIZING SECURE HANDSHAKE...'}"
);

fs.writeFileSync('App.tsx', code);
console.log("Fixed JSX syntax line 2030");
