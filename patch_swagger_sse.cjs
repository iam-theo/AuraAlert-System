const fs = require('fs');
let code = fs.readFileSync('server/swagger.ts', 'utf8');

const sseRoute = `
    "/api/events/subscribe": {
      get: {
        summary: "Subscribe to System Events (SSE)",
        tags: ["Event Bus Registry"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Server-Sent Events stream" }
        }
      }
    },`;

if (!code.includes('"/api/events/subscribe"')) {
    code = code.replace(/"\/api\/events\/registry": \{/g, sseRoute.trimStart() + '\n    "/api/events/registry": {');
    fs.writeFileSync('server/swagger.ts', code);
    console.log("Added events subscribe to swagger.");
} else {
    console.log("Already present.");
}
