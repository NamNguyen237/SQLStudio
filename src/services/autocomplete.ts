import { sqlEngine } from './sqlEngine';

export interface SuggestionItem {
  label: string;
  kind: 'keyword' | 'function' | 'table' | 'column' | 'snippet';
  detail: string;
  insertText: string;
  documentation?: string;
}

const TSQL_KEYWORDS: SuggestionItem[] = [
  { label: 'SELECT', kind: 'keyword', detail: 'T-SQL DQL', insertText: 'SELECT ' },
  { label: 'FROM', kind: 'keyword', detail: 'T-SQL Clause', insertText: 'FROM ' },
  { label: 'WHERE', kind: 'keyword', detail: 'T-SQL Filter', insertText: 'WHERE ' },
  { label: 'GROUP BY', kind: 'keyword', detail: 'T-SQL Grouping', insertText: 'GROUP BY ' },
  { label: 'HAVING', kind: 'keyword', detail: 'T-SQL Filter Group', insertText: 'HAVING ' },
  { label: 'ORDER BY', kind: 'keyword', detail: 'T-SQL Sorting', insertText: 'ORDER BY ' },
  { label: 'TOP', kind: 'keyword', detail: 'T-SQL Limit', insertText: 'TOP ' },
  { label: 'DISTINCT', kind: 'keyword', detail: 'T-SQL Unique', insertText: 'DISTINCT ' },
  { label: 'INNER JOIN', kind: 'keyword', detail: 'T-SQL Join', insertText: 'INNER JOIN ' },
  { label: 'LEFT JOIN', kind: 'keyword', detail: 'T-SQL Outer Join', insertText: 'LEFT JOIN ' },
  { label: 'RIGHT JOIN', kind: 'keyword', detail: 'T-SQL Outer Join', insertText: 'RIGHT JOIN ' },
  { label: 'FULL OUTER JOIN', kind: 'keyword', detail: 'T-SQL Join', insertText: 'FULL OUTER JOIN ' },
  { label: 'ON', kind: 'keyword', detail: 'Join condition', insertText: 'ON ' },
  { label: 'AS', kind: 'keyword', detail: 'Alias', insertText: 'AS ' },
  { label: 'AND', kind: 'keyword', detail: 'Logical AND', insertText: 'AND ' },
  { label: 'OR', kind: 'keyword', detail: 'Logical OR', insertText: 'OR ' },
  { label: 'LIKE', kind: 'keyword', detail: 'Pattern matching', insertText: "LIKE '%" },
  { label: 'BETWEEN', kind: 'keyword', detail: 'Range check', insertText: 'BETWEEN ' },
  { label: 'IN', kind: 'keyword', detail: 'Set inclusion', insertText: 'IN (' },
  { label: 'IS NULL', kind: 'keyword', detail: 'Null check', insertText: 'IS NULL' },
  { label: 'IS NOT NULL', kind: 'keyword', detail: 'Non-null check', insertText: 'IS NOT NULL' },
  { label: 'INSERT INTO', kind: 'keyword', detail: 'T-SQL DML', insertText: 'INSERT INTO ' },
  { label: 'VALUES', kind: 'keyword', detail: 'T-SQL Values', insertText: 'VALUES (' },
  { label: 'UPDATE', kind: 'keyword', detail: 'T-SQL DML', insertText: 'UPDATE ' },
  { label: 'SET', kind: 'keyword', detail: 'Update assignment', insertText: 'SET ' },
  { label: 'DELETE FROM', kind: 'keyword', detail: 'T-SQL DML', insertText: 'DELETE FROM ' },
  { label: 'CREATE TABLE', kind: 'keyword', detail: 'T-SQL DDL', insertText: 'CREATE TABLE ' },
  { label: 'PRIMARY KEY', kind: 'keyword', detail: 'Constraint', insertText: 'PRIMARY KEY' },
  { label: 'FOREIGN KEY', kind: 'keyword', detail: 'Constraint', insertText: 'FOREIGN KEY ' },
  { label: 'REFERENCES', kind: 'keyword', detail: 'FK Reference', insertText: 'REFERENCES ' },
  { label: 'UNION ALL', kind: 'keyword', detail: 'Set operation', insertText: 'UNION ALL\n' },
  { label: 'WITH (CTE)', kind: 'snippet', detail: 'Common Table Expr', insertText: 'WITH BangTam AS (\n  SELECT *\n  FROM \n)\nSELECT * FROM BangTam;' },
  { label: 'CASE WHEN', kind: 'snippet', detail: 'Conditional Expression', insertText: 'CASE \n  WHEN dieu_kien THEN gia_tri\n  ELSE gia_tri_khac\nEND' }
];

