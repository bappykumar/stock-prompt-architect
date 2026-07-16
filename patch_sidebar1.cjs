const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Add state
const stateStr = `  const [isSidebarOpen, setIsSidebarOpen] = useState(true);`;
code = code.replace(
  /  const \[isDarkMode, setIsDarkMode\] = useState\(\(\) => \{/g,
  `${stateStr}\n  const [isDarkMode, setIsDarkMode] = useState(() => {`
);

fs.writeFileSync('App.tsx', code);
console.log("Patched state");
