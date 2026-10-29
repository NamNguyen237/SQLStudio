import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  Network, 
  Key, 
  Link as LinkIcon, 
  Database, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  LayoutGrid, 
  Download,
  Info,
  Sparkles,
  Search
} from 'lucide-react';
import { TableSchemaInfo } from '../../services/sqlEngine';

interface ErDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDatabaseId: string;
  schemas: TableSchemaInfo[];
  onInjectSample?: () => void;
}

interface Relationship {
  id: string;
  fromTable: string;
  fromCol: string;
  toTable: string;
  toCol: string;
}

interface TablePosition {
  x: number;
  y: number;
}

const TABLE_WIDTH = 250;
const HEADER_HEIGHT = 38;
const INFO_HEIGHT = 26;
const ROW_HEIGHT = 30;

export const ErDiagramModal: React.FC<ErDiagramModalProps> = ({
  isOpen,
  onClose,
  activeDatabaseId,
  schemas,
  onInjectSample
}) => {
  const [viewMode, setViewMode] = useState<'access' | 'grid'>('access');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<{ table: string; col: string } | null>(null);

  // Table positions for draggable canvas
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});

  // Dragging state
  const [dragState, setDragState] = useState<{
    tableName: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Extract all foreign key relationships: fromTable (FK, ∞ side) -> toTable (PK, 1 side)
  const relationships: Relationship[] = useMemo(() => {
    const rels: Relationship[] = [];
    for (const table of schemas) {
      for (const col of table.columns) {
        if (col.isFk && col.fkTarget) {
          const match = col.fkTarget.match(/([a-zA-Z0-9_]+)\(([a-zA-Z0-9_]+)\)/);
          if (match) {
            rels.push({
              id: `${table.name}.${col.name}->${match[1]}.${match[2]}`,
              fromTable: table.name,
              fromCol: col.name,
              toTable: match[1],
              toCol: match[2]
            });
          }
        }
      }
    }
    return rels;
  }, [schemas]);

  // Compute intelligent hierarchical / grid auto-layout
  const computeAutoLayout = useCallback((tables: TableSchemaInfo[]) => {
    if (tables.length === 0) return {};

    // Build dependency graph to place parent tables on the left and child/junction tables on the right
    // Parent table = referenced by others (outgoing PK, incoming FK references)
    // Child table = references others (has FK)
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    for (const t of tables) {
      inDegree[t.name] = 0;
      outDegree[t.name] = 0;
    }

    for (const rel of relationships) {
      if (inDegree[rel.fromTable] !== undefined) inDegree[rel.fromTable]++;
      if (outDegree[rel.toTable] !== undefined) outDegree[rel.toTable]++;
    }

    // Assign rank: tables with 0 FKs get rank 0 (left column), tables referencing rank 0 get rank 1, etc.
    const ranks: Record<string, number> = {};
    for (const t of tables) {
      const hasFk = t.columns.some(c => c.isFk);
      ranks[t.name] = hasFk ? (t.columns.filter(c => c.isFk).length > 1 ? 2 : 1) : 0;
    }

    // Group tables by rank
    const rankGroups: Record<number, string[]> = { 0: [], 1: [], 2: [] };
    for (const t of tables) {
      const r = ranks[t.name] ?? 0;
      if (!rankGroups[r]) rankGroups[r] = [];
      rankGroups[r].push(t.name);
    }

    const newPositions: Record<string, TablePosition> = {};
    const colSpacing = 360; // horizontal spacing between columns
    const startX = 50;
    const startY = 40;

    // Place each rank in its column
    let currentX = startX;
    [0, 1, 2].forEach(r => {
      const list = rankGroups[r] || [];
      if (list.length === 0) return;
      let curY = startY;
      list.forEach(tableName => {
        const table = tables.find(t => t.name === tableName);
        const colCount = table ? table.columns.length : 4;
        const estimatedHeight = HEADER_HEIGHT + INFO_HEIGHT + colCount * ROW_HEIGHT + 30;

        newPositions[tableName] = {
          x: currentX,
          y: curY
        };
        curY += estimatedHeight + 40; // spacing between tables in same column
      });
      currentX += colSpacing;
    });

    // In case any table was missed
    tables.forEach((t, i) => {
      if (!newPositions[t.name]) {
        newPositions[t.name] = {
          x: startX + (i % 3) * colSpacing,
          y: startY + Math.floor(i / 3) * 280
        };
      }
    });

    return newPositions;
  }, [relationships]);

  // Initialize or re-layout when schemas change
  useEffect(() => {
    if (schemas.length > 0) {
      setPositions(computeAutoLayout(schemas));
    }
  }, [schemas, computeAutoLayout]);

  // Pointer drag event handlers for moving table windows
  const handlePointerDown = (tableName: string, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const currentPos = positions[tableName] || { x: 50, y: 50 };
    setDragState({
      tableName,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentPos.x,
      origY: currentPos.y
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const deltaX = (e.clientX - dragState.startX) / zoom;
    const deltaY = (e.clientY - dragState.startY) / zoom;

    setPositions(prev => ({
      ...prev,
      [dragState.tableName]: {
        x: Math.max(10, Math.round(dragState.origX + deltaX)),
        y: Math.max(10, Math.round(dragState.origY + deltaY))
      }
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragState(null);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPositions(computeAutoLayout(schemas));
  };

  // Calculate connection lines paths between specific column rows
  const connectorLines = useMemo(() => {
    return relationships.map(rel => {
      const fromPos = positions[rel.fromTable];
      const toPos = positions[rel.toTable];
      if (!fromPos || !toPos) return null;

      const fromTableObj = schemas.find(s => s.name === rel.fromTable);
      const toTableObj = schemas.find(s => s.name === rel.toTable);

      const fromColIndex = fromTableObj?.columns.findIndex(c => c.name.toLowerCase() === rel.fromCol.toLowerCase()) ?? 0;
      const toColIndex = toTableObj?.columns.findIndex(c => c.name.toLowerCase() === rel.toCol.toLowerCase()) ?? 0;

      // Calculate Y coordinate for the center of the column row
      const fromY = fromPos.y + HEADER_HEIGHT + INFO_HEIGHT + fromColIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      const toY = toPos.y + HEADER_HEIGHT + INFO_HEIGHT + toColIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      // Determine horizontal connection points (Left or Right edge of table)
      let fromX: number;
      let toX: number;
      let fromDir: number; // 1 for right, -1 for left
      let toDir: number;

      if (fromPos.x + TABLE_WIDTH < toPos.x) {
        // fromTable is on the left of toTable
        fromX = fromPos.x + TABLE_WIDTH;
        toX = toPos.x;
        fromDir = 1;
        toDir = -1;
      } else if (toPos.x + TABLE_WIDTH < fromPos.x) {
        // toTable is on the left of fromTable
        fromX = fromPos.x;
        toX = toPos.x + TABLE_WIDTH;
        fromDir = -1;
        toDir = 1;
      } else {
        // Overlapping horizontally: connect on whichever side has more room
        if (fromPos.x < toPos.x) {
          fromX = fromPos.x;
          toX = toPos.x + TABLE_WIDTH;
          fromDir = -1;
          toDir = 1;
        } else {
          fromX = fromPos.x + TABLE_WIDTH;
          toX = toPos.x;
          fromDir = 1;
          toDir = -1;
        }
      }

      // Smooth Access-style cubic bezier connector
      const dx = Math.max(Math.abs(toX - fromX) * 0.5, 45);
      const cp1x = fromX + fromDir * dx;
      const cp1y = fromY;
      const cp2x = toX + toDir * dx;
      const cp2y = toY;

      const pathData = `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;

      // Calculate label coordinates:
      // FK side (fromTable, ∞ side): offset from fromX, fromY
      const fkLabelX = fromX + fromDir * 16;
      const fkLabelY = fromY;

      // PK side (toTable, 1 side): offset from toX, toY
      const pkLabelX = toX + toDir * 16;
      const pkLabelY = toY;

      const isHovered = hoveredRelId === rel.id ||
        hoveredTable === rel.fromTable ||
        hoveredTable === rel.toTable ||
        (hoveredCol && hoveredCol.table === rel.fromTable && hoveredCol.col === rel.fromCol) ||
        (hoveredCol && hoveredCol.table === rel.toTable && hoveredCol.col === rel.toCol);

      return {
        rel,
        pathData,
        fromX,
        fromY,
        toX,
        toY,
        fkLabelX,
        fkLabelY,
        pkLabelX,
        pkLabelY,
        isHovered
      };
    }).filter(Boolean);
  }, [relationships, positions, schemas, hoveredRelId, hoveredTable, hoveredCol]);

  // Export current diagram as SVG file
  const handleExportSvg = () => {
    if (!canvasRef.current) return;
    const svgContent = canvasRef.current.querySelector('svg');
    if (!svgContent) return;

    // Clone and generate downloadable file
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgContent);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ERD_${activeDatabaseId || 'Database'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4">
      <div 
        className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'w-full h-full max-w-none max-h-none rounded-none' 
            : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Top Window Header (Microsoft Access / SSMS Style) */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-950 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-600/40 flex items-center justify-center shrink-0">
              <Network className="w-4 h-4 text-sky-400" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-xs sm:text-sm truncate">
                  Sơ đồ Quan hệ (Relationships): <span className="text-sky-400 font-mono">{activeDatabaseId || 'master'}</span>
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded-full font-mono border border-slate-700">
                  {schemas.length} bảng · {relationships.length} mối quan hệ
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Mô phỏng cửa sổ Relationships trong Microsoft Access & Database Diagrams trong SSMS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setViewMode('access')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  viewMode === 'access' 
                    ? 'bg-sky-600 text-white font-medium shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sơ đồ tương tác kéo thả & đường nối quan hệ kiểu Microsoft Access"
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sơ đồ Access</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-sky-600 text-white font-medium shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Xem danh sách bảng dạng lưới thẻ"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Dạng lưới</span>
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng sơ đồ (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Bar for Access Canvas */}
        {viewMode === 'access' && (
          <div className="px-3 sm:px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-2 select-none">
            {/* Left controls: Auto-arrange, Zoom, Reset */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPositions(computeAutoLayout(schemas))}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer border border-slate-700"
                title="Tự động căn chỉnh vị trí các bảng theo cấu trúc quan hệ cha - con"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sắp xếp tự động</span>
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <button
                onClick={handleZoomIn}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[11px] font-mono text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomOut}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                title="Đặt lại mức thu phóng (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <button
                onClick={handleExportSvg}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer border border-slate-700"
                title="Tải về file đồ họa vector SVG của sơ đồ"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Xuất SVG</span>
              </button>
            </div>

            {/* Right: Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Tìm bảng hoặc cột..."
                className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 sm:w-48"
              />
            </div>
          </div>
        )}

        {/* Canvas Body */}
        {viewMode === 'access' ? (
          <div 
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex-1 relative overflow-auto bg-slate-950 select-none cursor-default"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {schemas.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <Database className="w-12 h-12 text-slate-600 mb-3" />
                <h4 className="text-sm font-semibold text-slate-300 mb-1">
                  Chưa có bảng nào trong cơ sở dữ liệu &quot;{activeDatabaseId || 'master'}&quot;
                </h4>
                <p className="text-xs text-slate-500 max-w-md">
                  Hãy chạy câu lệnh CREATE TABLE với các ràng buộc PRIMARY KEY và FOREIGN KEY (như CSDL Quản lý Sinh viên) để hệ thống tự động vẽ sơ đồ quan hệ!
                </p>
                {onInjectSample && (
                  <button
                    onClick={onInjectSample}
                    className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-950/50 transition-all hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Tạo mẫu CSDL QLSV (4 bảng có quan hệ)</span>
                  </button>
                )}
              </div>
            ) : (
              <div 
                className="relative min-w-[1200px] min-h-[900px] p-8 origin-top-left transition-transform duration-75"
                style={{ transform: `scale(${zoom})` }}
              >
                {/* SVG Connections Layer */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  style={{ minWidth: '1200px', minHeight: '900px' }}
                >
                  <defs>
                    {/* Glow filter for active/hovered connector */}
                    <filter id="erd-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {connectorLines.map((line) => {
                    if (!line) return null;
                    const { rel, pathData, fromX, fromY, toX, toY, fkLabelX, fkLabelY, pkLabelX, pkLabelY, isHovered } = line;

                    return (
                      <g 
                        key={rel.id} 
                        className="cursor-pointer pointer-events-auto transition-all"
                        onMouseEnter={() => setHoveredRelId(rel.id)}
                        onMouseLeave={() => setHoveredRelId(null)}
                      >
                        {/* Invisible thicker stroke for easy hover */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="18"
                        />

                        {/* Glow halo when hovered */}
                        {isHovered && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="6"
                            strokeOpacity="0.4"
                            filter="url(#erd-glow)"
                          />
                        )}

                        {/* Visible Connector Line (Microsoft Access / SSMS Style) */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke={isHovered ? '#38bdf8' : '#64748b'}
                          strokeWidth={isHovered ? '2.5' : '1.75'}
                          strokeDasharray={isHovered ? 'none' : 'none'}
                          className="transition-colors duration-150"
                        />

                        {/* Endpoint Circle: FK side (fromTable) */}
                        <circle
                          cx={fromX}
                          cy={fromY}
                          r={isHovered ? 4.5 : 3.5}
                          fill={isHovered ? '#38bdf8' : '#10b981'}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />

                        {/* Endpoint Circle: PK side (toTable) */}
                        <circle
                          cx={toX}
                          cy={toY}
                          r={isHovered ? 4.5 : 3.5}
                          fill={isHovered ? '#38bdf8' : '#f59e0b'}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />

                        {/* Access Symbol on FK side: "∞" (Many side) */}
                        <g transform={`translate(${fkLabelX}, ${fkLabelY})`}>
                          <rect
                            x="-10"
                            y="-9"
                            width="20"
                            height="18"
                            rx="4"
                            fill="#0f172a"
                            stroke={isHovered ? '#38bdf8' : '#10b981'}
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fill={isHovered ? '#38bdf8' : '#34d399'}
                            fontSize="13"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            ∞
                          </text>
                        </g>

                        {/* Access Symbol on PK side: "1" (One side) */}
                        <g transform={`translate(${pkLabelX}, ${pkLabelY})`}>
                          <rect
                            x="-9"
                            y="-9"
                            width="18"
                            height="18"
                            rx="4"
                            fill="#0f172a"
                            stroke={isHovered ? '#38bdf8' : '#f59e0b'}
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fill={isHovered ? '#38bdf8' : '#fbbf24'}
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            1
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>

                {/* Draggable Table Windows Layer */}
                {schemas.map(table => {
                  const pos = positions[table.name] || { x: 50, y: 50 };
                  const isTableHovered = hoveredTable === table.name;
                  const isConnected = relationships.some(
                    r => (r.fromTable === table.name || r.toTable === table.name) && r.id === hoveredRelId
                  );

                  // Filter columns if search filter is active
                  const filteredColumns = searchFilter
                    ? table.columns.filter(c => 
                        c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        table.name.toLowerCase().includes(searchFilter.toLowerCase())
                      )
                    : table.columns;

                  return (
                    <div
                      key={table.name}
                      onMouseEnter={() => setHoveredTable(table.name)}
                      onMouseLeave={() => setHoveredTable(null)}
                      style={{
                        position: 'absolute',
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: `${TABLE_WIDTH}px`,
                        zIndex: isTableHovered || isConnected ? 25 : 20
                      }}
                      className={`bg-slate-900 border rounded-lg shadow-xl overflow-hidden transition-shadow select-none ${
                        isTableHovered || isConnected
                          ? 'border-sky-500 shadow-sky-950/60 ring-2 ring-sky-500/20'
                          : 'border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      {/* Table Window Header (Draggable Handle) */}
                      <div
                        onPointerDown={e => handlePointerDown(table.name, e)}
                        className="px-3 py-2 bg-gradient-to-r from-sky-950 via-slate-900 to-slate-950 border-b border-sky-900/60 flex items-center justify-between cursor-grab active:cursor-grabbing text-xs touch-none"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Database className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="font-bold text-white tracking-wide truncate">
                            {table.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-sky-300 font-mono px-1.5 py-0.5 bg-sky-900/60 rounded border border-sky-800/60 shrink-0">
                          {table.rowCount} dòng
                        </span>
                      </div>

                      {/* Info Sub-strip */}
                      <div className="px-3 py-1 bg-slate-950/60 border-b border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>{table.columns.length} thuộc tính</span>
                        <span className="text-slate-500 font-mono">dbo.{table.name}</span>
                      </div>

                      {/* Field / Column Rows */}
                      <div className="divide-y divide-slate-800/50 bg-slate-900/95 max-h-[360px] overflow-y-auto">
                        {filteredColumns.map(col => {
                          const isColHovered = hoveredCol?.table === table.name && hoveredCol?.col === col.name;
                          return (
                            <div
                              key={col.name}
                              onMouseEnter={() => setHoveredCol({ table: table.name, col: col.name })}
                              onMouseLeave={() => setHoveredCol(null)}
                              style={{ height: `${ROW_HEIGHT}px` }}
                              className={`px-2.5 flex items-center justify-between text-xs transition-colors ${
                                isColHovered ? 'bg-sky-950/60' : 'hover:bg-slate-800/60'
                              }`}
                            >
                              {/* Left: Key indicator and Column Name */}
                              <div className="flex items-center gap-1.5 truncate min-w-0">
                                {col.isPk ? (
                                  <span className="flex items-center gap-0.5 text-amber-400 shrink-0" title="Khóa chính (Primary Key)">
                                    <Key className="w-3 h-3 fill-amber-400/20" />
                                    <span className="text-[9px] font-mono font-bold">PK</span>
                                  </span>
                                ) : col.isFk ? (
                                  <span className="flex items-center gap-0.5 text-emerald-400 shrink-0" title={`Khóa ngoại (Foreign Key) liên kết tới: ${col.fkTarget || ''}`}>
                                    <LinkIcon className="w-3 h-3" />
                                    <span className="text-[9px] font-mono font-bold">FK</span>
                                  </span>
                                ) : (
                                  <span className="w-6 shrink-0" />
                                )}

                                <span className={`font-mono text-[11.5px] truncate ${
                                  col.isPk 
                                    ? 'text-amber-200 font-bold' 
                                    : col.isFk 
                                    ? 'text-emerald-200 font-medium' 
                                    : 'text-slate-200'
                                }`}>
                                  {col.name}
                                </span>
                              </div>

                              {/* Right: Data Type and FK target badge */}
                              <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                {col.fkTarget && (
                                  <span 
                                    className="text-[9px] text-emerald-400/90 font-mono bg-emerald-950/50 px-1 rounded border border-emerald-800/40 truncate max-w-[85px]"
                                    title={`Tham chiếu tới ${col.fkTarget}`}
                                  >
                                    ➔ {col.fkTarget}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {col.type}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Grid View (Alternative Card Grid) */
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950/70">
            {/* Relationship Badges Bar */}
            <div className="mb-6 p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Các mối liên kết quan hệ trong CSDL ({relationships.length}):
              </h4>
              {relationships.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Chưa có khóa ngoại (FOREIGN KEY) nào được định nghĩa giữa các bảng.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 text-xs">
                  {relationships.map((rel, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-md font-mono text-[11.5px]">
                      <span className="text-emerald-400 font-semibold">{rel.fromTable}.{rel.fromCol}</span>
                      <span className="text-slate-500 px-1">─── 1 : ∞ ───►</span>
                      <span className="text-amber-400 font-semibold">{rel.toTable}.{rel.toCol}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tables Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schemas.map(table => (
                <div 
                  key={table.name}
                  className="bg-slate-900 border border-slate-750 rounded-lg overflow-hidden shadow-lg flex flex-col"
                >
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
        )}

        {/* Bottom Status / Legend Bar (MS Access Style) */}
        <div className="px-3 sm:px-5 py-2.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 select-none">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Kéo thanh tiêu đề bảng để di chuyển</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span><strong>1</strong> = Phía khóa chính (PK)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span><strong>∞</strong> = Phía khóa ngoại (FK - Many)</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 rounded-md transition-colors cursor-pointer ml-auto"
          >
            Đóng sơ đồ
          </button>
        </div>
      </div>
    </div>
  );
};
