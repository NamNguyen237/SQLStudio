import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sparkles,
  GripHorizontal,
  Code2,
  BookOpen,
  Network,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Save,
  Check
} from 'lucide-react';
import { sqlEngine, QueryExecutionResult, TableSchemaInfo, DatabaseInfo, StoredProcedureInfo } from './services/sqlEngine';
import { indexedDbService } from './services/indexedDbService';
import { SqlEditor } from './components/Editor/SqlEditor';
import { ResultsPanel } from './components/Results/ResultsPanel';
import { DatabaseExplorer } from './components/DatabaseExplorer/DatabaseExplorer';
import { HandbookView } from './components/Handbook/HandbookView';
import { ErDiagramModal } from './components/DatabaseExplorer/ErDiagramModal';
import { SyntaxGuide } from './components/Assistant/SyntaxGuide';
import { SqlAssistantModal } from './components/Assistant/SqlAssistantModal';

const DEFAULT_CLEAN_SCRIPT = `-- Viết câu lệnh SQL của bạn tại đây:
-- Khi bạn chạy lệnh CREATE DATABASE, CSDL sẽ tự động xuất hiện ở thanh bên trái!

CREATE DATABASE QL_SinhVien;
GO

USE QL_SinhVien;
GO

CREATE TABLE SinhVien (
  MaSV VARCHAR(10) PRIMARY KEY,
  HoTen NVARCHAR(50) NOT NULL,
  DiemTB FLOAT
);
GO

INSERT INTO SinhVien (MaSV, HoTen, DiemTB) 
VALUES 
('SV01', N'Nguyễn Văn A', 8.5),
('SV02', N'Trần Thị B', 9.0);
GO

SELECT * FROM SinhVien;`;

