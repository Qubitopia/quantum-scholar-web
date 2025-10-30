import { openDB } from 'idb';

/* IndexedDB schema (dbName: 'qs-tests')
 * version 1 stores 'tests' with keyPath 'test_id'
 * Each record shape:
 * {
 *   test_id: number,
 *   updated_at: number (last local write),
 *   remote_updated_at?: string | number (server created/updated timestamp if known),
 *   draft: { title, sections:[...] }
 * }
 */

const DB_NAME = 'qs-tests';
const DB_VERSION = 1;
const STORE = 'tests';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'test_id' });
        store.createIndex('updated_at', 'updated_at');
      }
    }
  });
}

export async function idbGetTest(test_id) {
  const db = await getDB();
  return db.get(STORE, Number(test_id));
}

export async function idbPutTest(record) {
  const db = await getDB();
  const now = Date.now();
  await db.put(STORE, { ...record, test_id: Number(record.test_id), updated_at: now });
  return now;
}

export async function idbUpsertDraft(test_id, mutateFn) {
  const db = await getDB();
  return db.transaction(STORE, 'readwrite').objectStore(STORE).get(Number(test_id)).then(current => {
    const base = current || { test_id: Number(test_id), draft: { title: 'Untitled Test', sections: [] }, updated_at: 0 };
    const nextDraft = mutateFn(base.draft);
    const updated = { ...base, draft: nextDraft, updated_at: Date.now() };
    return db.put(STORE, updated).then(() => updated);
  });
}

export async function idbDeleteTest(test_id) {
  const db = await getDB();
  return db.delete(STORE, Number(test_id));
}

export async function idbListTests() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function idbReplaceDraft(test_id, draft, remote_updated_at) {
  return idbPutTest({ test_id: Number(test_id), draft, remote_updated_at });
}
