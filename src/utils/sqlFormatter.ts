const MAJOR_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
  'JOIN', 'ON', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'UNION ALL', 'UNION',
  'WITH'
];

export function formatSql(sql: string): string {
  if (!sql.trim()) return sql;

  let formatted = sql;

  // Normalize spaces
  formatted = formatted.replace(/\t/g, '  ');

  // Ensure major keywords are uppercase
  const allKeywords = [
    'SELECT', 'DISTINCT', 'TOP', 'FROM', 'WHERE', 'AND', 'OR', 'NOT',
    'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'AS',
    'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC',
    'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'JOIN', 'ON',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'PRIMARY KEY', 'FOREIGN KEY',
    'REFERENCES', 'WITH', 'OVER', 'PARTITION BY', 'UNION ALL', 'UNION',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GETDATE', 'ISNULL', 'DATEDIFF', 'LEN'
  ];

  for (const kw of allKeywords) {
    const regex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    formatted = formatted.replace(regex, kw);
  }

  // Break lines for major clauses
  for (const kw of MAJOR_KEYWORDS) {
    const regex = new RegExp(`\\s*\\b(${kw})\\b\\s*`, 'g');
    formatted = formatted.replace(regex, `\n$1 `);
  }

  // Clean double newlines and trim each line
  const lines = formatted
    .split('\n')
    .map(line => line.trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0));

  // Indent continuation clauses
  const resultLines: string[] = [];
  for (const line of lines) {
    const isMajor = MAJOR_KEYWORDS.some(kw => line.startsWith(kw));
    if (isMajor || line.startsWith('--') || line.startsWith('/*')) {
      resultLines.push(line);
    } else {
      resultLines.push('  ' + line);
    }
  }

  return resultLines.join('\n').trim();
}
