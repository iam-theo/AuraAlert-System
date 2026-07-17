const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/async function startServer\(\) \{/, 'async function startServer() {\n  await initDatabase();\n');

fs.writeFileSync('server.ts', code);
