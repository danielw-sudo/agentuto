import { createElement } from 'react';
import type { ReactNode } from 'react';

const RE = /_\{([^}]+)\}|_([a-zA-Z0-9]+)|\^\{([^}]+)\}|\^([a-zA-Z0-9]+)/g;

export function formatFormula(s: string): ReactNode {
  if (!s || (!s.includes('_') && !s.includes('^'))) return s;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  RE.lastIndex = 0;
  while ((m = RE.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const sub = m[1] ?? m[2];
    parts.push(createElement(sub !== undefined ? 'sub' : 'sup', { key: k++ }, sub ?? m[3] ?? m[4]));
    last = RE.lastIndex;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts.length ? parts : s;
}
