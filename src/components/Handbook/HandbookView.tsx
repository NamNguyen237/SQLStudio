import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Play, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Database,
  Table,
  Edit3,
  Layers,
  Link as LinkIcon,
  Code,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { UNIVERSITY_HANDBOOK, HandbookLesson, HandbookChapter } from '../../data/universityHandbook';

interface HandbookViewProps {
  onInjectCode: (sql: string, autoRun?: boolean) => void;
  onOpenEditor: () => void;
}

export const HandbookView: React.FC<HandbookViewProps> = ({
  onInjectCode,
  onOpenEditor
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(UNIVERSITY_HANDBOOK[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(UNIVERSITY_HANDBOOK[0].lessons[0].id);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeChapter = UNIVERSITY_HANDBOOK.find(c => c.id === selectedChapterId) || UNIVERSITY_HANDBOOK[0];
  const activeLesson = activeChapter.lessons.find(l => l.id === selectedLessonId) || activeChapter.lessons[0];

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleRunInEditor = (code: string) => {
    onInjectCode(code, true);
    onOpenEditor();
  };

  const handleInsertInEditor = (code: string) => {
    onInjectCode(code, false);
    onOpenEditor();
  };

  // Icon mapping
  const getChapterIcon = (iconName: string) => {
    switch (iconName) {
      case 'Database': return <Database className="w-4 h-4 text-sky-400" />;
      case 'Table': return <Table className="w-4 h-4 text-emerald-400" />;
      case 'Edit3': return <Edit3 className="w-4 h-4 text-amber-400" />;
      case 'Search': return <Search className="w-4 h-4 text-purple-400" />;
      case 'Layers': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'Link': return <LinkIcon className="w-4 h-4 text-rose-400" />;
      case 'Code': return <Code className="w-4 h-4 text-cyan-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-amber-300" />;
      default: return <BookOpen className="w-4 h-4 text-sky-400" />;
    }
  };

  // Search filter
  const isSearching = searchTerm.trim().length > 0;
  const searchResults: { chapter: HandbookChapter; lesson: HandbookLesson }[] = [];
  if (isSearching) {
    const term = searchTerm.toLowerCase();
    for (const ch of UNIVERSITY_HANDBOOK) {
      for (const les of ch.lessons) {
        if (
          les.title.toLowerCase().includes(term) ||
          les.concept.toLowerCase().includes(term) ||
          les.explanation.toLowerCase().includes(term) ||
          les.codeSnippet.toLowerCase().includes(term)
        ) {
          searchResults.push({ chapter: ch, lesson: les });
        }
      }
    }
  }

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left Sidebar: Chapters & Lessons Index */}
      <div className="w-72 md:w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Header & Search */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 mb-2.5">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Giáo trình T-SQL Đại học
            </h3>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm cú pháp, lệnh, mẹo thi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Index Navigation */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isSearching ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                Kết quả tìm kiếm ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500 text-center italic">
                  Không tìm thấy bài học nào phù hợp.
                </div>
              ) : (
                searchResults.map(({ chapter, lesson }) => (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setSelectedChapterId(chapter.id);
                      setSelectedLessonId(lesson.id);
                      setSearchTerm('');
                    }}
                    className="w-full text-left p-2 rounded text-xs hover:bg-slate-800 transition-colors flex flex-col cursor-pointer"
                  >
                    <span className="font-semibold text-sky-300">{lesson.title}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{chapter.title}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            UNIVERSITY_HANDBOOK.map(chapter => {
              const isChapterSelected = chapter.id === selectedChapterId;

              return (
                <div key={chapter.id} className="rounded border border-slate-800/60 overflow-hidden mb-1.5 bg-slate-950/40">
                  <button
                    onClick={() => {
                      setSelectedChapterId(chapter.id);
                      setSelectedLessonId(chapter.lessons[0].id);
                    }}
                    className={`w-full text-left px-2.5 py-2 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                      isChapterSelected ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getChapterIcon(chapter.iconName)}
                      <span className="truncate">{chapter.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {chapter.lessons.length}
                    </span>
                  </button>

                  {/* Lessons in active chapter */}
                  {isChapterSelected && (
                    <div className="border-t border-slate-800/80 bg-slate-950/70 p-1 space-y-0.5">
                      {chapter.lessons.map(lesson => {
                        const isLessonSelected = lesson.id === activeLesson.id;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setSelectedLessonId(lesson.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                              isLessonSelected
                                ? 'bg-sky-950 text-sky-300 font-medium border border-sky-900/60'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                            }`}
                          >
                            <ChevronRight className={`w-3 h-3 shrink-0 ${isLessonSelected ? 'text-sky-400' : 'text-slate-600'}`} />
                            <span className="truncate">{lesson.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Chuẩn T-SQL 2026</span>
          <span className="text-slate-500">Giáo trình RDBMS</span>
        </div>
      </div>

      {/* Right Content View: Lesson Details & Interactive Code Box */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Breadcrumb & Chapter Title */}
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-400 font-medium mb-1">
              <span>{activeChapter.title}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">Bài học</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {activeLesson.title}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeChapter.description}
            </p>
          </div>

          {/* Core Concept Box */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              <span>Khái niệm trọng tâm (Core Concept)</span>
            </h4>
            <p className="text-xs md:text-[13px] text-slate-300 leading-relaxed">
              {activeLesson.concept}
            </p>
          </div>

          {/* Syntax Box */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Cú pháp chuẩn T-SQL:
            </h4>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {activeLesson.syntax}
            </div>
          </div>

          {/* Detailed Explanation */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Giải thích chi tiết:
            </h4>
            <div className="text-xs md:text-[13px] text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/50 p-4 border border-slate-850 rounded-lg">
              {activeLesson.explanation}
            </div>
          </div>

          {/* Key Rules & Pitfalls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLesson.keyRules && activeLesson.keyRules.length > 0 && (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/60 rounded-lg space-y-2">
                <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quy tắc quan trọng cần nhớ:</span>
                </h5>
                <ul className="space-y-1 text-xs text-slate-300">
                  {activeLesson.keyRules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeLesson.pitfalls && activeLesson.pitfalls.length > 0 && (
              <div className="p-3.5 bg-rose-950/30 border border-rose-900/60 rounded-lg space-y-2">
                <h5 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Lỗi sinh viên thường gặp khi thi:</span>
                </h5>
                <ul className="space-y-1 text-xs text-slate-300">
                  {activeLesson.pitfalls.map((pitfall, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold shrink-0">!</span>
                      <span>{pitfall}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Interactive Code Snippet with Run and Copy Actions */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-4 h-4 text-sky-400" />
                <span>Ví dụ mã nguồn thực hành hoàn chỉnh:</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(activeLesson.codeSnippet, activeLesson.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  {copiedId === activeLesson.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === activeLesson.id ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>

                <button
                  onClick={() => handleInsertInEditor(activeLesson.codeSnippet)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-sky-300 hover:text-white bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded transition-colors cursor-pointer"
                  title="Chèn mã này vào trình soạn thảo để chỉnh sửa"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Vào Editor</span>
                </button>

                <button
                  onClick={() => handleRunInEditor(activeLesson.codeSnippet)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-xs cursor-pointer"
                  title="Chèn mã và thực thi câu lệnh ngay lập tức"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Chạy thử ngay</span>
                </button>
              </div>
            </div>

            <pre className="p-3.5 bg-slate-950 border border-slate-850 rounded-md font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
              {activeLesson.codeSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
