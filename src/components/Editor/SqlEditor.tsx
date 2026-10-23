import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Sparkles, 
  RotateCcw, 
  History, 
  Copy, 
  Check,
  Upload,
  Download
} from 'lucide-react';
import { getSuggestions, SuggestionItem } from '../../services/autocomplete';
import { formatSql } from '../../utils/sqlFormatter';

interface SqlEditorProps {
  value: string;
  onChange: (val: string) => void;
  onExecute: () => void;
  isExecuting?: boolean;
  activeDatabase: string;
  queryHistory: string[];
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  onExecute,
  isExecuting = false,
  activeDatabase,
  queryHistory
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wordToReplace, setWordToReplace] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 30, left: 50 });

  const lineCount = Math.max(value.split('\n').length, 12);
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Sync scroll between textarea and highlights/gutters if needed
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    // handled natively
  };

  const updateSuggestions = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const res = getSuggestions(value, pos, activeDatabase);
    
    if (res.suggestions.length > 0 && res.wordToReplace.length >= 1) {
      setSuggestions(res.suggestions);
      setWordToReplace(res.wordToReplace);
      setSelectedIndex(0);
      setShowSuggestions(true);

      // Estimate position from cursor
      const linesBeforeCursor = value.slice(0, pos).split('\n');
      const currentLineIdx = linesBeforeCursor.length - 1;
      const currentCol = linesBeforeCursor[currentLineIdx].length;

      const lineHeight = 21; // px
      const charWidth = 8.5; // px for monospace
      const top = Math.min((currentLineIdx + 1) * lineHeight + 40, 240);
      const left = Math.min(currentCol * charWidth + 50, 420);

      setMenuPosition({ top, left });
    } else {
      setShowSuggestions(false);
    }
  }, [value, activeDatabase]);

  const insertSuggestion = (item: SuggestionItem) => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const start = pos - wordToReplace.length;
    const end = pos;

    const newValue = value.slice(0, start) + item.insertText + value.slice(end);
    onChange(newValue);
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + item.insertText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Execute with Ctrl+Enter or Cmd+Enter or F5
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onExecute();
      return;
    }
    if (e.key === 'F5') {
      e.preventDefault();
      onExecute();
      return;
    }

    // Format with Shift+Alt+F
    if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      handleFormat();
      return;
    }

    // Autocomplete navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertSuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Tab key indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleFormat = () => {
    const formatted = formatSql(value);
    onChange(formatted);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onChange(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveFile = () => {
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_${Date.now()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
      {/* Hidden file input for opening local .sql files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql,.txt"
        onChange={handleOpenFile}
        className="hidden"
      />

      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {/* Run button */}
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            title="Thực thi câu truy vấn (Ctrl + Enter hoặc F5)"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
            <span>{isExecuting ? 'Đang chạy...' : 'Thực thi (F5)'}</span>
          </button>

          {/* Format button */}
          <button
            onClick={handleFormat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap cursor-pointer"
            title="Định dạng lại mã: tự động căn lề thụt dòng và viết hoa từ khóa T-SQL (Shift + Alt + F)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Format SQL</span>
          </button>

          {/* History Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap cursor-pointer"
              title="Lịch sử các câu lệnh vừa chạy"
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span>Lịch sử ({queryHistory.length})</span>
            </button>

            {showHistory && (
              <div 
                className="absolute left-0 top-full mt-1 w-80 max-h-72 overflow-y-auto bg-slate-900 border border-slate-700 rounded shadow-xl py-1 z-30"
                onMouseLeave={() => setShowHistory(false)}
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  Lịch sử truy vấn gần đây
                </div>
                {queryHistory.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500 italic">Chưa có truy vấn nào được thực thi.</div>
                ) : (
                  queryHistory.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onChange(q);
                        setShowHistory(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-800/60 font-mono truncate block cursor-pointer transition-colors"
                    >
                      {q.replace(/\n/g, ' ')}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side utility */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Open local .sql file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Mở file mã nguồn .sql từ máy tính cá nhân (100% offline)"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Mở file</span>
          </button>

          {/* Save local .sql file */}
          <button
            onClick={handleSaveFile}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Lưu đoạn mã hiện tại về máy tính dưới dạng file .sql"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Lưu file</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Sao chép câu lệnh"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã chép' : 'Chép'}</span>
          </button>

          <button
            onClick={() => onChange('')}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Xóa trống khung soạn thảo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas with Line Numbers */}
      <div ref={containerRef} className="relative flex-1 flex overflow-hidden font-mono text-[13px] bg-slate-950">
        {/* Line Numbers Gutter */}
        <div 
          className="w-12 py-3 px-1 text-right select-none bg-slate-950/80 border-r border-slate-800/80 text-slate-600 font-mono text-xs overflow-hidden leading-6"
          aria-hidden="true"
        >
          {lines.map(num => (
            <div key={num} className="h-6">
              {num}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <div className="relative flex-1 h-full">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              updateSuggestions();
            }}
            onKeyUp={updateSuggestions}
            onClick={updateSuggestions}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            placeholder="-- Nhập câu lệnh T-SQL tại đây (Ví dụ: SELECT * FROM NhanVien WHERE Luong > 20000000;)&#10;-- Bấm Ctrl + Enter hoặc nút Thực thi để chạy lệnh."
            spellCheck={false}
            className="w-full h-full p-3 font-mono text-[13.5px] text-slate-100 bg-transparent resize-none outline-none leading-6 tracking-wide selection:bg-sky-500/30 overflow-auto"
            style={{ tabSize: 2 }}
          />

          {/* Autocomplete Popup */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="absolute z-40 bg-slate-900 border border-slate-700 rounded-md shadow-2xl overflow-hidden w-72 text-xs"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                maxHeight: '220px'
              }}
            >
              <div className="px-2.5 py-1 bg-slate-950 text-[10px] font-semibold text-slate-400 border-b border-slate-800 flex justify-between items-center">
                <span>Gợi ý cú pháp T-SQL</span>
                <span className="text-slate-500">Tab / Enter chọn</span>
              </div>
              <div className="overflow-y-auto max-h-48 py-1">
                {suggestions.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={index}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertSuggestion(item);
                      }}
                      className={`px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-600 text-white' : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`font-semibold font-mono ${
                          item.kind === 'keyword' ? 'text-sky-400' :
                          item.kind === 'function' ? 'text-amber-400' :
                          item.kind === 'table' ? 'text-emerald-400' : 'text-purple-400'
                        } ${isSelected ? '!text-white' : ''}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.kind}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Bottom Status Bar */}
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>T-SQL Engine (Ready)</span>
          </span>
          <span>·</span>
          <span>CSDL: <strong className="text-slate-200 font-medium">{activeDatabase}</strong></span>
          <span>·</span>
          <span>Dòng: {value.split('\n').length}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>Phím tắt: <kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">Ctrl+Enter</kbd> Chạy</span>
          <span>·</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">Ctrl+Space</kbd> Gợi ý</span>
        </div>
      </div>
    </div>
  );
};
