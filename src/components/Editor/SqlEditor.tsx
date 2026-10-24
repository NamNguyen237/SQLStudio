import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Sparkles, 
  RotateCcw, 
  History, 
  Copy, 
  Check,
  Upload,
  Download,
  Undo2,
  Redo2,
  X
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
  const gutterRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Cursor line and column tracking
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [cursorCol, setCursorCol] = useState<number>(1);

  // Undo / Redo history management
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedoAction = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize history when value changes
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    if (value === history[historyIndex]) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const prevVal = history[historyIndex] ?? '';
    const diffLen = Math.abs(value.length - prevVal.length);

    // Large changes (paste, format, load file, clear) record immediately
    if (diffLen > 3 || value === '' || !prevVal) {
      setHistory(prev => {
        const next = [...prev.slice(0, historyIndex + 1), value];
        if (next.length > 50) next.shift();
        return next;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    } else {
      // Small keystroke changes debounce by 300ms so undo restores in chunks
      debounceTimerRef.current = setTimeout(() => {
        setHistory(prev => {
          const next = [...prev.slice(0, historyIndex + 1), value];
          if (next.length > 50) next.shift();
          return next;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
      }, 300);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value, historyIndex, history]);

  // Update cursor position (line and col)
  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart ?? 0;
    const linesBefore = value.slice(0, pos).split('\n');
    setCursorLine(linesBefore.length);
    setCursorCol(linesBefore[linesBefore.length - 1].length + 1);
  }, [value]);

  useEffect(() => {
    updateCursorPosition();
  }, [value, updateCursorPosition]);

  // Synchronize gutter scroll position with textarea
  const handleScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleGutterWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop += e.deltaY;
    }
  };

  const handleLineClick = (lineNum: number) => {
    if (!textareaRef.current) return;
    const allLines = value.split('\n');
    let charIndex = 0;
    for (let i = 0; i < lineNum - 1 && i < allLines.length; i++) {
      charIndex += allLines[i].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charIndex, charIndex);
    setCursorLine(lineNum);
    setCursorCol(1);
  };

  // Close history dropdown on Escape
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHistory) {
        setShowHistory(false);
      }
    };
    if (showHistory) {
      window.addEventListener('keydown', handleKeyDownGlobal);
    }
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [showHistory]);


  const handleUndo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // If user has a pending keystroke not yet in history
    if (value !== history[historyIndex]) {
      isUndoRedoAction.current = true;
      onChange(history[historyIndex]);
      return;
    }
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      isUndoRedoAction.current = true;
      setHistoryIndex(targetIdx);
      onChange(history[targetIdx]);
    }
  }, [historyIndex, history, value, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      isUndoRedoAction.current = true;
      setHistoryIndex(targetIdx);
      onChange(history[targetIdx]);
    }
  }, [historyIndex, history, onChange]);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wordToReplace, setWordToReplace] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 30, left: 50 });

  // Accurate line count matching actual document lines
  const linesCount = Math.max(value.split('\n').length, 1);
  const lines = Array.from({ length: linesCount }, (_, i) => i + 1);

  const updateSuggestions = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const res = getSuggestions(value, pos, activeDatabase);
    
    if (res.suggestions.length > 0 && res.wordToReplace.length >= 1) {
      setSuggestions(res.suggestions);
      setWordToReplace(res.wordToReplace);
      setSelectedIndex(0);
      setShowSuggestions(true);

      const linesBeforeCursor = value.slice(0, pos).split('\n');
      const currentLineIdx = linesBeforeCursor.length - 1;
      const currentCol = linesBeforeCursor[currentLineIdx].length;

      const lineHeight = 24; // px
      const charWidth = 8; // px for monospace
      const scrollOffset = textareaRef.current.scrollTop;
      const top = Math.min(Math.max((currentLineIdx + 1) * lineHeight + 12 - scrollOffset, 10), 240);
      const left = Math.min(currentCol * charWidth + 50, 400);

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
    if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || e.key === 'F5') {
      e.preventDefault();
      onExecute();
      return;
    }

    // Undo with Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Redo with Ctrl+Y or Ctrl+Shift+Z
    if (
      ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
    ) {
      e.preventDefault();
      handleRedo();
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

      {/* Editor Toolbar - Optimized for both Desktop and Mobile / Touch Screens */}
      <div className="relative z-30 flex items-center justify-between px-2 sm:px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 text-xs gap-1 select-none">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Green Triangle Run button (Play icon only) */}
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded transition-all cursor-pointer shadow-md shadow-emerald-950/40 shrink-0 touch-manipulation hover:scale-105 active:scale-95"
            title="Thực thi T-SQL (F5 hoặc Ctrl + Enter)"
            aria-label="Thực thi T-SQL"
          >
            <Play className={`w-3.5 h-3.5 fill-white ml-0.5 ${isExecuting ? 'animate-spin' : ''}`} />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

          {/* Undo button */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0 && value === history[0]}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer shrink-0 touch-manipulation"
            title="Hoàn tác (Ctrl + Z)"
            aria-label="Hoàn tác"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo button */}
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer shrink-0 touch-manipulation"
            title="Làm lại (Ctrl + Y hoặc Ctrl + Shift + Z)"
            aria-label="Làm lại"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

          {/* Format button */}
          <button
            onClick={handleFormat}
            className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 rounded transition-colors whitespace-nowrap cursor-pointer shrink-0 touch-manipulation"
            title="Định dạng lại mã: tự động căn lề thụt dòng và viết hoa từ khóa T-SQL (Shift + Alt + F)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Format</span>
          </button>

          {/* History Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowHistory(prev => !prev)}
              className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer shrink-0 touch-manipulation ${
                showHistory ? 'bg-purple-950/90 text-purple-200 border border-purple-700/60' : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750'
              }`}
              title="Lịch sử các câu lệnh vừa chạy"
              aria-label="Lịch sử truy vấn"
              aria-expanded={showHistory}
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Lịch sử ({queryHistory.length})</span>
              <span className="md:hidden text-[10px] text-purple-300 font-mono font-bold">({queryHistory.length})</span>
            </button>

            {showHistory && (
              <>
                {/* Backdrop to dismiss when clicking or tapping outside */}
                <div 
                  className="fixed inset-0 z-40 bg-black/25 md:bg-transparent" 
                  onClick={() => setShowHistory(false)} 
                />

                {/* Dropdown Menu - explicitly z-50 floating over editor canvas */}
                <div 
                  className="absolute left-0 top-full mt-1.5 w-72 sm:w-96 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-slate-200"
                >
                  <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-purple-400" />
                      Lịch sử truy vấn ({queryHistory.length})
                    </span>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800 p-0.5 rounded cursor-pointer transition-colors"
                      title="Đóng menu lịch sử (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {queryHistory.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-slate-500 italic text-center">
                      Chưa có truy vấn nào được thực thi gần đây.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {queryHistory.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            onChange(q);
                            setShowHistory(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-sky-300 font-mono truncate block cursor-pointer transition-colors active:bg-slate-750"
                          title={q}
                        >
                          <span className="text-[10px] text-slate-500 mr-2 select-none font-sans">#{idx + 1}</span>
                          {q.replace(/\s+/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right side utilities (File I/O, Copy, Clear) */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Open local .sql file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-1.5 py-1 sm:px-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0 touch-manipulation"
            title="Mở file .sql từ máy tính"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline text-[11px]">Mở file</span>
          </button>

          {/* Save local .sql file */}
          <button
            onClick={handleSaveFile}
            className="flex items-center gap-1 px-1.5 py-1 sm:px-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0 touch-manipulation"
            title="Lưu câu lệnh thành file .sql"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline text-[11px]">Lưu file</span>
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-1 sm:px-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0 touch-manipulation"
            title="Sao chép câu lệnh"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{copied ? 'Đã chép' : 'Chép'}</span>
          </button>

          {/* Clear button */}
          <button
            onClick={() => onChange('')}
            className="flex items-center gap-1 px-1.5 py-1 sm:px-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0 touch-manipulation"
            title="Xóa trống khung soạn thảo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Xóa</span>
          </button>
        </div>
      </div>

      {/* Main Code Editing Canvas */}
      <div ref={containerRef} className="relative z-10 flex-1 flex overflow-hidden font-mono text-[13px] bg-slate-950">
        {/* Line Numbers Gutter */}
        <div 
          ref={gutterRef}
          onWheel={handleGutterWheel}
          style={{ 
            paddingTop: '12px', 
            paddingBottom: '24px',
            minWidth: linesCount >= 1000 ? '3.5rem' : linesCount >= 100 ? '2.75rem' : '2.25rem'
          }}
          className="select-none bg-slate-950/90 border-r border-slate-800 text-slate-500 font-mono text-[12px] overflow-hidden shrink-0"
          aria-hidden="true"
        >
          {lines.map(num => {
            const isCurrent = num === cursorLine;
            return (
              <div 
                key={num} 
                onClick={() => handleLineClick(num)}
                style={{ height: '24px', lineHeight: '24px' }}
                className={`pr-2 text-right cursor-pointer transition-colors ${
                  isCurrent 
                    ? 'text-sky-400 font-bold bg-sky-950/40' 
                    : 'text-slate-600 hover:text-slate-300'
                }`}
                title={`Nhảy tới dòng ${num}`}
              >
                {num}
              </div>
            );
          })}
        </div>

        {/* Text Area */}
        <div className="relative flex-1 h-full min-w-0">
          <textarea
            ref={textareaRef}
            value={value}
            wrap="off"
            onChange={(e) => {
              onChange(e.target.value);
              updateCursorPosition();
              updateSuggestions();
            }}
            onScroll={handleScroll}
            onKeyUp={() => {
              updateCursorPosition();
              updateSuggestions();
            }}
            onClick={() => {
              updateCursorPosition();
              updateSuggestions();
            }}
            onSelect={updateCursorPosition}
            onKeyDown={handleKeyDown}
            placeholder="-- Nhập câu lệnh T-SQL tại đây (Ví dụ: SELECT * FROM SinhVien;)&#10;-- Bấm nút tam giác xanh hoặc F5 để thực thi."
            spellCheck={false}
            className="w-full h-full font-mono text-[13px] text-slate-100 bg-transparent resize-none outline-none tracking-wide selection:bg-sky-500/30 overflow-auto whitespace-pre touch-manipulation px-3"
            style={{ 
              tabSize: 2,
              paddingTop: '12px',
              paddingBottom: '24px',
              lineHeight: '24px'
            }}
          />

          {/* Autocomplete Popup - Touch friendly */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="absolute z-40 bg-slate-900 border border-slate-700 rounded-md shadow-2xl overflow-hidden w-64 sm:w-72 text-xs"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                maxHeight: '220px'
              }}
            >
              <div className="px-2.5 py-1 bg-slate-950 text-[10px] font-semibold text-slate-400 border-b border-slate-800 flex justify-between items-center">
                <span>Gợi ý cú pháp T-SQL</span>
                <span className="text-slate-500">Chạm để chọn</span>
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
                      onTouchStart={(e) => {
                        e.preventDefault();
                        insertSuggestion(item);
                      }}
                      className={`px-3 py-2 sm:py-1.5 flex items-center justify-between cursor-pointer transition-colors touch-manipulation ${
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
      <div className="px-3 py-1 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
        <div className="flex items-center gap-3">
          <span>Dòng: <strong className="text-slate-300">{cursorLine}</strong> / {linesCount}</span>
          <span>Cột: <strong className="text-slate-300">{cursorCol}</strong></span>
          <span>Ký tự: <strong className="text-slate-300">{value.length}</strong></span>
          {activeDatabase && (
            <span className="hidden sm:inline">CSDL: <strong className="text-sky-400 font-bold">{activeDatabase}</strong></span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 hidden sm:block">
          F5 / Ctrl+Enter: Chạy | Ctrl+Z: Undo | Ctrl+Y: Redo
        </div>
      </div>
    </div>
  );
};
