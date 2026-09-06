This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Socket.IO events

The app can emit events from server-side code to a Socket.IO server. Set
`SOCKET_SERVER_URL` in your environment (it defaults to `http://localhost:4000`).

Call the helper only after the related work has completed successfully:

```ts
import { emitSocketEvent } from '@/lib/socket';

await emitSocketEvent('data:changed', {
  resource: 'category',
  action: 'updated',
  id: categoryId,
  occurredAt: new Date().toISOString(),
});
```

`emitSocketEvent` is server-only and logs Socket.IO connection failures without
failing the API request that called it.

### Listening in client components

The root layout mounts `SocketProvider`, so client components can use `useSocket`
to inspect connection state or subscribe to an event. Set
`NEXT_PUBLIC_SOCKET_SERVER_URL` for a browser-accessible Socket.IO URL (it defaults
to `http://localhost:4000`).

```tsx
'use client';

import { useEffect } from 'react';
import { useSocket } from '@/components/providers/SocketProvider';

export function OrderNotifications() {
  const { isConnected, connectionError, subscribe } = useSocket();

  useEffect(() => {
    return subscribe('notify-order-to-shop', (payload) => {
      console.log('New order notification:', payload);
    });
  }, [subscribe]);

  return <p>{connectionError ?? (isConnected ? 'Connected' : 'Connecting...')}</p>;
}
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