const TSQL_FUNCTIONS: SuggestionItem[] = [
  { label: 'COUNT()', kind: 'function', detail: 'Đếm số lượng bản ghi', insertText: 'COUNT(*)' },
  { label: 'SUM()', kind: 'function', detail: 'Tính tổng giá trị cột số', insertText: 'SUM()' },
  { label: 'AVG()', kind: 'function', detail: 'Tính giá trị trung bình', insertText: 'AVG()' },
  { label: 'MIN()', kind: 'function', detail: 'Tìm giá trị nhỏ nhất', insertText: 'MIN()' },
  { label: 'MAX()', kind: 'function', detail: 'Tìm giá trị lớn nhất', insertText: 'MAX()' },
  { label: 'GETDATE()', kind: 'function', detail: 'Lấy ngày giờ hiện tại hệ thống', insertText: 'GETDATE()' },
  { label: 'DATEDIFF()', kind: 'function', detail: 'Hiệu số giữa hai ngày', insertText: "DATEDIFF(day, '2024-01-01', GETDATE())" },
  { label: 'YEAR()', kind: 'function', detail: 'Lấy năm từ ngày tháng', insertText: 'YEAR()' },
  { label: 'MONTH()', kind: 'function', detail: 'Lấy tháng từ ngày tháng', insertText: 'MONTH()' },
  { label: 'DAY()', kind: 'function', detail: 'Lấy ngày từ ngày tháng', insertText: 'DAY()' },
  { label: 'ISNULL()', kind: 'function', detail: 'Thay thế nếu NULL', insertText: 'ISNULL(cot, 0)' },
  { label: 'COALESCE()', kind: 'function', detail: 'Giá trị đầu tiên khác NULL', insertText: 'COALESCE(cot1, cot2, 0)' },
  { label: 'LEN()', kind: 'function', detail: 'Độ dài chuỗi ký tự', insertText: 'LEN()' },
  { label: 'SUBSTRING()', kind: 'function', detail: 'Cắt chuỗi con (bắt đầu từ 1)', insertText: 'SUBSTRING(chuoi, 1, 5)' },
  { label: 'CHARINDEX()', kind: 'function', detail: 'Tìm vị trí ký tự trong chuỗi', insertText: "CHARINDEX('ky_tu', chuoi)" },
  { label: 'ROUND()', kind: 'function', detail: 'Làm tròn số thập phân', insertText: 'ROUND(so, 2)' },
  { label: 'ROW_NUMBER()', kind: 'function', detail: 'Hàm cửa sổ đánh số thứ tự', insertText: 'ROW_NUMBER() OVER(PARTITION BY cot ORDER BY cot ASC)' }
];

export function getSuggestions(
  currentText: string,
  cursorPosition: number,
  activeDbId: string
): { suggestions: SuggestionItem[]; wordToReplace: string } {
  // Extract the word immediately before cursor
  const textBeforeCursor = currentText.slice(0, cursorPosition);
  const match = textBeforeCursor.match(/([a-zA-Z0-9_]+)$/);
  const prefix = match ? match[1] : '';

  if (!prefix && textBeforeCursor.slice(-1) !== ' ' && textBeforeCursor.slice(-1) !== '.') {
    return { suggestions: [], wordToReplace: '' };
  }

  const prefixUpper = prefix.toUpperCase();

  // Get dynamic tables and columns
  const tables = sqlEngine.getDatabaseSchema(activeDbId);
  const tableItems: SuggestionItem[] = tables.map(t => ({
    label: t.name,
    kind: 'table',
    detail: `Bảng (${t.rowCount} dòng)`,
    insertText: t.name,
    documentation: `Bảng ${t.name} - Gồm ${t.columns.length} cột`
  }));

  const columnItems: SuggestionItem[] = sqlEngine.getAllColumnsForAutocomplete(activeDbId).map(c => ({
    label: c.name,
    kind: 'column',
    detail: `${c.table} · ${c.type}`,
    insertText: c.name,
    documentation: `Cột của bảng ${c.table}`
  }));

  const allItems: SuggestionItem[] = [
    ...TSQL_KEYWORDS,
    ...TSQL_FUNCTIONS,
    ...tableItems,
    ...columnItems
  ];

  if (!prefix) {
    // Show top keywords and tables
    return {
      suggestions: [...TSQL_KEYWORDS.slice(0, 8), ...tableItems],
      wordToReplace: ''
    };
  }

  // Filter items matching prefix
  const matched = allItems
    .filter(item => item.label.toUpperCase().startsWith(prefixUpper) || item.label.toUpperCase().includes(prefixUpper))
    .sort((a, b) => {
      const aStarts = a.label.toUpperCase().startsWith(prefixUpper);
      const bStarts = b.label.toUpperCase().startsWith(prefixUpper);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.label.localeCompare(b.label);
    })
    .slice(0, 10);

  return {
    suggestions: matched,
    wordToReplace: prefix
  };
}