const SAMPLE_QLSV_RELATIONSHIPS = `CREATE DATABASE QLSV;
GO
USE QLSV;
GO

CREATE TABLE DMKHOA (
  MaKH CHAR(2) NOT NULL PRIMARY KEY,
  TenKH VARCHAR(50)
);
GO

CREATE TABLE DMMH (
  MaMH CHAR(2) NOT NULL PRIMARY KEY,
  TenMH VARCHAR(50),
  HeSo INT NOT NULL
);
GO

CREATE TABLE DMSV (
  MaSV CHAR(3) NOT NULL PRIMARY KEY,
  TenSV VARCHAR(50),
  Nam BIT,
  MaKH CHAR(2) NOT NULL,
  SoMonDK INT,
  DiemTB FLOAT,
  CONSTRAINT FK_MaKH FOREIGN KEY(MaKH) REFERENCES DMKHOA(MaKH)
);
GO

CREATE TABLE KETQUA (
  MaSV CHAR(3) NOT NULL,
  MaMH CHAR(2) NOT NULL,
  Diem FLOAT,
  CONSTRAINT PK_KETQUA PRIMARY KEY(MaSV, MaMH),
  CONSTRAINT FK_MaSV FOREIGN KEY(MaSV) REFERENCES DMSV(MaSV),
  CONSTRAINT FK_MaMH FOREIGN KEY(MaMH) REFERENCES DMMH(MaMH)
);
GO

INSERT INTO DMKHOA (MaKH, TenKH) VALUES ('CN', 'Cong Nghe Thong Tin'), ('KT', 'Kinh Te');
GO
INSERT INTO DMMH (MaMH, TenMH, HeSo) VALUES ('CS', 'Co So Du Lieu', 3), ('TR', 'Tri Tue Nhan Tao', 4);
GO
INSERT INTO DMSV (MaSV, TenSV, Nam, MaKH, SoMonDK, DiemTB) VALUES 
('S01', 'Nguyen Van An', 1, 'CN', 2, 8.5),
('S02', 'Tran Thi Binh', 0, 'CN', 2, 9.0);
GO
INSERT INTO KETQUA (MaSV, MaMH, Diem) VALUES 
('S01', 'CS', 8.5),
('S01', 'TR', 9.0),
('S02', 'CS', 9.5);
GO

SELECT * FROM DMSV;
GO`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'handbook'>('editor');
  const [activeDatabase, setActiveDatabase] = useState<string>('');
  const [databaseList, setDatabaseList] = useState<DatabaseInfo[]>([]);
  const [schemas, setSchemas] = useState<TableSchemaInfo[]>([]);
  const [storedProcedures, setStoredProcedures] = useState<StoredProcedureInfo[]>([]);
  
  // Local persistence: load saved script from localStorage if exists
  const [sqlCode, setSqlCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sqlstudio_saved_script');
      return saved !== null ? saved : DEFAULT_CLEAN_SCRIPT;
    } catch {
      return DEFAULT_CLEAN_SCRIPT;
    }
  });

  const [executionResult, setExecutionResult] = useState<QueryExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Local persistence: query history
  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sqlstudio_query_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Responsive sidebar: default open on desktop, closed initially on mobile
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Resizable splitter height state (percentage)
  const [editorHeightPercent, setEditorHeightPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sqlstudio_editor_height_percent');
      return saved ? Math.min(Math.max(parseFloat(saved), 15), 85) : 50;
    } catch {
      return 50;
    }
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isErModalOpen, setIsErModalOpen] = useState<boolean>(false);
  const [isSyntaxGuideOpen, setIsSyntaxGuideOpen] = useState<boolean>(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState<boolean>(false);

  // IndexedDB Persistence and Protection States
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
  
  // Auto-save toggle (persisted)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sqlstudio_autosave_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Anti-close / Beforeunload warning toggle (persisted)
  const [preventCloseEnabled, setPreventCloseEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sqlstudio_prevent_close_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Track if there are unsaved modifications
  const hasUnsavedChanges = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialRestoreDone = useRef<boolean>(false);

  // Restore initial snapshot from IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    const restoreFromIndexedDb = async () => {
      try {
        const snapshot = await indexedDbService.loadWorkspace();
        if (snapshot && isMounted) {
          if (snapshot.sqlCode) {
            setSqlCode(snapshot.sqlCode);
          }
          if (Array.isArray(snapshot.queryHistory) && snapshot.queryHistory.length > 0) {
            setQueryHistory(snapshot.queryHistory);
          }
          if (typeof snapshot.preventCloseEnabled === 'boolean') {
            setPreventCloseEnabled(snapshot.preventCloseEnabled);
          }
          if (typeof snapshot.autoSaveEnabled === 'boolean') {
            setAutoSaveEnabled(snapshot.autoSaveEnabled);
          }
          if (typeof snapshot.editorHeightPercent === 'number') {
            setEditorHeightPercent(snapshot.editorHeightPercent);
          }

          // Restore AlaSQL database instances and rows
          if (snapshot.databasesDump && snapshot.databasesDump.length > 0) {
            indexedDbService.restoreDatabasesFromSnapshot(snapshot);
            refreshDatabaseState();
          }

          if (snapshot.lastSavedAt) {
            setLastSavedTimestamp(snapshot.lastSavedAt);
          }
        }
      } catch (err) {
        console.warn('Error reading from IndexedDB on startup:', err);
      } finally {
        isInitialRestoreDone.current = true;
      }
    };

    restoreFromIndexedDb();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save full workspace to IndexedDB
  const performSaveToIndexedDb = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const snapshot = indexedDbService.captureFullSnapshot(
        sqlCode,
        queryHistory,
        preventCloseEnabled,
        autoSaveEnabled,
        editorHeightPercent
      );
      await indexedDbService.saveWorkspace(snapshot);

      // Also mirror to localStorage for redundancy
      try {
        localStorage.setItem('sqlstudio_saved_script', sqlCode);
        localStorage.setItem('sqlstudio_query_history', JSON.stringify(queryHistory));
        localStorage.setItem('sqlstudio_autosave_enabled', String(autoSaveEnabled));
        localStorage.setItem('sqlstudio_prevent_close_enabled', String(preventCloseEnabled));
        localStorage.setItem('sqlstudio_editor_height_percent', String(editorHeightPercent));
      } catch {
        // ignore
      }

      hasUnsavedChanges.current = false;
      setSaveStatus('saved');
      setLastSavedTimestamp(Date.now());
    } catch (err) {
      console.error('Failed to save to IndexedDB:', err);
      setSaveStatus('unsaved');
    }
  }, [sqlCode, queryHistory, preventCloseEnabled, autoSaveEnabled, editorHeightPercent]);

  // Handle changes to sqlCode: mark unsaved and schedule auto-save if enabled
  useEffect(() => {
    if (!isInitialRestoreDone.current) return;

    hasUnsavedChanges.current = true;
    setSaveStatus('unsaved');

    if (autoSaveEnabled) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        performSaveToIndexedDb();
      }, 800); // 800ms debounce
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [sqlCode, autoSaveEnabled, performSaveToIndexedDb]);

  // Prevent closing / reloading page if preventCloseEnabled is true
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!preventCloseEnabled) return;

      // If user enabled protection, warn them before closing
      // Modern browsers display their standard confirmation modal
      const confirmationMessage = 'Bạn có chắc chắn muốn rời khỏi SQLStudio? Hãy chắc chắn rằng bạn đã lưu các câu lệnh SQL đang làm.';
      e.preventDefault();
      e.returnValue = confirmationMessage;
      return confirmationMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [preventCloseEnabled]);

  // Toggle handlers with persistence
  const handleToggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sqlstudio_autosave_enabled', String(next));
      } catch {
        // ignore
      }
      if (next) {
        // Immediately save current state when turned on
        setTimeout(() => performSaveToIndexedDb(), 50);
      }
      return next;
    });
  }, [performSaveToIndexedDb]);

  const handleTogglePreventClose = useCallback(() => {
    setPreventCloseEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sqlstudio_prevent_close_enabled', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Pointer event handlers for draggable splitter (Touch + Mouse)
  const handleSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handleSplitterPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const totalHeight = rect.height;
    if (totalHeight > 0) {
      const newPercent = Math.min(Math.max((offsetY / totalHeight) * 100, 15), 85);
      setEditorHeightPercent(newPercent);
    }
  };

  const handleSplitterPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
  };

  // Refresh database list and current schema
  const refreshDatabaseState = useCallback(() => {
    const dbs = sqlEngine.getDatabaseList();
    setDatabaseList(dbs);

    const currentDb = sqlEngine.getActiveDatabase();
    setActiveDatabase(currentDb);

    if (currentDb) {
      const currentSchemas = sqlEngine.getDatabaseSchema(currentDb);
      setSchemas(currentSchemas);
      const currentProcs = sqlEngine.getStoredProcedures(currentDb);
      setStoredProcedures(currentProcs);
    } else {
      setSchemas([]);
      setStoredProcedures([]);
    }
  }, []);

  useEffect(() => {
    refreshDatabaseState();
  }, [refreshDatabaseState]);

  // Execute query handler
  const handleExecute = useCallback(() => {
    if (!sqlCode.trim()) return;

    setIsExecuting(true);
    setTimeout(() => {
      const res = sqlEngine.execute(sqlCode);
      setExecutionResult(res);
      setIsExecuting(false);

      if (sqlCode.trim() && !queryHistory.includes(sqlCode.trim())) {
        setQueryHistory(prev => [sqlCode.trim(), ...prev.slice(0, 9)]);
      }

      refreshDatabaseState();

      // Trigger auto-save of database state into IndexedDB after execution
      if (autoSaveEnabled) {
        performSaveToIndexedDb();
      }
    }, 40);
  }, [sqlCode, queryHistory, refreshDatabaseState, autoSaveEnabled, performSaveToIndexedDb]);

  const handleSelectDatabase = (dbName: string) => {
    sqlEngine.setActiveDatabase(dbName);
    refreshDatabaseState();
    if (autoSaveEnabled) {
      performSaveToIndexedDb();
    }
  };

  const handleResetAll = () => {
    sqlEngine.resetAllDatabases();
    refreshDatabaseState();
    setSqlCode('-- Nhập câu lệnh SQL tại đây (Ví dụ: CREATE DATABASE QL_SinhVien;)');
    setExecutionResult({
      success: true,
      data: null,
      columns: [],
      rowCount: 0,
      executionTimeMs: 1,
      message: 'Đã làm sạch toàn bộ môi trường. Chưa có CSDL nào được tạo.',
      queryType: 'OTHER',
      activeDatabase: '',
      resultSets: [],
      messages: ['Đã làm sạch toàn bộ môi trường.']
    });
    // Clear and re-save fresh empty snapshot in IndexedDB
    setTimeout(() => {
      performSaveToIndexedDb();
    }, 50);
  };

  // Export full database to .sql file
  const handleExportDatabase = () => {
    if (!activeDatabase) return;
    const script = sqlEngine.exportDatabaseToSqlScript(activeDatabase);
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDatabase}_backup.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInjectSql = (sql: string, autoRun: boolean = false) => {
    setSqlCode(sql);
    if (autoRun) {
      setTimeout(() => {
        const res = sqlEngine.execute(sql);
        setExecutionResult(res);
        if (!queryHistory.includes(sql.trim())) {
          setQueryHistory(prev => [sql.trim(), ...prev.slice(0, 9)]);
        }
        refreshDatabaseState();
      }, 50);
    }
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Top Bar: Touch-optimized, responsive for mobile, tablet & desktop */}
      <header className="flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-900 border-b border-slate-800 shrink-0 select-none z-20">
        {/* Zone 1: Logo & Sidebar toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer touch-manipulation"
            title={sidebarOpen ? "Thu gọn thanh CSDL" : "Mở thanh CSDL"}
            aria-label="Chuyển đổi thanh CSDL"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <a href="/" className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2">
            <span className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center text-white font-mono text-xs font-black shadow-xs">
              SQL
            </span>
            <span className="hidden xs:inline">SQLStudio</span>
          </a>
        </div>

        {/* Zone 2: Responsive Navigation Switcher (Works seamlessly on Mobile + Desktop) */}
        <nav className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all cursor-pointer touch-manipulation ${
              activeTab === 'editor' 
                ? 'bg-sky-600 text-white font-semibold shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trình soạn thảo</span>
            <span className="sm:hidden text-[11px]">IDE</span>
          </button>
          <button
            onClick={() => setActiveTab('handbook')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all cursor-pointer touch-manipulation ${
              activeTab === 'handbook' 
                ? 'bg-sky-600 text-white font-semibold shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sổ tay T-SQL</span>
            <span className="sm:hidden text-[11px]">Sổ tay</span>
          </button>
          <button
            onClick={() => setIsErModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all cursor-pointer touch-manipulation text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title="Xem sơ đồ liên kết quan hệ các bảng (Microsoft Access / SSMS Relationships)"
          >
            <Network className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Sơ đồ quan hệ (Access)</span>
            <span className="md:hidden text-[11px]">Sơ đồ</span>
          </button>
        </nav>

        {/* Zone 3: Storage state & Assistant trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Storage Indicator Badge */}
          <button
            onClick={performSaveToIndexedDb}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer ${
              saveStatus === 'saved'
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                : saveStatus === 'saving'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 animate-pulse'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
            }`}
            title="Lưu trữ vĩnh viễn trong IndexedDB: Tự động lưu mọi thay đổi đề phòng mất điện hoặc sập máy (Bấm để lưu thủ công ngay)"
          >
            <span className={`w-2 h-2 rounded-full ${saveStatus === 'saving' ? 'bg-amber-400 animate-ping' : saveStatus === 'unsaved' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-[10px]">
              {saveStatus === 'saving' ? 'Đang lưu...' : saveStatus === 'unsaved' ? 'Chưa lưu (Auto)' : 'IndexedDB: Đã lưu'}
            </span>
          </button>

          {/* Quick Anti-close Protection toggle */}
          <button
            onClick={handleTogglePreventClose}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer touch-manipulation ${
              preventCloseEnabled 
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50' 
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title={preventCloseEnabled ? "Chế độ chống tắt trang: ĐANG BẬT (Hiện xác nhận trước khi đóng tab/reload) - Bấm để Tắt" : "Chế độ chống tắt trang: ĐÃ TẮT - Bấm để Bật"}
          >
            {preventCloseEnabled ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden lg:inline text-[11px]">Chống tắt trang</span>
          </button>

          <button
            onClick={() => setIsAssistantModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation active:scale-95"
            title="Mở trợ lý cú pháp T-SQL"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Trợ lý cú pháp</span>
            <span className="sm:hidden text-[11px]">Trợ lý</span>
          </button>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for sidebar drawer */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Left Column: Database Explorer (Collapsible & Mobile Drawer) */}
        {sidebarOpen && (
          <aside className="fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] h-full shadow-2xl md:shadow-none md:relative md:w-64 lg:w-72 md:z-10 transition-all shrink-0">
            <DatabaseExplorer
              activeDatabase={activeDatabase}
              databaseList={databaseList}
              onSelectDatabase={(db) => {
                handleSelectDatabase(db);
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              schemas={schemas}
              storedProcedures={storedProcedures}
              onResetAll={handleResetAll}
              onInjectSql={(sql, autoRun) => {
                handleInjectSql(sql, autoRun);
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              onOpenErDiagram={() => {
                setIsErModalOpen(true);
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              onExportDatabase={handleExportDatabase}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        )}

        {/* Center / Right Content Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {activeTab === 'editor' ? (
            /* Standard Full-Stack SQL IDE View (Split Vertical with Drag Resize) */
            <div 
              ref={workspaceRef}
              className="flex-1 flex flex-col h-full overflow-hidden p-1.5 sm:p-2 select-none relative"
            >
              {/* Top Half: Real-time SQL Code Editor */}
              <div 
                style={{ height: `calc(${editorHeightPercent}% - 8px)` }}
                className="min-h-[90px] w-full transition-[height] duration-75"
              >
                <SqlEditor
                  value={sqlCode}
                  onChange={setSqlCode}
                  onExecute={handleExecute}
                  isExecuting={isExecuting}
                  activeDatabase={activeDatabase}
                  queryHistory={queryHistory}
                  onManualSave={performSaveToIndexedDb}
                  saveStatus={saveStatus}
                  autoSaveEnabled={autoSaveEnabled}
                  onToggleAutoSave={handleToggleAutoSave}
                  preventCloseEnabled={preventCloseEnabled}
                  onTogglePreventClose={handleTogglePreventClose}
                />
              </div>

              {/* Vertical Resizable Splitter (Mouse + Touch Drag Support) */}
              <div
                onPointerDown={handleSplitterPointerDown}
                onPointerMove={handleSplitterPointerMove}
                onPointerUp={handleSplitterPointerUp}
                onDoubleClick={() => setEditorHeightPercent(50)}
                className={`group relative flex items-center justify-center h-4 w-full cursor-row-resize select-none touch-none shrink-0 my-0.5 z-10 transition-colors ${
                  isDragging ? 'bg-sky-500/20' : 'hover:bg-slate-800/80'
                }`}
                title="Kéo lên/xuống để chỉnh kích thước Editor & Kết quả (Nhấp đúp để đặt lại 50/50)"
              >
                {/* Visual line */}
                <div className={`h-[2px] w-full transition-colors ${
                  isDragging ? 'bg-sky-400' : 'bg-slate-800 group-hover:bg-sky-500/70'
                }`} />

                {/* Drag handle pill */}
                <div className={`absolute flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 border text-[10px] font-mono shadow-sm transition-all ${
                  isDragging 
                    ? 'border-sky-400 text-sky-300 scale-105 shadow-sky-950/50' 
                    : 'border-slate-700 text-slate-400 group-hover:border-slate-600 group-hover:text-slate-200'
                }`}>
                  <GripHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {Math.round(editorHeightPercent)}% / {100 - Math.round(editorHeightPercent)}%
                  </span>
                </div>
              </div>

              {/* Bottom Half: Results & Execution Analysis */}
              <div 
                style={{ height: `calc(${100 - editorHeightPercent}% - 8px)` }}
                className="min-h-[90px] w-full overflow-hidden transition-[height] duration-75"
              >
                <ResultsPanel
                  result={executionResult}
                  activeDatabase={activeDatabase}
                />
              </div>
            </div>
          ) : (
            /* Enhanced Full-page University Handbook View */
            <HandbookView
              onInjectCode={handleInjectSql}
              onOpenEditor={() => setActiveTab('editor')}
            />
          )}
        </main>
      </div>

      {/* ER Diagram Modal (Microsoft Access / SSMS Style) */}
      <ErDiagramModal
        isOpen={isErModalOpen}
        onClose={() => setIsErModalOpen(false)}
        activeDatabaseId={activeDatabase}
        schemas={schemas}
        onInjectSample={() => {
          handleInjectSql(SAMPLE_QLSV_RELATIONSHIPS, true);
        }}
      />

      {/* Quick Syntax Guide Modal */}
      <SyntaxGuide
        isOpen={isSyntaxGuideOpen}
        onClose={() => setIsSyntaxGuideOpen(false)}
        onInsertCode={handleInjectSql}
      />

      {/* Intelligent SQL Assistant Modal */}
      <SqlAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        currentSql={sqlCode}
        activeDatabase={activeDatabase}
      />
    </div>
  );
}
