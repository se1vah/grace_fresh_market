import 'server-only';

import { io, type Socket } from 'socket.io-client';

const CONNECTION_TIMEOUT_MS = 5_000;

type SocketState = {
  socket?: Socket;
  connecting?: Promise<Socket>;
};

const globalSocketState = globalThis as typeof globalThis & {
  __grassFreshMarketSocketState?: SocketState;
};

function getSocketState(): SocketState {
  globalSocketState.__grassFreshMarketSocketState ??= {};
  return globalSocketState.__grassFreshMarketSocketState;
}

function getSocketServerUrl(): string {
  return process.env.SOCKET_SERVER_URL || '';
}

function getSocket(): Socket {
  const state = getSocketState();

  if (!state.socket) {
    state.socket = io(getSocketServerUrl(), {
      autoConnect: false,
      reconnection: true,
    });
  }

  return state.socket;
}

function connectSocket(socket: Socket): Promise<Socket> {
  if (socket.connected) {
    return Promise.resolve(socket);
  }

  const state = getSocketState();
  if (state.connecting) {
    return state.connecting;
  }

  state.connecting = new Promise<Socket>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out connecting to Socket.IO server at ${getSocketServerUrl()}`,
        ),
      );
    }, CONNECTION_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
    };

    const onConnect = () => {
      cleanup();
      resolve(socket);
    };

    const onConnectError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onConnectError);
    socket.connect();
  }).finally(() => {
    state.connecting = undefined;
  });

  return state.connecting;
}

/**
 * Emits an event from Next.js server code to the configured Socket.IO server.
 * Connection errors are logged and intentionally do not fail the caller's API request.
 */
export async function emitSocketEvent(
  eventName: string,
  payload: unknown,
): Promise<void> {
  if (!eventName.trim()) {
    console.warn('[socket] Event was not emitted because its name is empty.');
    return;
  }

  try {
    const socket = getSocket();
    await connectSocket(socket);
    socket.emit(eventName, payload);
  } catch (error) {
    console.error(
      `[socket] Failed to emit "${eventName}" to ${getSocketServerUrl()}.`,
      error,
    );
  }
}
