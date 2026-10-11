import { invoke } from '@tauri-apps/api/core';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function safeStringify(item: any): string {
  if (item === undefined) return 'undefined';
  if (item === null) return 'null';
  if (typeof item === 'string') return item;
  if (item instanceof Error) return `${item.name}: ${item.message}\n${item.stack || ''}`;
  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
}

/**
 * Sends a log entry to the Rust backend logger, writing to app-installer.log in root
 */
export async function sendRemoteLog(level: LogLevel, component: string, message: string) {
  try {
    await invoke('log_client_message', {
      level,
      component,
      message,
    });
  } catch {
    // If running in standalone browser without Tauri backend, ignore failure
  }
}

/**
 * Installs global error and unhandled promise rejection listeners
 * to guarantee all frontend runtime errors are captured into the root log.
 */
export function setupClientLogger() {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  console.error = (...args: any[]) => {
    originalConsoleError(...args);
    const msg = args.map(safeStringify).join(' ');
    sendRemoteLog('error', 'console.error', msg);
  };

  console.warn = (...args: any[]) => {
    originalConsoleWarn(...args);
    const msg = args.map(safeStringify).join(' ');
    sendRemoteLog('warn', 'console.warn', msg);
  };

  console.info = (...args: any[]) => {
    originalConsoleInfo(...args);
    const msg = args.map(safeStringify).join(' ');
    sendRemoteLog('info', 'console.info', msg);
  };

  window.addEventListener('error', (event) => {
    const errorDetails = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
    sendRemoteLog('error', 'WINDOW_UNCAUGHT_ERROR', errorDetails);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = safeStringify(event.reason);
    sendRemoteLog('error', 'UNHANDLED_PROMISE_REJECTION', reason);
  });

  sendRemoteLog('info', 'CLIENT_BOOT', `Frontend React 19 application loaded at ${new Date().toISOString()}`);
}
