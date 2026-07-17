const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Find processNotificationQueue and remove it
const startIdx = code.indexOf('async function processNotificationQueue(');
if (startIdx !== -1) {
    const startOfComment = code.lastIndexOf('// Reliable asynchronous Postgres job worker', startIdx);
    // It's at the end of the file almost, let's just delete till the end
    code = code.substring(0, startOfComment !== -1 ? startOfComment : startIdx);
    fs.writeFileSync('server.ts', code);
}
