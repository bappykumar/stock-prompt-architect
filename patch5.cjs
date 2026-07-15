const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /toastId = addToast\(statusMessage, 'retry'\);/g,
  "toastId = addToast(statusMessage, 'retry', 0);"
);

code = code.replace(
  /toastId = addToast\(statusMessage, 'info'\);/g,
  "toastId = addToast(statusMessage, 'info', 0);"
);

fs.writeFileSync('App.tsx', code);
console.log("Updated addToast calls");
