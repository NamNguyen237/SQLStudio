import React, { useState, useEffect, useCallback } from 'react';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sparkles
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

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-5 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0 select-none z-20">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title={sidebarOpen ? "Thu gọn thanh CSDL" : "Mở rộng thanh CSDL"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <a href="/" className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center text-white font-mono text-xs font-black shadow-xs">
              SQL
            </span>
            <span>SQLStudio</span>
          </a>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('editor')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'editor' ? 'text-sky-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Trình soạn thảo IDE
          </button>
          <button
            onClick={() => setActiveTab('handbook')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'handbook' ? 'text-sky-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Sổ tay Cú pháp T-SQL
          </button>
          <button
            onClick={() => setIsErModalOpen(true)}
            disabled={schemas.length === 0}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              schemas.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:text-slate-200'
            }`}
          >
            Sơ đồ quan hệ ERD
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsAssistantModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trợ lý cú pháp</span>
          </button>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Database Explorer (Collapsible) */}
        {sidebarOpen && (
          <aside className="w-64 md:w-72 h-full shrink-0 z-10 transition-all">
            <DatabaseExplorer
              activeDatabase={activeDatabase}
              databaseList={databaseList}
              onSelectDatabase={handleSelectDatabase}
              schemas={schemas}
              onResetAll={handleResetAll}
              onInjectSql={handleInjectSql}
              onOpenErDiagram={() => setIsErModalOpen(true)}
              onExportDatabase={handleExportDatabase}
            />
          </aside>
        )}

        {/* Center / Right Content Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {activeTab === 'editor' ? (
            /* Standard Full-Stack SQL IDE View (Split Vertical) */
            <div className="flex-1 flex flex-col h-full overflow-hidden p-2 gap-2">
              {/* Top Half: Real-time SQL Code Editor */}
              <div className="h-[52%] min-h-[220px]">
                <SqlEditor
                  value={sqlCode}
                  onChange={setSqlCode}
                  onExecute={handleExecute}
                  isExecuting={isExecuting}
                  activeDatabase={activeDatabase}
                  queryHistory={queryHistory}
                />
              </div>

              {/* Bottom Half: Results & Execution Analysis */}
              <div className="flex-1 min-h-[200px] overflow-hidden">
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

      {/* ER Diagram Modal */}
      <ErDiagramModal
        isOpen={isErModalOpen}
        onClose={() => setIsErModalOpen(false)}
        activeDatabaseId={activeDatabase}
        schemas={schemas}
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
