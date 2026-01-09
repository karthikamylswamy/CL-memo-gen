
import { CreditMemoData, SourceFile } from "../types";

const DB_NAME = "MapleCreditMemoDB";
const STORE_MEMO = "memo_data";
const STORE_FILES = "source_files";
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MEMO)) db.createObjectStore(STORE_MEMO);
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveMemo = async (data: CreditMemoData) => {
  const db = await openDB();
  const tx = db.transaction(STORE_MEMO, "readwrite");
  tx.objectStore(STORE_MEMO).put(data, "current_memo");
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const loadMemo = async (): Promise<CreditMemoData | null> => {
  const db = await openDB();
  const tx = db.transaction(STORE_MEMO, "readonly");
  const request = tx.objectStore(STORE_MEMO).get("current_memo");
  return new Promise((resolve) => (request.onsuccess = () => resolve(request.result || null)));
};

export const saveFile = async (file: SourceFile) => {
  const db = await openDB();
  const tx = db.transaction(STORE_FILES, "readwrite");
  tx.objectStore(STORE_FILES).put(file);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const loadFiles = async (): Promise<SourceFile[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_FILES, "readonly");
  const request = tx.objectStore(STORE_FILES).getAll();
  return new Promise((resolve) => (request.onsuccess = () => resolve(request.result || [])));
};

export const clearAllData = async () => {
  const db = await openDB();
  const tx = db.transaction([STORE_MEMO, STORE_FILES], "readwrite");
  tx.objectStore(STORE_MEMO).clear();
  tx.objectStore(STORE_FILES).clear();
  return new Promise((resolve) => (tx.oncomplete = resolve));
};
