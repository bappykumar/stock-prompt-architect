const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /"Settings and scene description auto-filled from your image — review before running."/g,
  '"Image analyzed and settings auto-filled successfully."'
);

code = code.replace(
  /"Settings auto-filled from your reference — review and adjust as needed before running."/g,
  '"Reference text analyzed and settings auto-filled successfully."'
);

code = code.replace(
  /'Image Analyzed & Used'/g,
  "'Image Reference Applied'"
);

code = code.replace(
  /'Text Auto-Fill Used'/g,
  "'Text Reference Applied'"
);

fs.writeFileSync('App.tsx', code);
console.log("Updated texts");
