import React from 'react';
import { X, Network, Key, Link as LinkIcon, Database } from 'lucide-react';
import { TableSchemaInfo } from '../../services/sqlEngine';

interface ErDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDatabaseId: string;
  schemas: TableSchemaInfo[];
}

export const ErDiagramModal: React.FC<ErDiagramModalProps> = ({
  isOpen,
  onClose,
  activeDatabaseId,
  schemas
}) => {
  if (!isOpen) return null;

  const dbDisplayName = activeDatabaseId;

  // Extract relationships: table -> foreign key -> target table
  const relationships: { fromTable: string; fromCol: string; toTable: string; toCol: string }[] = [];

  for (const table of schemas) {
    for (const col of table.columns) {
      if (col.isFk && col.fkTarget) {
        const match = col.fkTarget.match(/([a-zA-Z0-9_]+)\(([a-zA-Z0-9_]+)\)/);
        if (match) {
          relationships.push({
            fromTable: table.name,
            fromCol: col.name,
            toTable: match[1],
            toCol: match[2]
          });
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Network className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Sơ đồ Thực thể - Quan hệ (ER Diagram): {dbDisplayName}
              </h3>
              <p className="text-xs text-slate-400">
                Mối liên kết khóa chính (PK) và khóa ngoại (FK) giữa các bảng quan hệ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950/70">
          {/* Relationship Badges Bar */}
          <div className="mb-6 p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Các mối liên kết quan hệ trong CSDL ({relationships.length}):
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {relationships.map((rel, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md font-mono text-[11.5px]">
                  <span className="text-emerald-400 font-semibold">{rel.fromTable}.{rel.fromCol}</span>
                  <span className="text-slate-500">─── 1:N ───►</span>
                  <span className="text-amber-400 font-semibold">{rel.toTable}.{rel.toCol}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tables Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemas.map(table => (
              <div 
                key={table.name}
                className="bg-slate-900 border border-slate-750 rounded-lg overflow-hidden shadow-lg flex flex-col"
              >
                {/* Table Header */}
                <div className="px-3 py-2 bg-sky-950/80 border-b border-sky-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-white text-xs">{table.name}</span>
                  </div>
                  <span className="text-[10px] text-sky-300 px-1.5 py-0.5 bg-sky-900/80 rounded font-mono">
                    {table.rowCount} dòng
                  </span>
                </div>

                <div className="p-2 text-[11px] text-slate-400 border-b border-slate-800/80 bg-slate-900/50 italic">
                  Bảng {table.name} · {table.columns.length} cột
                </div>

                {/* Columns List */}
                <div className="divide-y divide-slate-800/60 p-1 flex-1">
                  {table.columns.map(col => (
                    <div 
                      key={col.name}
                      className="px-2 py-1.5 flex items-center justify-between text-xs hover:bg-slate-800/50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {col.isPk ? (
                          <span className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
                            <Key className="w-3 h-3 fill-amber-400/20" />
                            <span className="text-[10px] font-mono">PK</span>
                          </span>
                        ) : col.isFk ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold shrink-0">
                            <LinkIcon className="w-3 h-3" />
                            <span className="text-[10px] font-mono">FK</span>
                          </span>
                        ) : (
                          <span className="w-7"></span>
                        )}
                        <span className={`font-mono ${col.isPk ? 'font-bold text-slate-100' : 'text-slate-200'} truncate`}>
                          {col.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {col.fkTarget && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            ➔ {col.fkTarget}
                          </span>
                        )}
                        <span className="text-[10.5px] text-slate-500 font-mono">
                          {col.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            Đóng sơ đồ
          </button>
        </div>
      </div>
    </div>
  );
};
