# Network

Network and connectivity information.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/network
npx cap sync
```

## Usage

```typescript
import { Network } from '@capacitor/network';

const status = await Network.getStatus();
console.log('Connected:', status.connected, 'Type:', status.connectionType);

Network.addListener('networkStatusChange', (status) => {
  console.log('Network changed:', status.connectionType);
});
```

## Notes

- `connectionType`: `'wifi' | 'cellular' | 'none' | 'unknown'`.
