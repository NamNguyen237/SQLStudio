import alasql from 'alasql';

export interface ColumnDefinition {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
}

export interface TableSchemaInfo {
  name: string;
  rowCount: number;
  columns: ColumnDefinition[];
}

export interface DatabaseInfo {
  name: string;
  isSystem?: boolean;
  tablesCount: number;
}

export interface QueryExecutionResult {
  success: boolean;
  data: Record<string, any>[] | null;
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  message: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' | 'USE' | 'OTHER';
  activeDatabase: string;
  executionPlan?: ExecutionPlanNode;
}

export interface ExecutionPlanNode {
  id: string;
  name: string;
  costPercent: number;
  description: string;
  type: 'Scan' | 'Filter' | 'Sort' | 'Aggregate' | 'Join' | 'Select' | 'Insert' | 'Compute';
  details?: Record<string, string | number>;
  children?: ExecutionPlanNode[];
}

export class SqlEngineService {
  private activeDatabase: string = 'master';
  private userDatabases: Set<string> = new Set(['master']);
  // Store table column metadata inferred from CREATE TABLE statements
  private tableMetadata: Record<string, Record<string, ColumnDefinition[]>> = {};

  constructor() {
    this.registerTsqlFunctions();
    this.initMasterDatabase();
  }

  private registerTsqlFunctions() {
    // T-SQL GETDATE()
    alasql.fn.GETDATE = () => {
      const now = new Date();
      return now.toISOString().replace('T', ' ').substring(0, 19);
    };

    // T-SQL ISNULL(expr, replacement)
    alasql.fn.ISNULL = (expr: any, replacement: any) => {
      return expr === null || expr === undefined ? replacement : expr;
    };

    // T-SQL LEN(str)
    alasql.fn.LEN = (str: any) => {
      if (str === null || str === undefined) return 0;
      return String(str).length;
    };

    // T-SQL YEAR, MONTH, DAY
    alasql.fn.YEAR = (d: any) => {
      if (!d) return null;
      return new Date(d).getFullYear();
    };
    alasql.fn.MONTH = (d: any) => {
      if (!d) return null;
      return new Date(d).getMonth() + 1;
    };
    alasql.fn.DAY = (d: any) => {
      if (!d) return null;
      return new Date(d).getDate();
    };

    // T-SQL DATEDIFF(datepart, startdate, enddate)
    alasql.fn.DATEDIFF = (part: any, start: any, end: any) => {
      if (!start || !end) return null;
      const d1 = new Date(start).getTime();
      const d2 = new Date(end).getTime();
      const diffMs = d2 - d1;
      const p = String(part).toLowerCase();
      if (p === 'year' || p === 'yy' || p === 'yyyy') {
        return new Date(end).getFullYear() - new Date(start).getFullYear();
      }
      if (p === 'month' || p === 'm' || p === 'mm') {
        const yDiff = new Date(end).getFullYear() - new Date(start).getFullYear();
        return yDiff * 12 + (new Date(end).getMonth() - new Date(start).getMonth());
      }
      if (p === 'day' || p === 'd' || p === 'dd') {
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    // T-SQL CHARINDEX(substring, string) (1-based index)
    alasql.fn.CHARINDEX = (sub: any, str: any) => {
      if (!sub || !str) return 0;
      return String(str).indexOf(String(sub)) + 1;
    };

    // T-SQL NEWID()
    alasql.fn.NEWID = () => {
      return typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID().toUpperCase() 
        : 'UUID-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    };
  }

  public initMasterDatabase() {
    try {
      if (!alasql.databases._scratchpad_) {
        alasql('CREATE DATABASE _scratchpad_;');
      }
      alasql('USE _scratchpad_;');
      this.activeDatabase = '';
      this.userDatabases = new Set();
      this.tableMetadata = {};
    } catch (err) {
      console.error('Error initializing scratchpad DB:', err);
    }
  }

  public resetAllDatabases() {
    try {
      for (const dbName of Array.from(this.userDatabases)) {
        try {
          alasql(`DROP DATABASE IF EXISTS ${dbName};`);
        } catch {
          // ignore
        }
      }
      alasql('USE _scratchpad_;');
      this.activeDatabase = '';
      this.userDatabases = new Set();
      this.tableMetadata = {};
      return true;
    } catch (err) {
      console.error('Failed to reset databases:', err);
      return false;
    }
  }

  public setActiveDatabase(dbName: string) {
    const trimmed = dbName.trim().replace(/^\[|\]$/g, '');
    if (!trimmed) {
      this.activeDatabase = '';
      return;
    }
    if (!alasql.databases[trimmed]) {
      try {
        alasql(`CREATE DATABASE ${trimmed};`);
      } catch {
        // ignore
      }
    }
    try {
      alasql(`USE ${trimmed};`);
      this.activeDatabase = trimmed;
      this.userDatabases.add(trimmed);
      if (!this.tableMetadata[trimmed]) {
        this.tableMetadata[trimmed] = {};
      }
    } catch (err) {
      console.error(`Cannot switch to database ${trimmed}:`, err);
    }
  }

  public getActiveDatabase(): string {
    return this.activeDatabase;
  }

  public getDatabaseList(): DatabaseInfo[] {
    const dbs: DatabaseInfo[] = [];

    for (const name of Array.from(this.userDatabases)) {
      if (name === 'alasql' || name === '_scratchpad_') continue;
      const tables = alasql.databases[name]?.tables ? Object.keys(alasql.databases[name].tables) : [];
      dbs.push({
        name,
        tablesCount: tables.length
      });
    }

    return dbs;
  }

  private cleanAndSplitStatements(sql: string): string[] {
    // Remove T-SQL comments (single line --)
    let sanitized = sql.replace(/--.*$/gm, '');
    // Remove block comments /* */
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    // Normalize newlines
    sanitized = sanitized.replace(/\r\n/g, '\n');

    // Split on GO batches or semicolons
    const rawBatches = sanitized.split(/^\s*GO\s*$/gim);
    const statements: string[] = [];

    for (const batch of rawBatches) {
      const parts = batch.split(';');
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed) {
          statements.push(trimmed);
        }
      }
    }

    return statements;
  }

  private extractColumnsFromCreateTable(stmt: string): { tableName: string; columns: ColumnDefinition[] } | null {
    // Regex matching CREATE TABLE [name] (...)
    const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\[?dbo\]?\.)?\[?([a-zA-Z0-9_]+)\]?\s*\(([\s\S]+)\)/i);
    if (!match) return null;

