import { describe, it, expect } from 'vitest';
import { parseBackup } from '../../src/ts/backup';
const stats = { current_chord: 'yellow', start_time: 1, updated_time: 2, correct: 1, identifications: 2, confusion_matrix: { red: { yellow: 1 } }, done: false };
const backup = () => ({ state: { profiles: { 101: { id: 101, name: 'Child', icon: 'fa-user', stats, current_chord: 'yellow', current_instrument: 'piano_old' } } }, history: { 101: { yellow: [stats] } } });
describe('portable progress', () => {
  it('migrates older CIM profiles and preserves session results', () => {
    const result = parseBackup(JSON.stringify(backup()));
    expect(result.profiles[0].current_instrument).toBe('piano_1');
    expect(result.profiles[0].target_number).toBe(25);
    expect(result.history['101'].yellow[0].correct).toBe(1);
  });
  it('rejects invalid nested session data before any import', () => {
    const data = backup();
    data.history['101'].yellow[0] = { ...stats, correct: 5 };
    expect(() => parseBackup(JSON.stringify(data))).toThrow();
  });
  it('rejects prototype keys and unsupported versions', () => {
    expect(() => parseBackup('{"__proto__":{}}')).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...backup(), format_version: 999 }))).toThrow();
  });
});
