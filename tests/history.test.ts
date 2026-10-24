import { describe, expect, it } from 'vitest';
import { createHistory, pushHistory, undoHistory, redoHistory } from '../src/editor/history';
describe('visual editing history', () => {
  it('restores the actual document through undo and redo', () => {
    const first = { title: 'First', sections: ['a', 'b'] };
    const second = { title: 'Changed', sections: ['b', 'a'] };
    const edited = pushHistory(createHistory(first), second);
    expect(undoHistory(edited).present).toEqual(first);
    expect(redoHistory(undoHistory(edited)).present).toEqual(second);
  });
  it('clears the redo branch after a different edit', () => {
    const edited = pushHistory(createHistory('a'), 'b');
    const branched = pushHistory(undoHistory(edited), 'c');
    expect(branched.future).toEqual([]);
    expect(redoHistory(branched).present).toBe('c');
  });
  it('bounds snapshots and ignores equivalent updates', () => {
    let history = createHistory({ value: 0 });
    expect(pushHistory(history, { value: 0 })).toBe(history);
    for (let value = 1; value < 120; value++) history = pushHistory(history, { value });
    expect(history.past).toHaveLength(60);
    expect(history.present.value).toBe(119);
  });
});
