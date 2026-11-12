/**
 * IndexedDB Persistence Service for SQLStudio
 * Provides robust permanent client-side storage for:
 * 1. Current SQL script content
 * 2. Entire active database state (all user databases, schemas, tables, and rows)
 * 3. Query execution history
 * 4. User preferences (auto-save toggle, beforeunload warning toggle, splitter percent)
 */

import alasql from 'alasql';
import { sqlEngine, ColumnDefinition } from './sqlEngine';

const DB_NAME = 'SQLStudio_Storage_v1';
const DB_VERSION = 1;
const STORE_NAME = 'sqlstudio_store';

export interface SavedDatabaseDump {
  name: string;
  tables: Record<string, any[]>;
  metadata: Record<string, ColumnDefinition[]>;
}

export interface WorkspaceSnapshot {
  id: string; // 'current_workspace'
  sqlCode: string;
  activeDatabase: string;
  userDatabases: string[];
  databasesDump: SavedDatabaseDump[];
  queryHistory: string[];
  lastSavedAt: number;
  preventCloseEnabled: boolean;
  autoSaveEnabled: boolean;
  editorHeightPercent: number;
}

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  private openDb(): Promise<IDBDatabase> {
    if (!this.isSupported) {
      return Promise.reject(new Error('IndexedDB is not supported in this browser.'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        try {
          const request = window.indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
          };

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => {
            reject(request.error);
          };

          request.onblocked = () => {
            console.warn('IndexedDB opening was blocked.');
          };
        } catch (err) {
          reject(err);
        }
      });
    }

    return this.dbPromise;
  }

  /**
   * Save a key-value record in the store
   */
  public async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ id: key, payload: value, updatedAt: Date.now() });

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // Fallback gracefully
      console.warn(`IndexedDB setItem error for key "${key}":`, err);
    }
  }

  /**
   * Get a key-value record from the store
   */
  public async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result && 'payload' in req.result) {
            resolve(req.result.payload as T);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`IndexedDB getItem error for key "${key}":`, err);
      return null;
    }
  }

  /**
   * Capture a full snapshot of the SQL editor, entire AlaSQL database state, and settings
   */
  public captureFullSnapshot(
    sqlCode: string,
    queryHistory: string[],
    preventCloseEnabled: boolean,
    autoSaveEnabled: boolean,
    editorHeightPercent: number
  ): WorkspaceSnapshot {
    const activeDatabase = sqlEngine.getActiveDatabase();
    const dbList = sqlEngine.getDatabaseList();
    const userDatabases = dbList.map(d => d.name);

    const databasesDump: SavedDatabaseDump[] = [];

    for (const dbName of userDatabases) {
      const db = alasql.databases[dbName];
      if (!db || !db.tables) continue;

      const tablesData: Record<string, any[]> = {};
      for (const tName of Object.keys(db.tables)) {
        try {
          const rows: any = alasql(`SELECT * FROM ${dbName}.${tName};`);
          tablesData[tName] = Array.isArray(rows) ? rows : [];
        } catch {
          tablesData[tName] = [];
        }
      }

      const metadata = (sqlEngine as any).tableMetadata?.[dbName] || {};

      databasesDump.push({
        name: dbName,
        tables: tablesData,
        metadata
      });
    }

    return {
      id: 'current_workspace',
      sqlCode,
      activeDatabase,
      userDatabases,
      databasesDump,
      queryHistory,
      lastSavedAt: Date.now(),
      preventCloseEnabled,
      autoSaveEnabled,
      editorHeightPercent
    };
  }

  /**
   * Save the full workspace snapshot into IndexedDB
   */
  public async saveWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(snapshot);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to save snapshot to IndexedDB:', err);
    }
  }

  /**
   * Load the full workspace snapshot from IndexedDB
   */
  public async loadWorkspace(): Promise<WorkspaceSnapshot | null> {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get('current_workspace');

        req.onsuccess = () => {
          resolve((req.result as WorkspaceSnapshot) || null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to load snapshot from IndexedDB:', err);
      return null;
    }
  }

  /**
   * Restore AlaSQL databases and tables from snapshot
   */
  public restoreDatabasesFromSnapshot(snapshot: WorkspaceSnapshot): boolean {
    if (!snapshot.databasesDump || snapshot.databasesDump.length === 0) {
      return false;
    }

    try {
      for (const dbDump of snapshot.databasesDump) {
        const dbName = dbDump.name;
        if (!alasql.databases[dbName]) {
          try {
            alasql(`CREATE DATABASE ${dbName};`);
          } catch {
            // ignore
          }
        }

        // Restore table metadata in sqlEngine
        if (!(sqlEngine as any).tableMetadata) {
          (sqlEngine as any).tableMetadata = {};
        }
        (sqlEngine as any).tableMetadata[dbName] = dbDump.metadata || {};

        // Restore tables and data rows
        for (const [tName, rows] of Object.entries(dbDump.tables)) {
          try {
            alasql(`DROP TABLE IF EXISTS ${dbName}.${tName};`);
          } catch {
            // ignore
          }

          if (Array.isArray(rows) && rows.length > 0) {
            // Sample columns
            const firstRow = rows[0];
            const colDefs = Object.keys(firstRow).map(col => {
              const val = firstRow[col];
              const colType = typeof val === 'number' ? 'INT' : 'NVARCHAR(200)';
              return `${col} ${colType}`;
            }).join(', ');

            try {
              alasql(`CREATE TABLE ${dbName}.${tName} (${colDefs || 'ID INT'});`);
              for (const row of rows) {
                alasql.databases[dbName].tables[tName].data.push({ ...row });
              }
            } catch (tblErr) {
              console.warn(`Error recreating table ${dbName}.${tName}:`, tblErr);
            }
          } else {
            // Recreate empty table with known metadata or generic column
            const metaCols = dbDump.metadata?.[tName];
            let defs = 'ID INT';
            if (metaCols && metaCols.length > 0) {
              defs = metaCols.map(c => `${c.name} ${c.type || 'NVARCHAR(100)'}`).join(', ');
            }
            try {
              alasql(`CREATE TABLE ${dbName}.${tName} (${defs});`);
            } catch {
              // ignore
            }
          }
        }
      }

      // Add to userDatabases set
      const userDbsSet = (sqlEngine as any).userDatabases as Set<string>;
      if (userDbsSet) {
        for (const dbDump of snapshot.databasesDump) {
          userDbsSet.add(dbDump.name);
        }
      }

      // Restore active database
      if (snapshot.activeDatabase) {
        sqlEngine.setActiveDatabase(snapshot.activeDatabase);
      }

      return true;
    } catch (err) {
      console.error('Failed to restore databases from snapshot:', err);
      return false;
    }
  }

  /**
   * Clear all indexedDB records for this applet
   */
  public async clearAll(): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to clear IndexedDB:', err);
    }
  }
}

export const indexedDbService = new IndexedDbService();