    const tableName = match[1];
    const body = match[2];

    const columns: ColumnDefinition[] = [];
    // Split columns by comma, avoiding commas inside parentheses like DECIMAL(18,2)
    const lines: string[] = [];
    let cur = '';
    let parenDepth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      if (ch === ',' && parenDepth === 0) {
        lines.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) lines.push(cur.trim());

    // Check composite primary key at table level: PRIMARY KEY (col1, col2)
    const compositePkCols = new Set<string>();
    for (const line of lines) {
      const pkMatch = line.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkMatch[1].split(',').forEach(c => compositePkCols.add(c.trim().replace(/^\[|\]$/g, '')));
      }
    }

    for (const line of lines) {
      // Skip table-level constraints
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|CHECK|UNIQUE)/i.test(line.trim())) {
        continue;
      }
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const colName = parts[0].replace(/^\[|\]$/g, '');
        const colType = parts[1].replace(/,$/, '');
        const isPk = /PRIMARY\s+KEY/i.test(line) || compositePkCols.has(colName);
        const isFk = /REFERENCES/i.test(line);
        let fkTarget: string | undefined;
        const refMatch = line.match(/REFERENCES\s+\[?([a-zA-Z0-9_]+)\]?\s*\(\s*\[?([a-zA-Z0-9_]+)\]?\s*\)/i);
        if (refMatch) {
          fkTarget = `${refMatch[1]}(${refMatch[2]})`;
        }

        columns.push({
          name: colName,
          type: colType.toUpperCase(),
          isPk,
          isFk,
          fkTarget
        });
      }
    }

    return { tableName, columns };
  }

  private preprocessStatement(sql: string): string {
    let s = sql.trim();
    // Strip T-SQL bracket identifiers: [dbo].[NhanVien] -> NhanVien, [HoTen] -> HoTen
    s = s.replace(/\[(?:dbo\]\.)?\[?([a-zA-Z0-9_]+)\]/g, '$1');
    s = s.replace(/dbo\.([a-zA-Z0-9_]+)/g, '$1');
    // Replace T-SQL N'...' unicode string prefix with '...' for alasql compatibility
    s = s.replace(/N'((?:''|[^'])*)'/g, "'$1'");
    return s;
  }

  public execute(sql: string): QueryExecutionResult {
    const startTime = performance.now();
    const statements = this.cleanAndSplitStatements(sql);

    if (statements.length === 0) {
      return {
        success: true,
        data: [],
        columns: [],
        rowCount: 0,
        executionTimeMs: 0,
        message: 'Lệnh rỗng hoặc chỉ chứa chú thích. Không có truy vấn nào được thực thi.',
        queryType: 'OTHER',
        activeDatabase: this.activeDatabase
      };
    }

    try {
      let lastResult: any = null;
      let totalAffected = 0;
      let lastQueryType: QueryExecutionResult['queryType'] = 'OTHER';
      let lastSelectQuery = '';

      for (const rawStmt of statements) {
        const stmt = this.preprocessStatement(rawStmt);
        if (!stmt) continue;

        const firstWord = stmt.split(/\s+/)[0]?.toUpperCase() || 'SELECT';

        // 1. Handle USE [database]
        const useMatch = stmt.match(/^USE\s+\[?([a-zA-Z0-9_]+)\]?/i);
        if (useMatch) {
          const targetDb = useMatch[1];
          this.setActiveDatabase(targetDb);
          lastQueryType = 'USE';
          lastResult = `Đã chuyển sang cơ sở dữ liệu: ${targetDb}`;
          continue;
        }

        // 2. Handle CREATE DATABASE [name]
        const createDbMatch = stmt.match(/^CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?\[?([a-zA-Z0-9_]+)\]?/i);
        if (createDbMatch) {
          const newDb = createDbMatch[1];
          try {
            alasql(`DROP DATABASE IF EXISTS ${newDb};`);
          } catch {
            // ignore
          }
          alasql(`CREATE DATABASE ${newDb};`);
          this.userDatabases.add(newDb);
          if (!this.tableMetadata[newDb]) {
            this.tableMetadata[newDb] = {};
          }
          lastQueryType = 'CREATE';
          lastResult = `Cơ sở dữ liệu '${newDb}' đã được khởi tạo thành công.`;
          continue;
        }

        // 3. Handle DROP DATABASE [name]
        const dropDbMatch = stmt.match(/^DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?\[?([a-zA-Z0-9_]+)\]?/i);
        if (dropDbMatch) {
          const delDb = dropDbMatch[1];
          alasql(`DROP DATABASE IF EXISTS ${delDb};`);
          this.userDatabases.delete(delDb);
          delete this.tableMetadata[delDb];
          if (this.activeDatabase === delDb) {
            this.setActiveDatabase('master');
          }
          lastQueryType = 'DROP';
          lastResult = `Cơ sở dữ liệu '${delDb}' đã được xóa thành công.`;
          continue;
        }

        // 4. Handle CREATE TABLE metadata extraction
        if (/^CREATE\s+TABLE/i.test(stmt)) {
          const meta = this.extractColumnsFromCreateTable(rawStmt);
          if (meta) {
            const dbKey = this.activeDatabase || '_scratchpad_';
            if (!this.tableMetadata[dbKey]) {
              this.tableMetadata[dbKey] = {};
            }
            this.tableMetadata[dbKey][meta.tableName] = meta.columns;
          }
          lastQueryType = 'CREATE';
        } else if (/^INSERT/i.test(firstWord)) {
          lastQueryType = 'INSERT';
        } else if (/^UPDATE/i.test(firstWord)) {
          lastQueryType = 'UPDATE';
        } else if (/^DELETE/i.test(firstWord)) {
          lastQueryType = 'DELETE';
        } else if (/^ALTER/i.test(firstWord)) {
          lastQueryType = 'ALTER';
        } else if (/^DROP\s+TABLE/i.test(stmt)) {
          lastQueryType = 'DROP';
          const dropTblMatch = stmt.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?\[?([a-zA-Z0-9_]+)\]?/i);
          const dbKey = this.activeDatabase || '_scratchpad_';
          if (dropTblMatch && this.tableMetadata[dbKey]) {
            delete this.tableMetadata[dbKey][dropTblMatch[1]];
          }
        } else if (['SELECT', 'WITH'].includes(firstWord)) {
          lastQueryType = 'SELECT';
          lastSelectQuery = stmt;
        }

        // Ensure we are executing inside active database
        const execDb = this.activeDatabase || '_scratchpad_';
        alasql(`USE ${execDb};`);
        lastResult = alasql(stmt);

        if (typeof lastResult === 'number') {
          totalAffected += lastResult;
        }
      }

      const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

      // Result of SELECT
      if (Array.isArray(lastResult)) {
        const rows = lastResult;
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        const plan = this.generateSimulatedPlan(lastSelectQuery || sql, rows.length);

        return {
          success: true,
          data: rows,
          columns,
          rowCount: rows.length,
          executionTimeMs: Math.max(durationMs, 1),
          message: `Lệnh đã hoàn thành thành công. (${rows.length} hàng được trả về)`,
          queryType: 'SELECT',
          activeDatabase: this.activeDatabase,
          executionPlan: plan
        };
      }

      // Result of DDL / DML / USE
      let message = 'Lệnh đã hoàn thành thành công.';
      if (typeof lastResult === 'string') {
        message = lastResult;
      } else if (lastQueryType === 'INSERT' || lastQueryType === 'UPDATE' || lastQueryType === 'DELETE') {
        const count = typeof lastResult === 'number' ? lastResult : totalAffected;
        message = `(${count} hàng bị ảnh hưởng). Thời gian thực thi: ${Math.max(durationMs, 1)}ms.`;
      } else if (lastQueryType === 'CREATE') {
        message = 'Đối tượng (bảng/cơ sở dữ liệu) đã được tạo thành công.';
      } else if (lastQueryType === 'DROP') {
        message = 'Đối tượng đã được xóa thành công.';
      }

      return {
        success: true,
        data: null,
        columns: [],
        rowCount: typeof lastResult === 'number' ? lastResult : 0,
        executionTimeMs: Math.max(durationMs, 1),
        message,
        queryType: lastQueryType,
        activeDatabase: this.activeDatabase
      };

    } catch (err: any) {
      const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
      const rawError = err?.message || String(err);
      const friendlyError = this.humanizeSqlError(rawError);

      return {
        success: false,
        data: null,
        columns: [],
        rowCount: 0,
        executionTimeMs: Math.max(durationMs, 1),
        message: friendlyError,
        queryType: 'OTHER',
        activeDatabase: this.activeDatabase
      };
    }
  }

  private humanizeSqlError(error: string): string {
    const errLower = error.toLowerCase();
    
    if (errLower.includes('does not exist') || errLower.includes('table does not exist') || errLower.includes('not found')) {
      const match = error.match(/table\s+([a-zA-Z0-9_]+)|column\s+([a-zA-Z0-9_]+)/i);
      const target = match ? (match[1] || match[2]) : '';
      return `Lỗi T-SQL [Msg 208]: Đối tượng không tồn tại ${target ? `'${target}'` : ''}. Hãy kiểm tra xem bạn đã chạy lệnh CREATE TABLE hoặc lệnh USE [TenDB] chưa.`;
    }

    if (errLower.includes('parse error') || errLower.includes('syntax error')) {
      return `Lỗi cú pháp T-SQL [Msg 156]: Cú pháp không hợp lệ gần từ khóa hoặc ký tự trong truy vấn. Gợi ý: Kiểm tra dấu phẩy giữa các cột, cặp ngoặc đơn '()', hoặc thiếu từ khóa GO / chấm phẩy ';'. Chi tiết: ${error}`;
    }

    if (errLower.includes('group by') || errLower.includes('aggregate')) {
      return `Lỗi T-SQL [Msg 8120]: Cột trong mệnh đề SELECT không hợp lệ vì nó không nằm trong hàm tổng hợp (SUM, COUNT, AVG) và không có trong mệnh đề GROUP BY.`;
    }

    return `Lỗi thực thi T-SQL: ${error}`;
  }

  public getDatabaseSchema(dbName: string = this.activeDatabase): TableSchemaInfo[] {
    if (!dbName) return [];
    try {
      const targetDb = alasql.databases[dbName];
      if (!targetDb || !targetDb.tables) return [];

      const tableNames = Object.keys(targetDb.tables);
      const schemas: TableSchemaInfo[] = [];

      for (const tName of tableNames) {
        let count = 0;
        try {
          const res: any = alasql(`SELECT COUNT(*) as cnt FROM ${dbName}.${tName};`);
          count = Array.isArray(res) && res[0] ? Number(res[0].cnt) : 0;
        } catch {
          // ignore
        }

        // Get columns from metadata cache if available
        let cols = this.tableMetadata[dbName]?.[tName];
        if (!cols || cols.length === 0) {
          // Infer from alasql table.columns or sample row
          const alasqlCols = (targetDb.tables[tName] as any)?.columns;
          if (Array.isArray(alasqlCols) && alasqlCols.length > 0) {
            cols = alasqlCols.map((c: any) => ({
              name: c.columnid || c.name || String(c),
              type: (c.dbtypeid || 'NVARCHAR').toUpperCase()
            }));
          } else {
            // Sample select
            try {
              const sample: any = alasql(`SELECT TOP 1 * FROM ${dbName}.${tName};`);
              if (Array.isArray(sample) && sample.length > 0) {
                cols = Object.keys(sample[0]).map(k => ({
                  name: k,
                  type: typeof sample[0][k] === 'number' ? 'INT' : 'NVARCHAR(100)'
                }));
              }
            } catch {
              // ignore
            }
          }
        }

        schemas.push({
          name: tName,
          rowCount: count,
          columns: cols || []
        });
      }

      return schemas;
    } catch (err) {
      console.error(`Error reading schema for ${dbName}:`, err);
      return [];
    }
  }

  public getAllColumnsForAutocomplete(dbName: string = this.activeDatabase): { name: string; table: string; type: string }[] {
    const schemas = this.getDatabaseSchema(dbName);
    const list: { name: string; table: string; type: string }[] = [];
    for (const t of schemas) {
      for (const c of t.columns) {
        list.push({
          name: c.name,
          table: t.name,
          type: c.type
        });
      }
    }
    return list;
  }

  private generateSimulatedPlan(sql: string, rowCount: number): ExecutionPlanNode {
    const upper = sql.toUpperCase();
    const hasJoin = upper.includes('JOIN');
    const hasGroup = upper.includes('GROUP BY');
    const hasSort = upper.includes('ORDER BY');
    const hasWhere = upper.includes('WHERE');
    const hasTop = upper.includes('TOP');

    const root: ExecutionPlanNode = {
      id: 'node-root',
      name: 'SELECT Query',
      costPercent: 0,
      type: 'Select',
      description: 'SQL Server Relational Engine - Trả về tập kết quả cuối cùng',
      details: {
        'Số dòng ước tính': rowCount,
        'Dạng truy vấn': 'Ad-hoc Batch'
      },
      children: []
    };

    let currentCost = 100;
    let parent = root;

    if (hasTop) {
      const topNode: ExecutionPlanNode = {
        id: 'node-top',
        name: 'Top Operator',
        costPercent: 5,
        type: 'Compute',
        description: 'Giới hạn số dòng trả về theo mệnh đề TOP',
        children: []
      };
      parent.children = [topNode];
      parent = topNode;
      currentCost -= 5;
    }

    if (hasSort) {
      const sortNode: ExecutionPlanNode = {
        id: 'node-sort',
        name: 'Sort (ORDER BY)',
        costPercent: 25,
        type: 'Sort',
        description: 'Sắp xếp dữ liệu trong bộ nhớ TempDB',
        details: {
          'Thuật toán': 'QuickSort in-memory'
        },
        children: []
      };
      parent.children = [sortNode];
      parent = sortNode;
      currentCost -= 25;
    }

    if (hasGroup) {
      const groupNode: ExecutionPlanNode = {
        id: 'node-group',
        name: 'Stream / Hash Aggregate',
        costPercent: 20,
        type: 'Aggregate',
        description: 'Gom nhóm bản ghi theo GROUP BY và tính hàm tổng hợp',
        children: []
      };
      parent.children = [groupNode];
      parent = groupNode;
      currentCost -= 20;
    }

    if (hasJoin) {
      const joinNode: ExecutionPlanNode = {
        id: 'node-join',
        name: 'Nested Loops / Hash Match (Join)',
        costPercent: 30,
        type: 'Join',
        description: 'Ghép cặp khóa chính - khóa ngoại giữa các bảng',
        children: [
          {
            id: 'node-scan-1',
            name: 'Clustered Index Scan (Bảng chính)',
            costPercent: 10,
            type: 'Scan',
            description: 'Đọc bảng bên trái',
            details: { 'Đọc I/O': 'Tuần tự' }
          },
          {
            id: 'node-scan-2',
            name: 'Index / Table Scan (Bảng phụ)',
            costPercent: 10,
            type: 'Scan',
            description: 'Tìm kiếm dòng khớp bên bảng liên kết',
            details: { 'Đọc I/O': 'Seek/Scan' }
          }
        ]
      };
      parent.children = [joinNode];
    } else {
      const scanNode: ExecutionPlanNode = {
        id: 'node-scan',
        name: hasWhere ? 'Clustered Index Scan & Filter' : 'Table Scan',
        costPercent: currentCost,
        type: hasWhere ? 'Filter' : 'Scan',
        description: hasWhere ? 'Quét bảng và lọc theo biểu thức WHERE' : 'Quét toàn bộ các trang dữ liệu của bảng',
        details: {
          'Phép lọc': hasWhere ? 'Điều kiện vị từ (Predicate Filter)' : 'Không lọc'
        }
      };
      parent.children = [scanNode];
    }

    return root;
  }

  public exportDatabaseToSqlScript(dbName: string = this.activeDatabase): string {
    if (!dbName) return '-- Chưa chọn CSDL nào để xuất script.';
    const schemas = this.getDatabaseSchema(dbName);
    const lines: string[] = [
      `-- ========================================================`,
      `-- BẢN XUẤT CƠ SỞ DỮ LIỆU T-SQL: ${dbName}`,
      `-- Thời gian xuất: ${new Date().toLocaleString()}`,
      `-- Chạy độc lập 100% offline không cần server`,
      `-- ========================================================`,
      ``,
      `CREATE DATABASE ${dbName};`,
      `GO`,
      `USE ${dbName};`,
      `GO`,
      ``
    ];

    for (const table of schemas) {
      lines.push(`-- Định nghĩa Bảng: ${table.name}`);
      const colDefs = table.columns.map(c => {
        let def = `  ${c.name} ${c.type}`;
        if (c.isPk) def += ' PRIMARY KEY';
        if (c.isFk && c.fkTarget) def += ` FOREIGN KEY REFERENCES ${c.fkTarget}`;
        return def;
      }).join(',\n');

      lines.push(`CREATE TABLE ${table.name} (\n${colDefs || '  ID INT PRIMARY KEY'}\n);`);
      lines.push(`GO`);
      lines.push(``);

      // Export data rows if any
      try {
        const rows: any = alasql(`SELECT * FROM ${dbName}.${table.name};`);
        if (Array.isArray(rows) && rows.length > 0) {
          lines.push(`-- Dữ liệu bảng ${table.name} (${rows.length} dòng)`);
          for (const row of rows) {
            const cols = Object.keys(row);
            const vals = cols.map(col => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              return `N'${String(val).replace(/'/g, "''")}'`;
            });
            lines.push(`INSERT INTO ${table.name} (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
          }
          lines.push(`GO`);
          lines.push(``);
        }
      } catch {
        // ignore
      }
    }

    return lines.join('\n');
  }
}

export const sqlEngine = new SqlEngineService();
