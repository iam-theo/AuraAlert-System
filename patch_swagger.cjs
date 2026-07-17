const fs = require('fs');
let code = fs.readFileSync('server/swagger.ts', 'utf8');

const troubleshootRoute = `
    "/api/logs/{id}/troubleshoot": {
      post: {
        summary: "Troubleshoot Log Error via Gemini AI",
        tags: ["Logs & Analytics"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "AI diagnostic response" }
        }
      }
    },`;

if (!code.includes('"/api/logs/{id}/troubleshoot"')) {
    code = code.replace(/"\/api\/logs": \{/g, troubleshootRoute.trimStart() + '\n    "/api/logs": {');
    fs.writeFileSync('server/swagger.ts', code);
    console.log("Added troubleshoot to swagger.");
} else {
    console.log("Already present.");
}
