const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetFunction = `  const executeWithKeyRotation = async <T,>(
    operation: (keyRecord: { id: string, key: string, provider: 'gemini'|'groq'|'mistral'|'openrouter' }, fallbackModel?: string) => Promise<T>,
    providerOverride?: 'gemini' | 'groq' | 'mistral' | 'openrouter'
  ): Promise<T> => {`;

const newFunctionHeader = `  const executeWithKeyRotation = async <T,>(
    operation: (keyRecord: { id: string, key: string, provider: 'gemini'|'groq'|'mistral'|'openrouter' }, fallbackModel?: string) => Promise<T>,
    providerOverride?: 'gemini' | 'groq' | 'mistral' | 'openrouter'
  ): Promise<T> => {`;

// We need to inject state reset at the beginning of executeWithKeyRotation, and state updates during loops.
// Let's replace the whole function content up to the `for` loop to inject state init.

const findStr = `    const keysToTry = [...prioritizedPreferred, ...otherKeys];

    const maxRetriesPerKey = 3;
    let lastError: any = null;
    let toastId: string | null = null;

    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {`;

const replaceStr = `    const keysToTry = [...prioritizedPreferred, ...otherKeys];

    const maxRetriesPerKey = 3;
    let lastError: any = null;
    let toastId: string | null = null;
    
    setApiTrackerState(prev => ({
      ...prev,
      visible: true,
      totalKeys: apiKeys.length,
      currentKeyId: null,
      currentProvider: null,
      attempt: 1,
      failedKeys: [],
      statusMessage: 'ESTABLISHING CONNECTION...'
    }));

    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {`;

code = code.replace(findStr, replaceStr);

const loopStartStr = `      const keyRecord = keysToTry[keyIdx];
      const maskedKey = \`\${keyRecord.key.substring(0, 4)}...\`;`;

const loopStartReplace = `      const keyRecord = keysToTry[keyIdx];
      const maskedKey = \`\${keyRecord.key.substring(0, 4)}...\`;
      
      setApiTrackerState(prev => ({
        ...prev,
        currentKeyId: keyRecord.id,
        currentProvider: keyRecord.provider,
        statusMessage: \`AUTHENTICATING \${keyRecord.provider.toUpperCase()} NODE...\`
      }));`;

code = code.replace(loopStartStr, loopStartReplace);


const tryStartStr = `        try {
          if (toastId) {`;

const tryStartReplace = `        try {
          setApiTrackerState(prev => ({ ...prev, attempt }));
          if (toastId) {`;

code = code.replace(tryStartStr, tryStartReplace);

const successStr = `          const result = await operation(keyRecord, fallbackModel);
          if (keyRecord.id !== 'system' && keyRecord.id !== activeKeyId) {
            setActiveKeyId(keyRecord.id);
          }
          return result;`;

const successReplace = `          const result = await operation(keyRecord, fallbackModel);
          if (keyRecord.id !== 'system' && keyRecord.id !== activeKeyId) {
            setActiveKeyId(keyRecord.id);
          }
          setApiTrackerState(prev => ({ ...prev, statusMessage: 'TRANSMISSION COMPLETE.', visible: false }));
          return result;`;

code = code.replace(successStr, successReplace);

const catchStr = `          const isLastAttempt = attempt === maxRetriesPerKey;
          const isLastKey = keyIdx === keysToTry.length - 1;

          if (!isLastAttempt) {`;

const catchReplace = `          const isLastAttempt = attempt === maxRetriesPerKey;
          const isLastKey = keyIdx === keysToTry.length - 1;
          
          if (isLastAttempt) {
             setApiTrackerState(prev => ({ ...prev, failedKeys: [...prev.failedKeys, keyRecord.id] }));
          }

          if (!isLastAttempt) {`;
          
code = code.replace(catchStr, catchReplace);


const backoffStr = `            const backoffMs = attempt * 1500; // Backoff of 1.5s, 3s
            const statusMessage = \`API request failed with \${keyRecord.provider}. Retrying (Attempt \${attempt + 1}/\${maxRetriesPerKey}) in \${(backoffMs / 1000).toFixed(1)}s...\`;`;

const backoffReplace = `            const backoffMs = attempt * 1500; // Backoff of 1.5s, 3s
            const statusMessage = \`API request failed with \${keyRecord.provider}. Retrying (Attempt \${attempt + 1}/\${maxRetriesPerKey}) in \${(backoffMs / 1000).toFixed(1)}s...\`;
            setApiTrackerState(prev => ({ ...prev, statusMessage: \`ERR: TIMEOUT. RECONNECTING IN \${(backoffMs / 1000).toFixed(1)}s...\` }));`;

code = code.replace(backoffStr, backoffReplace);


const rotateStr = `            // Rotate keys
            const statusMessage = \`API Key failed. Rotating to next available key...\`;`;

const rotateReplace = `            // Rotate keys
            const statusMessage = \`API Key failed. Rotating to next available key...\`;
            setApiTrackerState(prev => ({ ...prev, statusMessage: 'ERR: NODE FAILED. REROUTING TO STANDBY NODE...' }));`;

code = code.replace(rotateStr, rotateReplace);


const throwStr = `    if (toastId) {
      removeToast(toastId);
    }
    setIsModalOpen(true);`;

const throwReplace = `    if (toastId) {
      removeToast(toastId);
    }
    setApiTrackerState(prev => ({ ...prev, visible: false }));
    setIsModalOpen(true);`;

code = code.replace(throwStr, throwReplace);

fs.writeFileSync('App.tsx', code);
console.log("Patched executeWithKeyRotation");
