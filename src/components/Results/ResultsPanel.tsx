import React, { useState, useMemo } from 'react';
import { 
  Table as TableIcon, 
  Terminal, 
  GitCommit, 
  Download, 
  Copy, 
  Check, 
  Search, 
  ArrowUpDown, 
  AlertCircle, 
  FileSpreadsheet,
  Printer,
  Layers,
  Eye,
  X,
  Maximize2
} from 'lucide-react';
import { QueryExecutionResult, ExecutionPlanNode, SingleResultSet } from '../../services/sqlEngine';

interface ResultsPanelProps {
  result: QueryExecutionResult | null;
  activeDatabase: string;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, activeDatabase }) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'messages' | 'plan'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Multi-table view mode: 'consecutive' (stacked all tables) vs 'single' (one table with tabs)
  const [viewMode, setViewMode] = useState<'consecutive' | 'single'>('consecutive');
  const [selectedTableIdx, setSelectedTableIdx] = useState<number>(0);

  // Sorting state per table index: { [tableIdx]: { col: string, dir: 'asc' | 'desc' } }
  const [tableSorts, setTableSorts] = useState<Record<number, { col: string; dir: 'asc' | 'desc' }>>({});

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printTarget, setPrintTarget] = useState<'all' | number>('all');

  // Normalize result sets
  const resultSets: SingleResultSet[] = useMemo(() => {
    if (!result) return [];
    if (result.resultSets && result.resultSets.length > 0) {
      return result.resultSets;
    }
    if (result.data && result.data.length >= 0 && result.columns) {
      return [{
        id: 'result-1',
        statement: result.queryType === 'SELECT' ? 'SELECT' : 'Kết quả truy vấn',
        data: result.data,
        columns: result.columns,
        rowCount: result.rowCount,
        executionPlan: result.executionPlan
      }];
    }
    return [];
  }, [result]);

  const totalRowsCount = useMemo(() => {
    return resultSets.reduce((sum, r) => sum + r.rowCount, 0);
  }, [resultSets]);

  // Adjust view mode and selected table when result changes
  React.useEffect(() => {
    if (result && !result.success) {
      setActiveTab('messages');
    } else if (resultSets.length > 0) {
      setActiveTab('grid');
      if (resultSets.length > 1) {
        setViewMode('consecutive');
      } else {
        setViewMode('single');
      }
      setSelectedTableIdx(0);
    } else if (result && !result.data) {
      setActiveTab('messages');
    }
  }, [result, resultSets.length]);

  const handleSort = (tableIdx: number, col: string) => {
    setTableSorts(prev => {
      const current = prev[tableIdx];
      if (current && current.col === col) {
        return {
          ...prev,
          [tableIdx]: { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        };
      }
      return {
        ...prev,
        [tableIdx]: { col, dir: 'asc' }
      };
    });
  };

  // Helper to filter and sort rows of a specific result set
  const getProcessedRows = (rs: SingleResultSet, idx: number) => {
    let rows = [...rs.data];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(val =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(term)
        )
      );
    }

    // Sort
    const sort = tableSorts[idx];
    if (sort && sort.col) {
      rows.sort((a, b) => {
        const valA = a[sort.col];
        const valB = b[sort.col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sort.dir === 'asc' ? valA - valB : valB - valA;
        }
        return sort.dir === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  };

  // Export single table CSV
  const exportTableCSV = (rs: SingleResultSet, index: number) => {
    if (!rs.data || rs.data.length === 0) return;
    const headers = rs.columns.join(',');
    const rows = rs.data.map(row =>
      rs.columns.map(col => {
        const cell = row[col] === null || row[col] === undefined ? '' : String(row[col]);
        return `"${cell.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bang_${index + 1}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export all tables
  const exportAllCSV = () => {
    if (resultSets.length === 0) return;
    resultSets.forEach((rs, i) => {
      exportTableCSV(rs, i);
    });
  };

  // Copy Markdown
  const copyAsMarkdown = (tableIdx?: number) => {
    const targets = tableIdx !== undefined ? [resultSets[tableIdx]] : resultSets;
    if (targets.length === 0) return;

    const mdBlocks = targets.map((rs, i) => {
      const idxDisplay = tableIdx !== undefined ? tableIdx + 1 : i + 1;
      const title = `### Bảng ${idxDisplay}: ${rs.statement || 'Kết quả truy vấn'}\n*Số dòng: ${rs.rowCount}*`;
      if (rs.columns.length === 0) return `${title}\n\n(Bảng không có cột)`;
      const headers = `| ${rs.columns.join(' | ')} |`;
      const separator = `| ${rs.columns.map(() => '---').join(' | ')} |`;
      const rows = rs.data.map(row =>
        `| ${rs.columns.map(col => row[col] ?? 'NULL').join(' | ')} |`
      ).join('\n');
      return `${title}\n\n${headers}\n${separator}\n${rows || '| (Trống) |'}`;
    });

    const fullMd = mdBlocks.join('\n\n---\n\n');
    navigator.clipboard.writeText(fullMd);
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 1500);
  };

  // Open print modal
  const openPrint = (target: 'all' | number = 'all') => {
    setPrintTarget(target);
    setIsPrintModalOpen(true);
  };

  // Direct trigger window.print
  const handlePrintDocument = () => {
    window.print();
  };

  const renderExecutionPlanNode = (node: ExecutionPlanNode, depth: number = 0) => {
    return (
      <div key={node.id} className="relative flex flex-col gap-2 my-2 ml-4">
        <div className="flex items-center gap-3 p-3 bg-slate-800/80 border border-slate-700/80 rounded-md">
          <div className="w-8 h-8 rounded bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 font-bold shrink-0">
            <GitCommit className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-200 text-xs">{node.name}</span>
              <span className="text-[11px] font-mono text-amber-400 font-medium">
                Chi phí: {node.costPercent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{node.description}</p>
            {node.details && (
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                {Object.entries(node.details).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700/50 rounded">
                    {k}: <strong className="text-slate-200">{v}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="border-l border-slate-700 ml-4 pl-2 flex flex-col gap-2">
            {node.children.map(child => renderExecutionPlanNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render a single table grid element
  const renderTableGrid = (rs: SingleResultSet, idx: number, isConsecutive: boolean = false) => {
    const processedRows = getProcessedRows(rs, idx);
    const sort = tableSorts[idx];

    return (
      <div 
        key={rs.id || idx} 
        className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-sm ${
          isConsecutive ? 'mb-4 print-page-break' : 'h-full'
        }`}
      >
        {/* Table Item Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-xs gap-2 shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-800/80 rounded font-semibold text-[11px] font-mono shrink-0">
              Bảng #{idx + 1}
            </span>
            <span className="font-mono text-slate-300 truncate text-[11.5px]" title={rs.statement}>
              {rs.statement || 'SELECT'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              <strong className="text-slate-200">{rs.rowCount}</strong> dòng, <strong className="text-slate-200">{rs.columns.length}</strong> cột
            </span>

            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                onClick={() => exportTableCSV(rs, idx)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition-colors cursor-pointer"
                title="Tải bảng này dạng CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => copyAsMarkdown(idx)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                title="Sao chép bảng này dạng Markdown"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => openPrint(idx)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded transition-colors cursor-pointer"
                title="In riêng bảng này"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-auto max-h-[460px]">
          {rs.columns.length === 0 ? (
            <div className="py-8 text-center text-slate-500 italic text-xs">
              Bảng không có cấu trúc cột để hiển thị.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/95 sticky top-0 z-10 border-b border-slate-800 text-slate-300 select-none">
                <tr>
                  <th className="py-1.5 px-3 w-10 text-center font-mono text-[11px] text-slate-500 border-r border-slate-800 bg-slate-900/95">
                    #
                  </th>
                  {rs.columns.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(idx, col)}
                      className="py-1.5 px-3 font-semibold font-mono tracking-tight cursor-pointer hover:bg-slate-800/80 border-r border-slate-800/80 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{col}</span>
                        <ArrowUpDown className={`w-3 h-3 ${sort?.col === col ? 'text-sky-400' : 'text-slate-600'}`} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {processedRows.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={rs.columns.length + 1} 
                      className="py-6 text-center text-slate-500 italic text-xs font-sans"
                    >
                      {rs.data.length === 0 ? '0 dòng kết quả (bảng dữ liệu đang trống)' : 'Không tìm thấy dòng nào khớp với từ khóa lọc'}
                    </td>
                  </tr>
                ) : (
                  processedRows.map((row, rowIdx) => (
                    <tr 
                      key={rowIdx} 
                      className="hover:bg-slate-800/40 transition-colors font-mono text-[12.5px] border-b border-slate-850/60"
                    >
                      <td className="py-1.5 px-3 text-center text-slate-500 text-[11px] border-r border-slate-850 bg-slate-950/60 tabular-nums">
                        {rowIdx + 1}
                      </td>
                      {rs.columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined;
                        const isNumber = typeof val === 'number';

                        return (
                          <td 
                            key={col} 
                            className={`py-1.5 px-3 border-r border-slate-850/60 whitespace-nowrap ${
                              isNull ? 'text-slate-600 italic font-sans text-[11px]' : 
                              isNumber ? 'text-amber-300 text-right tabular-nums' : 'text-slate-200'
                            }`}
                          >
                            {isNull ? 'NULL' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const tablesToPrint = printTarget === 'all' ? resultSets : [resultSets[printTarget]].filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Top Main Tab Navigation */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs overflow-x-auto no-scrollbar select-none gap-2 shrink-0">
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded font-medium transition-colors cursor-pointer touch-manipulation ${
              activeTab === 'grid'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>
              Kết quả {resultSets.length > 1 ? `(${resultSets.length} bảng, ${totalRowsCount} dòng)` : resultSets.length === 1 ? `(${resultSets[0].rowCount} dòng)` : ''}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded font-medium transition-colors cursor-pointer touch-manipulation ${
              activeTab === 'messages'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Thông báo {result?.messages?.length ? `(${result.messages.length})` : ''}</span>
            {result && !result.success && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded font-medium transition-colors cursor-pointer touch-manipulation ${
              activeTab === 'plan'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kế hoạch thực thi (Plan)</span>
            <span className="sm:hidden">Plan</span>
          </button>
        </div>

        {/* Right side tools */}
        {activeTab === 'grid' && resultSets.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Switcher if multiple tables exist */}
            {resultSets.length > 1 && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
                <button
                  onClick={() => setViewMode('consecutive')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === 'consecutive'
                      ? 'bg-sky-950 text-sky-400 border border-sky-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Hiện tất cả các bảng nối tiếp nhau"
                >
                  <Layers className="w-3 h-3" />
                  <span className="hidden md:inline">In liên tiếp ({resultSets.length})</span>
                  <span className="md:hidden">Liên tiếp</span>
                </button>

                <button
                  onClick={() => setViewMode('single')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === 'single'
                      ? 'bg-sky-950 text-sky-400 border border-sky-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Xem từng bảng theo dạng thẻ chọn"
                >
                  <Eye className="w-3 h-3" />
                  <span>Từng bảng</span>
                </button>
              </div>
            )}

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Lọc..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-20 sm:w-32 pl-6 pr-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Print button */}
            <button
              onClick={() => openPrint('all')}
              className="flex items-center gap-1 px-2.5 py-1 bg-sky-950/80 hover:bg-sky-900/90 text-sky-300 border border-sky-800/80 rounded text-xs font-medium transition-colors cursor-pointer touch-manipulation"
              title="In ra giấy / Xuất file PDF tất cả các bảng liên tiếp"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">In kết quả</span>
            </button>

            {/* CSV export */}
            <button
              onClick={exportAllCSV}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer touch-manipulation"
              title={resultSets.length > 1 ? "Tải tất cả các bảng dạng CSV" : "Tải CSV"}
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Copy markdown */}
            <button
              onClick={() => copyAsMarkdown()}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer touch-manipulation"
              title="Sao chép toàn bộ bảng dạng Markdown"
            >
              {copiedType === 'markdown' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copiedType === 'markdown' ? 'Đã chép' : 'MD'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Single Mode Secondary Sub-tabs (when viewMode is 'single' and multiple tables exist) */}
      {activeTab === 'grid' && viewMode === 'single' && resultSets.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-1 bg-slate-900 border-b border-slate-800 overflow-x-auto no-scrollbar text-xs shrink-0 select-none">
          <span className="text-[11px] text-slate-400 mr-1 shrink-0 font-medium">Chọn bảng:</span>
          {resultSets.map((rs, i) => (
            <button
              key={rs.id || i}
              onClick={() => setSelectedTableIdx(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedTableIdx === i
                  ? 'bg-sky-900/60 text-sky-300 border border-sky-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>#{i + 1}</span>
              <span className="max-w-[120px] truncate">{rs.statement || 'Query'}</span>
              <span className="px-1 py-0.2 bg-slate-800 rounded text-[10px] text-slate-300 tabular-nums">
                {rs.rowCount}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-950 p-2 sm:p-3">
        {activeTab === 'grid' && (
          <>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-12">
                <TableIcon className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                <p>Chưa có dữ liệu. Bấm <strong>Thực thi (F5)</strong> để chạy câu lệnh SQL.</p>
                <p className="text-[11px] text-slate-600 mt-1">Hỗ trợ in liên tiếp nhiều bảng từ nhiều lệnh SELECT và VIEW trong cùng một script!</p>
              </div>
            ) : !result.success && resultSets.length === 0 ? (
              <div className="p-2">
                <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-md text-rose-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-300">Không thể lấy kết quả do có lỗi thực thi:</p>
                    <p className="font-mono text-slate-300 whitespace-pre-wrap">{result.message}</p>
                    <p className="text-slate-400 mt-2">Xem chi tiết tại thẻ <strong>Thông báo</strong>.</p>
                  </div>
                </div>
              </div>
            ) : resultSets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-12">
                <Check className="w-8 h-8 mb-2 text-emerald-400" />
                <p className="text-slate-200 font-medium">{result.message}</p>
                <p className="text-slate-500 mt-1">Lệnh đã thực thi thành công nhưng không trả về bảng kết quả (DML/DDL/VIEW).</p>
              </div>
            ) : (
              <>
                {/* Consecutive Multi-table Stacked View */}
                {viewMode === 'consecutive' ? (
                  <div className="space-y-4">
                    {resultSets.map((rs, idx) => renderTableGrid(rs, idx, true))}
                  </div>
                ) : (
                  /* Single Table View */
                  <div className="h-full">
                    {resultSets[selectedTableIdx] && renderTableGrid(resultSets[selectedTableIdx], selectedTableIdx, false)}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Tab 2: Messages Tab */}
        {activeTab === 'messages' && (
          <div className="p-2 sm:p-3 font-mono text-xs leading-relaxed space-y-3">
            {result ? (
              <>
                <div className={`p-3 rounded border ${
                  result.success 
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300' 
                    : 'bg-rose-950/40 border-rose-900/70 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {result.success ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-bold">
                      {result.success ? 'Thực thi hoàn tất' : 'Lỗi truy vấn SQL'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{result.message}</p>
                </div>

                {/* All Statement Messages */}
                {result.messages && result.messages.length > 0 && (
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded space-y-2">
                    <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      Nhật ký thực thi từng câu lệnh ({result.messages.length}):
                    </div>
                    <div className="divide-y divide-slate-800 text-[11.5px]">
                      {result.messages.map((msg, i) => (
                        <div key={i} className="py-1.5 flex items-start gap-2 text-slate-300">
                          <span className="text-slate-500 tabular-nums">[{i + 1}]</span>
                          <span className="flex-1 font-mono">{msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-slate-400 space-y-1 text-[11px] p-2 bg-slate-950 rounded border border-slate-850">
                  <div>CSDL Hiện hành: <span className="text-slate-200 font-medium">{activeDatabase || 'master'}</span></div>
                  <div>Thời gian thực thi: <span className="text-emerald-400 tabular-nums">{result.executionTimeMs} ms</span></div>
                  <div>Tổng số bảng kết quả: <span className="text-sky-400 tabular-nums">{resultSets.length}</span></div>
                  <div>Tổng số dòng dữ liệu: <span className="text-sky-400 tabular-nums">{totalRowsCount}</span></div>
                  <div>Thời điểm hoàn tất: <span className="text-slate-300">{new Date().toLocaleTimeString()}</span></div>
                </div>

                {!result.success && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs">
                    <p className="font-semibold text-amber-400 mb-1">Gợi ý kiểm tra:</p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11.5px]">
                      <li>Kiểm tra xem tên bảng hoặc VIEW có khớp với định nghĩa không.</li>
                      <li>Khi viết câu lệnh `CREATE VIEW`, đảm bảo có từ khóa `AS` trước câu lệnh `SELECT`.</li>
                      <li>Nếu script có nhiều bảng, bạn có thể kết thúc mỗi lệnh bằng dấu chấm phẩy `;` hoặc từ khóa `GO`.</li>
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-500 italic">Chưa có thông báo nào. Hãy chạy câu truy vấn để nhận nhật ký thực thi.</div>
            )}
          </div>
        )}

        {/* Tab 3: Execution Plan Tab */}
        {activeTab === 'plan' && (
          <div className="p-3 text-xs">
            {resultSets.length > 0 ? (
              <div className="space-y-4">
                {/* Table selector for Plan if multiple tables */}
                {resultSets.length > 1 && (
                  <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded">
                    <span className="text-[11px] text-slate-400">Xem Plan của bảng:</span>
                    <select
                      value={selectedTableIdx}
                      onChange={e => setSelectedTableIdx(Number(e.target.value))}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs font-mono"
                    >
                      {resultSets.map((rs, i) => (
                        <option key={i} value={i}>
                          Bảng #{i + 1}: {rs.statement.substring(0, 40)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded">
                  <h4 className="font-semibold text-slate-200 text-xs">
                    Ước tính kế hoạch thực thi (Execution Plan Tree)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mô phỏng bộ tối ưu hóa truy vấn SQL Server (Cost-based Query Optimizer) phân tích chi phí từng toán tử I/O và CPU.
                  </p>
                </div>

                <div className="overflow-x-auto py-2">
                  {renderExecutionPlanNode(
                    resultSets[selectedTableIdx]?.executionPlan ||
                    resultSets[0]?.executionPlan ||
                    {
                      id: 'plan-default',
                      name: 'Table Scan',
                      costPercent: 100,
                      description: 'Quét toàn bộ bảng',
                      type: 'Scan'
                    }
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <GitCommit className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                <p>Kế hoạch thực thi sẽ được khởi tạo khi bạn chạy câu lệnh SELECT.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Bottom Status Bar */}
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span>Bảng: <strong className="text-sky-400 tabular-nums">{resultSets.length}</strong></span>
          <span>·</span>
          <span>Tổng số hàng: <strong className="text-slate-200 tabular-nums">{totalRowsCount}</strong></span>
          <span>·</span>
          <span>Thời gian: <strong className="text-emerald-400 tabular-nums">{result?.executionTimeMs ?? 0} ms</strong></span>
        </div>
        <div className="text-slate-500 text-[10px]">
          In-browser T-SQL Multi-Table Engine
        </div>
      </div>

      {/* Print Preview & Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-lg shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Modal Header (hidden during print) */}
            <div className="no-print flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Bản in kết quả SQL ({tablesToPrint.length} bảng)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDocument}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In ra giấy / Xuất PDF (Ctrl + P)</span>
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                  title="Đóng bản in"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="print-container flex-1 overflow-auto p-6 sm:p-8 space-y-6 bg-white text-slate-900 font-sans">
              {/* Report Header */}
              <div className="border-b-2 border-slate-800 pb-4">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  Báo cáo kết quả truy vấn dữ liệu SQL
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2 font-mono">
                  <div>Cơ sở dữ liệu: <strong className="text-slate-900">{activeDatabase || 'master'}</strong></div>
                  <div>Thời gian in: <strong className="text-slate-900">{new Date().toLocaleString()}</strong></div>
                  <div>Tổng số bảng: <strong className="text-slate-900">{tablesToPrint.length}</strong></div>
                  <div>Tổng số dòng: <strong className="text-slate-900">{tablesToPrint.reduce((s, t) => s + t.rowCount, 0)}</strong></div>
                </div>
              </div>

              {/* All Tables Printed Consecutively */}
              <div className="space-y-6">
                {tablesToPrint.map((table, tIdx) => (
                  <div key={table.id || tIdx} className="print-page-break space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <div className="font-mono text-xs font-bold text-slate-800">
                        Bảng #{tIdx + 1}: <span className="font-normal text-slate-700">{table.statement}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {table.rowCount} dòng, {table.columns.length} cột
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-semibold font-mono">
                            <th className="py-1 px-2 border-r border-slate-300 w-10 text-center">#</th>
                            {table.columns.map(col => (
                              <th key={col} className="py-1 px-2 border-r border-slate-300">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.data.length === 0 ? (
                            <tr>
                              <td colSpan={table.columns.length + 1} className="py-3 text-center italic text-slate-400">
                                (Không có dữ liệu)
                              </td>
                            </tr>
                          ) : (
                            table.data.map((row, rIdx) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                <td className="py-1 px-2 text-center text-slate-500 border-r border-slate-300 font-mono text-[11px]">
                                  {rIdx + 1}
                                </td>
                                {table.columns.map(col => {
                                  const val = row[col];
                                  const isNull = val === null || val === undefined;
                                  return (
                                    <td key={col} className="py-1 px-2 border-r border-slate-300 font-mono text-[11.5px]">
                                      {isNull ? <span className="italic text-slate-400">NULL</span> : String(val)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Report Footer */}
              <div className="pt-4 border-t border-slate-300 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>In tự động từ SQL Studio In-browser Engine</span>
                <span>Trang 1 / 1</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
