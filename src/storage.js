import { migrateState, validateState } from './model.js';
export const STORAGE_KEY = 'eventflow-control-v1';
export function createLocalStorageAdapter(storage, key = STORAGE_KEY) {
  return {
    async getState() { const raw = storage.getItem(key); return raw === null ? null : migrateState(JSON.parse(raw)); },
    async saveState(state) { const errors = validateState(state); if (errors.length) throw new Error(errors.join('\n')); storage.setItem(key, JSON.stringify(state)); }
  };
}
export function createStorage(adapter) {
  return { getState: () => adapter.getState(), saveState: state => adapter.saveState(state) };
}
