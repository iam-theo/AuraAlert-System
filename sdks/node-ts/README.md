# AuraAlert Node SDK

Official Node.js/TypeScript SDK for AuraAlert.

## Installation
`npm install @auraalert/node`

## Usage
```typescript
import { AuraAlert } from '@auraalert/node';
const aura = new AuraAlert('your-api-key');
await aura.sendNotification({ templateName: 'welcome', recipient: 'user@example.com' });
```
