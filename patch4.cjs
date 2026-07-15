const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetAddToast = `  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' | 'retry' = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    return id;
  }, []);`;

const newAddToast = `  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' | 'retry' = 'info', duration: number = 5000) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);`;

if (code.includes(targetAddToast)) {
  fs.writeFileSync('App.tsx', code.replace(targetAddToast, newAddToast));
  console.log("Updated addToast");
} else {
  console.log("Target not found");
}
