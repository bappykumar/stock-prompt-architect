const fs = require('fs');

const content = fs.readFileSync('App.tsx', 'utf-8');
const match = content.match(/const OPTIONS = (\{[\s\S]*?\n\});/);
if (match) {
  const optionsString = match[1];
  
  // It's not standard JSON, so we can't JSON.parse. We'll parse it manually.
  let currentField = null;
  const lines = optionsString.split('\n');
  
  for (const line of lines) {
    const fieldMatch = line.match(/^\s*([a-zA-Z0-9_]+):\s*\[/);
    if (fieldMatch) {
      currentField = fieldMatch[1];
      console.log(`\n${currentField.toUpperCase()}:`);
      continue;
    }
    
    const objMatch = line.match(/\{\s*value:\s*'([^']*)',\s*label:\s*'([^']*)'\s*\}/);
    if (objMatch) {
      console.log(`  label: '${objMatch[2]}' | value: '${objMatch[1]}'`);
    } else {
      const objMatchDouble = line.match(/\{\s*value:\s*"([^"]*)",\s*label:\s*"([^"]*)"\s*\}/);
      if (objMatchDouble) {
        console.log(`  label: '${objMatchDouble[2]}' | value: '${objMatchDouble[1]}'`);
      }
    }
  }
}
