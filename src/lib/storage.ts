"use client";

// IndexedDB wrapper for storing full-resolution artwork images
// (localStorage has 5MB limit; IndexedDB can hold much larger blobs)

const DB_NAME = "sonora-db";
const DB_VERSION = 1;
const STORE_ARTWORK = "artworks"; // id -> { id, image: dataURL, createdAt }

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ARTWORK)) {
        db.createObjectStore(STORE_ARTWORK, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveArtworkImage(
  id: string,
  dataUrl: string
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ARTWORK, "readwrite");
      tx.objectStore(STORE_ARTWORK).put({
        id,
        image: dataUrl,
        createdAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("IndexedDB save failed, falling back silently:", e);
  }
}

export async function getArtworkImage(
  id: string
): Promise<string | null> {
  try {
    const db = await openDB();
    const result = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_ARTWORK, "readonly");
      const req = tx.objectStore(STORE_ARTWORK).get(id);
      req.onsuccess = () =>
        resolve(req.result ? (req.result.image as string) : null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (e) {
    console.warn("IndexedDB get failed:", e);
    return null;
  }
}

export async function deleteArtworkImage(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ARTWORK, "readwrite");
      tx.objectStore(STORE_ARTWORK).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("IndexedDB delete failed:", e);
  }
}

export async function clearAllArtworkImages(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ARTWORK, "readwrite");
      tx.objectStore(STORE_ARTWORK).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("IndexedDB clear failed:", e);
  }
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if (typeof navigator !== "undefined" && "storage" in navigator) {
    try {
      const est = await navigator.storage.estimate();
      return {
        usage: est.usage || 0,
        quota: est.quota || 0,
      };
    } catch {
      return { usage: 0, quota: 0 };
    }
  }
  return { usage: 0, quota: 0 };
}
