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
  Clock, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { QueryExecutionResult, ExecutionPlanNode } from '../../services/sqlEngine';

interface ResultsPanelProps {
  result: QueryExecutionResult | null;
  activeDatabase: string;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, activeDatabase }) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'messages' | 'plan'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // If result is an error or non-select, automatically switch tab appropriately if needed
  React.useEffect(() => {
    if (result && !result.success) {
      setActiveTab('messages');
    } else if (result && result.data && result.data.length > 0) {
      setActiveTab('grid');
    } else if (result && !result.data) {
      setActiveTab('messages');
    }
  }, [result]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const processedData = useMemo(() => {
    if (!result || !result.data) return [];
    let rows = [...result.data];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(val =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(term)
        )
      );
    }

    // Sort
    if (sortColumn) {
      rows.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [result, searchTerm, sortColumn, sortDirection]);

  const exportCSV = () => {
    if (!result || !result.data || result.data.length === 0) return;
    const headers = result.columns.join(',');
    const rows = result.data.map(row =>
      result.columns.map(col => {
        const cell = row[col] === null || row[col] === undefined ? '' : String(row[col]);
        return `"${cell.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sql_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyAsMarkdown = () => {
    if (!result || !result.data || result.data.length === 0) return;
    const headers = `| ${result.columns.join(' | ')} |`;
    const separator = `| ${result.columns.map(() => '---').join(' | ')} |`;
    const rows = result.data.map(row =>
      `| ${result.columns.map(col => row[col] ?? 'NULL').join(' | ')} |`
    ).join('\n');
    const md = `${headers}\n${separator}\n${rows}`;
    navigator.clipboard.writeText(md);
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 1500);
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

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Tab Navigation Header */}
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
            <span>Kết quả {result?.data ? `(${result.data.length})` : ''}</span>
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
            <span>Thông báo</span>
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
        {activeTab === 'grid' && result && result.data && result.data.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Lọc..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-24 sm:w-36 pl-6 pr-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer touch-manipulation"
              title="Tải kết quả dạng file CSV"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={copyAsMarkdown}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer touch-manipulation"
              title="Sao chép bảng kết quả dạng Markdown"
            >
              {copiedType === 'markdown' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copiedType === 'markdown' ? 'Đã chép' : 'MD'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-auto bg-slate-950">
        {activeTab === 'grid' && (
          <>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-12">
                <TableIcon className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                <p>Chưa có dữ liệu. Bấm <strong>Thực thi (F5)</strong> để chạy câu lệnh SQL.</p>
              </div>
            ) : !result.success ? (
              <div className="p-4">
                <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-md text-rose-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-300">Không thể lấy kết quả do có lỗi thực thi:</p>
                    <p className="font-mono text-slate-300 whitespace-pre-wrap">{result.message}</p>
                    <p className="text-slate-400 mt-2">Xem chi tiết tại thẻ <strong>Thông báo</strong>.</p>
                  </div>
                </div>
              </div>
            ) : !result.data ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-12">
                <Check className="w-8 h-8 mb-2 text-emerald-400" />
                <p className="text-slate-200 font-medium">{result.message}</p>
                <p className="text-slate-500 mt-1">Lệnh đã thay đổi dữ liệu nhưng không trả về bảng kết quả (DML/DDL).</p>
              </div>
            ) : result.data.length === 0 && result.columns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-12">
                <FileSpreadsheet className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                <p>Truy vấn thành công nhưng trả về <strong>0 dòng</strong> kết quả.</p>
              </div>
            ) : (
              <div className="min-w-full inline-block align-middle">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800 text-slate-300 select-none">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center font-mono text-[11px] text-slate-500 border-r border-slate-800 bg-slate-900/90">
                        #
                      </th>
                      {result.columns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="py-2 px-3 font-semibold font-mono tracking-tight cursor-pointer hover:bg-slate-800 border-r border-slate-800/80 transition-colors whitespace-nowrap"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{col}</span>
                            <ArrowUpDown className={`w-3 h-3 ${sortColumn === col ? 'text-sky-400' : 'text-slate-600'}`} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {result.data.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={result.columns.length + 1} 
                          className="py-8 text-center text-slate-500 italic text-xs font-sans"
                        >
                          0 dòng kết quả (bảng dữ liệu chưa có dòng nào khớp điều kiện)
                        </td>
                      </tr>
                    ) : (
                      processedData.map((row, rowIdx) => (
                        <tr 
                          key={rowIdx} 
                          className="hover:bg-slate-900/60 transition-colors font-mono text-[12.5px] border-b border-slate-850/60"
                        >
                          <td className="py-1.5 px-3 text-center text-slate-500 text-[11px] border-r border-slate-850 bg-slate-950/60 tabular-nums">
                            {rowIdx + 1}
                          </td>
                          {result.columns.map((col) => {
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
              </div>
            )}
          </>
        )}

        {activeTab === 'messages' && (
          <div className="p-4 font-mono text-xs leading-relaxed space-y-3">
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

                <div className="text-slate-400 space-y-1 text-[11px]">
                  <div>CSDL Hiện hành: <span className="text-slate-200 font-medium">{activeDatabase}</span></div>
                  <div>Thời gian thực thi: <span className="text-emerald-400 tabular-nums">{result.executionTimeMs} ms</span></div>
                  <div>Số hàng xử lý: <span className="text-sky-400 tabular-nums">{result.rowCount}</span></div>
                  <div>Thời điểm hoàn tất: <span className="text-slate-300">{new Date().toLocaleTimeString()}</span></div>
                </div>

                {!result.success && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs">
                    <p className="font-semibold text-amber-400 mb-1">Mẹo sửa lỗi nhanh:</p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11.5px]">
                      <li>Kiểm tra xem tên bảng hoặc tên cột có đúng với bảng liệt kê ở menu bên trái không.</li>
                      <li>Nếu có nhiều bảng cùng tên cột, hãy thêm tiền tố bí danh (ví dụ: `nv.MaNV`).</li>
                      <li>Đảm bảo các giá trị chuỗi tiếng Việt hoặc ngày tháng được bao bọc trong dấu nháy đơn `'...'`.</li>
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-500 italic">Chưa có thông báo nào. Hãy chạy câu truy vấn để nhận nhật ký thực thi.</div>
            )}
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="p-4 text-xs">
            {result?.executionPlan ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded">
                  <h4 className="font-semibold text-slate-200 text-xs">
                    Ước tính kế hoạch thực thi (Execution Plan Tree)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mô phỏng bộ tối ưu hóa truy vấn SQL Server (Cost-based Query Optimizer) phân tích chi phí từng toán tử I/O và CPU.
                  </p>
                </div>

                <div className="overflow-x-auto py-2">
                  {renderExecutionPlanNode(result.executionPlan)}
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
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          <span>Hàng: <strong className="text-slate-200 tabular-nums">{result?.rowCount ?? 0}</strong></span>
          <span>·</span>
          <span>Thời gian: <strong className="text-emerald-400 tabular-nums">{result?.executionTimeMs ?? 0} ms</strong></span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Phân tích bởi In-browser T-SQL Engine
        </div>
      </div>
    </div>
  );
};
