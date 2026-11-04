import { migrateState, validateState } from './model.js';
// Inactive: inject an authenticated SDK and a per-user document. No keys or CDN calls.
export function createFirestoreAdapter({ getDoc, setDoc, reference }) {
  return {
    async getState() { const snapshot = await getDoc(reference); return snapshot.exists() ? migrateState(snapshot.data()) : null; },
    async saveState(state) { const errors = validateState(state); if (errors.length) throw new Error(errors.join('\n')); await setDoc(reference, state); }
  };
}
