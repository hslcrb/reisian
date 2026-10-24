export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}
export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}
export function pushHistory<T>(history: History<T>, present: T): History<T> {
  if (JSON.stringify(history.present) === JSON.stringify(present)) return history;
  return { past: [...history.past, history.present].slice(-60), present, future: [] };
}
export function undoHistory<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redoHistory<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
