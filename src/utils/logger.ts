// Logger: leveled logging with off/console sink. Lightweight, no deps.
// Use in dev to trace systems; silence in production.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

class Logger {
  private level: LogLevel = 'info';

  setLevel(l: LogLevel): void {
    this.level = l;
  }

  private log(l: LogLevel, msg: string, ctx?: unknown): void {
    if (ORDER[l] < ORDER[this.level]) return;
    let fn: (...args: unknown[]) => void = console.log;
    if (l === 'error') fn = console.error;
    else if (l === 'warn') fn = console.warn;
    const tag = `[Praesidium ${l}]`;
    if (ctx !== undefined) fn(tag, msg, ctx);
    else fn(tag, msg);
  }

  debug(msg: string, ctx?: unknown): void { this.log('debug', msg, ctx); }
  info(msg: string, ctx?: unknown): void { this.log('info', msg, ctx); }
  warn(msg: string, ctx?: unknown): void { this.log('warn', msg, ctx); }
  error(msg: string, ctx?: unknown): void { this.log('error', msg, ctx); }
}

export const logger = new Logger();
