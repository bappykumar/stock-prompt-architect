const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const importStr = `import { Cpu } from 'lucide-react';`;
const newImportStr = `import { Cpu } from 'lucide-react';\nimport { RunArchitectButton } from './components/RunArchitectButton';`;

if (!code.includes('import { RunArchitectButton }')) {
    code = code.replace(importStr, newImportStr);
    fs.writeFileSync('App.tsx', code);
    console.log("Patched import");
}
