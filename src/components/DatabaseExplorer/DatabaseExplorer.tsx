import React, { useState } from 'react';
import { 
  Database, 
  Table, 
  Columns, 
  Key, 
  Link, 
  RotateCcw, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  Code, 
  Network, 
  Trash2,
  Download
} from 'lucide-react';
import { TableSchemaInfo, DatabaseInfo } from '../../services/sqlEngine';

interface DatabaseExplorerProps {
  activeDatabase: string;
  databaseList: DatabaseInfo[];
  onSelectDatabase: (dbName: string) => void;
  schemas: TableSchemaInfo[];
  onResetAll: () => void;
  onInjectSql: (sql: string, autoRun?: boolean) => void;
  onOpenErDiagram: () => void;
  onExportDatabase?: () => void;
}

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  activeDatabase,
  databaseList,
  onSelectDatabase,
  schemas,
  onResetAll,
  onInjectSql,
  onOpenErDiagram,
  onExportDatabase
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const filteredSchemas = schemas.filter(t => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.columns.some(c => c.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 select-none">
      {/* Top Header / Database Selector */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>Cơ sở dữ liệu ({databaseList.length})</span>
          </span>
          <button
            onClick={onResetAll}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Xóa trắng tất cả CSDL để làm lại từ đầu"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Làm sạch CSDL</span>
          </button>
        </div>

        {/* Database Switcher Dropdown */}
        <div className="relative">
          <select
            value={activeDatabase}
            onChange={(e) => onSelectDatabase(e.target.value)}
            disabled={databaseList.length === 0}
            className="w-full py-1.5 px-2.5 bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded text-xs text-slate-200 font-medium focus:outline-none focus:border-sky-500 cursor-pointer font-mono"
          >
            {databaseList.length === 0 ? (
              <option value="">(Chưa có CSDL nào)</option>
            ) : (
              databaseList.map(db => (
                <option key={db.name} value={db.name}>
                  {db.name} ({db.tablesCount} bảng)
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[11px] text-slate-400">
          <span>Hiện tại: <strong className="text-sky-300 font-mono">{activeDatabase || 'Chưa chọn'}</strong></span>
          <span className="text-slate-500 font-mono">{schemas.length} bảng</span>
        </div>

        {/* Actions Buttons */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            onClick={onOpenErDiagram}
            disabled={schemas.length === 0}
            className="py-1 px-2 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
            title="Xem sơ đồ thực thể liên kết khóa chính - ngoại giữa các bảng"
          >
            <Network className="w-3.5 h-3.5 text-sky-400" />
            <span>Sơ đồ ERD</span>
          </button>

          <button
            onClick={onExportDatabase}
            disabled={schemas.length === 0}
            className="py-1 px-2 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
            title="Xuất toàn bộ cấu trúc bảng và dữ liệu CSDL hiện tại thành file .sql"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất CSDL</span>
          </button>
        </div>
      </div>

      {/* Table Filter / Search */}
      <div className="p-2 border-b border-slate-800 bg-slate-900/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-500" />
          <input
            type="text"
            placeholder="Lọc bảng hoặc cột..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Tables & Columns Tree View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {databaseList.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs space-y-2 mt-4">
            <Database className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
            <p className="text-slate-300 font-medium">Chưa có CSDL nào</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Môi trường đang hoàn toàn trống. Bạn hãy gõ câu lệnh tạo CSDL vào Editor:
            </p>
            <div className="p-2 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono text-sky-300 text-left">
              CREATE DATABASE QL_SinhVien;<br />
              USE QL_SinhVien;
            </div>
          </div>
        ) : schemas.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs space-y-2 mt-4">
            <Table className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
            <p className="text-slate-300 font-medium">CSDL '{activeDatabase}' chưa có bảng</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Hãy viết lệnh <code>CREATE TABLE</code> để tạo các bảng dữ liệu cho CSDL này.
            </p>
          </div>
        ) : (
          filteredSchemas.map(table => {
            const isExpanded = !!expandedTables[table.name];

            return (
              <div key={table.name} className="rounded border border-slate-800/60 bg-slate-950/40 overflow-hidden">
                {/* Table Title Row */}
                <div
                  onClick={() => toggleTable(table.name)}
                  className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-800/70 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <Table className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-semibold text-slate-200 truncate font-mono">{table.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono tabular-nums">
                      {table.rowCount} dòng
                    </span>
                  </div>
                </div>

                {/* Expanded Columns and Quick Actions */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/70 p-2 space-y-2">
                    {/* Table quick actions */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 pb-1 border-b border-slate-800/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInjectSql(`SELECT * FROM ${table.name};`, true);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded cursor-pointer transition-colors"
                        title="Xem toàn bộ dữ liệu bảng"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>SELECT *</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const colList = table.columns.map(c => c.name).join(', ');
                          onInjectSql(`INSERT INTO ${table.name} (${colList})\nVALUES (...);`, false);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                        title="Tạo câu lệnh INSERT mẫu"
                      >
                        <Code className="w-2.5 h-2.5" />
                        <span>INSERT</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInjectSql(`DROP TABLE ${table.name};`, false);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-850 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded cursor-pointer transition-colors ml-auto"
                        title="Tạo lệnh xóa bảng"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Columns List */}
                    <div className="space-y-1 pl-1">
                      {table.columns.length === 0 ? (
                        <div className="text-[11px] text-slate-500 italic pl-1">Chưa có cột nào</div>
                      ) : (
                        table.columns.map(col => (
                          <div
                            key={col.name}
                            onClick={() => {
                              onInjectSql(`SELECT ${col.name} FROM ${table.name};`, false);
                            }}
                            className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-slate-800/50 cursor-pointer text-slate-300 hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {col.isPk ? (
                                <span title="Khóa chính (Primary Key)">
                                  <Key className="w-3 h-3 text-amber-400 shrink-0" />
                                </span>
                              ) : col.isFk ? (
                                <span title={`Khóa ngoại -> ${col.fkTarget}`}>
                                  <Link className="w-3 h-3 text-emerald-400 shrink-0" />
                                </span>
                              ) : (
                                <Columns className="w-3 h-3 text-slate-500 shrink-0" />
                              )}
                              <span className="font-mono text-xs truncate">{col.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                              {col.type}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
        <span>T-SQL Engine</span>
        <span className="text-slate-500 font-mono">Dynamic</span>
      </div>
    </div>
  );
};
