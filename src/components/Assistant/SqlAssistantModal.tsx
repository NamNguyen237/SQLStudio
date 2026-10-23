import React, { useState } from 'react';
import { X, Sparkles, MessageSquare, Lightbulb, CheckCircle, AlertTriangle, ArrowRight, HelpCircle } from 'lucide-react';

interface SqlAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSql: string;
  activeDatabase: string;
  onApplyFix?: (fixedSql: string) => void;
}

export const SqlAssistantModal: React.FC<SqlAssistantModalProps> = ({
  isOpen,
  onClose,
  currentSql,
  activeDatabase,
  onApplyFix
}) => {
  const [analysisMode, setAnalysisMode] = useState<'explain' | 'optimize' | 'diagnose'>('explain');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  // Local intelligent analyzer for instant feedback
  const getRuleBasedInsights = () => {
    const sql = currentSql.trim();
    const upper = sql.toUpperCase();
    const tips: string[] = [];
    const warnings: string[] = [];
    let explanation = '';
    let suggestedImprovement = '';

    if (!sql) {
      return {
        explanation: 'Khung soạn thảo đang trống. Hãy nhập một câu lệnh SQL để xem giải thích chi tiết.',
        tips: ['Bắt đầu bằng câu lệnh đơn giản: SELECT * FROM NhanVien;'],
        warnings: [],
        suggestedImprovement: ''
      };
    }

    // Explanation generation
    if (upper.startsWith('SELECT')) {
      explanation = 'Câu lệnh truy vấn dữ liệu (DQL). ';
      if (upper.includes('TOP')) {
        explanation += 'Sử dụng T-SQL TOP để giới hạn số dòng. ';
      }
      if (upper.includes('JOIN')) {
        explanation += 'Có liên kết nhiều bảng qua khóa chính/ngoại. ';
      }
      if (upper.includes('GROUP BY')) {
        explanation += 'Có gom nhóm các bản ghi và áp dụng các phép tính tổng hợp. ';
      }
      if (upper.includes('ORDER BY')) {
        explanation += 'Có sắp xếp kết quả trả về. ';
      }
    } else if (upper.startsWith('INSERT')) {
      explanation = 'Câu lệnh chèn bản ghi mới (DML) vào cơ sở dữ liệu.';
    } else if (upper.startsWith('UPDATE')) {
      explanation = 'Câu lệnh cập nhật dữ liệu (DML).';
    } else if (upper.startsWith('DELETE')) {
      explanation = 'Câu lệnh xóa dữ liệu (DML).';
    } else {
      explanation = 'Câu lệnh định nghĩa hoặc điều khiển đối tượng cơ sở dữ liệu.';
    }

    // Warnings
    if (upper.includes('SELECT *')) {
      tips.push('Thay vì dùng `SELECT *`, trong môi trường doanh nghiệp nên chỉ định cụ thể các cột cần lấy (ví dụ: `SELECT MaNV, HoTen`) để tiết kiệm băng thông mạng và tối ưu I/O.');
    }
    if ((upper.startsWith('DELETE') || upper.startsWith('UPDATE')) && !upper.includes('WHERE')) {
      warnings.push('CẢNH BÁO NGUY HIỂM: Câu lệnh UPDATE/DELETE không có mệnh đề WHERE sẽ tác động lên TOÀN BỘ dữ liệu trong bảng!');
    }
    if (upper.includes('JOIN') && !upper.includes('ON')) {
      warnings.push('Phép JOIN thiếu mệnh đề liên kết ON sẽ tạo ra tích Đề-các (Cartesian product) gây tràn bộ nhớ.');
    }
    if (upper.includes('WHERE') && upper.includes('LIKE \'%')) {
      tips.push('Mệnh đề `LIKE \'%...\'` với dấu `%` ở đầu sẽ không thể tận dụng B-Tree Index, dẫn đến quét toàn bộ bảng (Table Scan).');
    }

    if (tips.length === 0) {
      tips.push('Cú pháp T-SQL của bạn tuân thủ tốt các quy chuẩn viết mã sạch.');
    }

    return { explanation, tips, warnings, suggestedImprovement };
  };

  const insights = getRuleBasedInsights();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Trợ lý Cú pháp & Tối ưu T-SQL Thông minh
              </h3>
              <p className="text-xs text-slate-400">
                Phân tích mã nguồn và giải thích logic cho người học
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

        {/* Current SQL Preview */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
            <span>Mã T-SQL đang phân tích:</span>
            <span className="font-mono text-[11px] text-sky-400">CSDL: {activeDatabase}</span>
          </div>
          <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-sky-200 overflow-x-auto max-h-24">
            {currentSql || '-- Không có câu lệnh'}
          </pre>
        </div>

        {/* Insights Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Explanation */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>Giải thích logic câu truy vấn:</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[12.5px] mt-2">
              {insights.explanation}
            </p>
          </div>

          {/* Warnings if any */}
          {insights.warnings.length > 0 && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Cảnh báo an toàn dữ liệu:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 mt-1 text-[12px]">
                {insights.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Best practice tips */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Lời khuyên & Chuẩn tối ưu hóa:</span>
            </div>
            <ul className="space-y-2 text-slate-300 text-[12px]">
              {insights.tips.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">·</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            Đã hiểu, quay lại IDE
          </button>
        </div>
      </div>
    </div>
  );
};
