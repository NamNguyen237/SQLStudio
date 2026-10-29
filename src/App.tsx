import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sparkles,
  GripHorizontal,
  Code2,
  BookOpen,
  Network
} from 'lucide-react';
import { sqlEngine, QueryExecutionResult, TableSchemaInfo, DatabaseInfo } from './services/sqlEngine';
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

  // Auto-save script and history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sqlstudio_saved_script', sqlCode);
    } catch {
      // ignore
    }
  }, [sqlCode]);

  useEffect(() => {
    try {
      localStorage.setItem('sqlstudio_query_history', JSON.stringify(queryHistory));
    } catch {
      // ignore
    }
  }, [queryHistory]);

  // Auto-save splitter height
  useEffect(() => {
    try {
      localStorage.setItem('sqlstudio_editor_height_percent', String(editorHeightPercent));
    } catch {
      // ignore
    }
  }, [editorHeightPercent]);

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
    } else {
      setSchemas([]);
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
    }, 40);
  }, [sqlCode, queryHistory, refreshDatabaseState]);

  const handleSelectDatabase = (dbName: string) => {
    sqlEngine.setActiveDatabase(dbName);
    refreshDatabaseState();
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
      activeDatabase: ''
    });
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

        {/* Zone 3: Assistant trigger */}
        <div className="flex items-center gap-2 shrink-0">
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
