// Comprehensive SQL Formatter for T-SQL with strict alias preservation

interface SqlToken {
  type: 'word' | 'bracket' | 'string' | 'quoted' | 'comment' | 'punct' | 'whitespace';
  text: string;
  isNewline?: boolean;
}

const RESERVED_KEYWORDS = new Set([
  'SELECT', 'DISTINCT', 'TOP', 'FROM', 'WHERE', 'AND', 'OR', 'NOT',
  'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'AS', 'BY',
  'GROUP', 'HAVING', 'ORDER', 'ASC', 'DESC',
  'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'JOIN', 'ON',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'DATABASE', 'VIEW', 'PROCEDURE', 'FUNCTION',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CHECK', 'CONSTRAINT', 'DEFAULT',
  'WITH', 'OVER', 'PARTITION', 'UNION', 'ALL',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GETDATE', 'ISNULL', 'DATEDIFF', 'LEN',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'GO', 'USE', 'IF', 'EXISTS', 'TRUNCATE'
]);

function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let i = 0;
  const len = sql.length;

  while (i < len) {
    // 1. Single-line comment: -- ...
    if (sql[i] === '-' && sql[i + 1] === '-') {
      const start = i;
      while (i < len && sql[i] !== '\n') i++;
      tokens.push({ type: 'comment', text: sql.slice(start, i) });
      continue;
    }

    // 2. Multi-line comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      if (i < len) i += 2;
      tokens.push({ type: 'comment', text: sql.slice(start, i) });
      continue;
    }

    // 3. Bracketed identifier: [ ... ] (T-SQL style, e.g. [Mã Sinh Viên])
    if (sql[i] === '[') {
      const start = i;
      i++;
      while (i < len && sql[i] !== ']') i++;
      if (i < len) i++;
      tokens.push({ type: 'bracket', text: sql.slice(start, i) });
      continue;
    }

    // 4. String literal: '...' or N'...'
    if (sql[i] === '\'' || ((sql[i] === 'N' || sql[i] === 'n') && sql[i + 1] === '\'')) {
      const start = i;
      if (sql[i] === 'N' || sql[i] === 'n') i++;
      i++; // skip opening '
      while (i < len) {
        if (sql[i] === '\'') {
          if (sql[i + 1] === '\'') {
            i += 2; // escaped quote ''
          } else {
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      tokens.push({ type: 'string', text: sql.slice(start, i) });
      continue;
    }

    // 5. Double-quoted identifier: "..."
    if (sql[i] === '"') {
      const start = i;
      i++;
      while (i < len && sql[i] !== '"') i++;
      if (i < len) i++;
      tokens.push({ type: 'quoted', text: sql.slice(start, i) });
      continue;
    }

    // 6. Whitespace
    if (/\s/.test(sql[i])) {
      let hasNewline = false;
      const start = i;
      while (i < len && /\s/.test(sql[i])) {
        if (sql[i] === '\n') hasNewline = true;
        i++;
      }
      tokens.push({ type: 'whitespace', text: sql.slice(start, i), isNewline: hasNewline });
      continue;
    }

    // 7. Operators & Punctuation
    if (/[,;()=<>+*\\/!%]/.test(sql[i])) {
      let text = sql[i];
      if ((sql[i] === '<' && (sql[i + 1] === '=' || sql[i + 1] === '>')) ||
          (sql[i] === '>' && sql[i + 1] === '=') ||
          (sql[i] === '!' && sql[i + 1] === '=')) {
        text += sql[i + 1];
        i++;
      }
      tokens.push({ type: 'punct', text });
      i++;
      continue;
    }

    // 8. Word / Identifier / Number
    const start = i;
    while (i < len && !/[\s,;()=<>+*\\/!%'\[\]"]/.test(sql[i])) {
      i++;
    }
    tokens.push({ type: 'word', text: sql.slice(start, i) });
  }

  return tokens;
}

export function formatSql(sql: string): string {
  if (!sql || !sql.trim()) return sql;

  const rawTokens = tokenizeSql(sql);
  const cleanTokens: SqlToken[] = [];

  // Filter out pure whitespace tokens for layout reconstruction, but keep comments
  for (const t of rawTokens) {
    if (t.type !== 'whitespace') {
      cleanTokens.push(t);
    }
  }

  if (cleanTokens.length === 0) return sql.trim();

  // Step 1: Normalize keywords to UPPERCASE, but STRICTLY PRESERVE aliases after AS
  for (let i = 0; i < cleanTokens.length; i++) {
    const token = cleanTokens[i];

    // If it's a bracketed or quoted identifier or string, never change case
    if (token.type !== 'word') continue;

    const prevToken = i > 0 ? cleanTokens[i - 1] : null;
    const isAfterAs = prevToken && prevToken.type === 'word' && prevToken.text.toUpperCase() === 'AS';

    if (isAfterAs) {
      // User-defined alias after AS! Keep EXACT case, spelling, and characters.
      continue;
    }

    const upper = token.text.toUpperCase();
    if (RESERVED_KEYWORDS.has(upper)) {
      token.text = upper;
    }
  }

  // Step 2: Build formatted layout with clean indentation and clause breaks
  let result = '';
  let parenDepth = 0;
  let inSelectClause = false;
  let selectCommasCount = 0;

  // Pre-count commas in the top-level SELECT clause to know if multiline columns look better
  let currentSelectHasCommas = false;
  let tempParen = 0;
  for (let i = 0; i < cleanTokens.length; i++) {
    const t = cleanTokens[i];
    if (t.text === '(') tempParen++;
    else if (t.text === ')') tempParen = Math.max(0, tempParen - 1);
    else if (tempParen === 0 && t.text.toUpperCase() === 'SELECT') {
      for (let j = i + 1; j < cleanTokens.length; j++) {
        const next = cleanTokens[j];
        if (next.text === '(') tempParen++;
        else if (next.text === ')') tempParen = Math.max(0, tempParen - 1);
        else if (tempParen === 0 && next.text.toUpperCase() === 'FROM') break;
        else if (tempParen === 0 && next.text === ',') {
          currentSelectHasCommas = true;
          break;
        }
      }
      break;
    }
  }

  for (let i = 0; i < cleanTokens.length; i++) {
    const token = cleanTokens[i];
    const upper = token.text.toUpperCase();
    const prev = i > 0 ? cleanTokens[i - 1] : null;
    const next = i < cleanTokens.length - 1 ? cleanTokens[i + 1] : null;

    // Track parentheses depth
    if (token.text === '(') parenDepth++;
    if (token.text === ')') parenDepth = Math.max(0, parenDepth - 1);

    // Clause line break checks at top level (parenDepth === 0)
    if (parenDepth === 0) {
      if (upper === 'SELECT') {
        inSelectClause = true;
        selectCommasCount = 0;
        if (result && !result.endsWith('\n\n') && !result.endsWith('\n')) result += '\n';
        result += 'SELECT' + (currentSelectHasCommas ? '\n  ' : ' ');
        continue;
      }

      if (['FROM', 'WHERE', 'HAVING'].includes(upper)) {
        inSelectClause = false;
        result = result.trimEnd() + '\n' + upper + ' ';
        continue;
      }

      if (upper === 'GROUP' && next && next.text.toUpperCase() === 'BY') {
        inSelectClause = false;
        result = result.trimEnd() + '\nGROUP BY ';
        i++; // skip BY
        continue;
      }

      if (upper === 'ORDER' && next && next.text.toUpperCase() === 'BY') {
        inSelectClause = false;
        result = result.trimEnd() + '\nORDER BY ';
        i++; // skip BY
        continue;
      }

      // Joins: INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL JOIN, CROSS JOIN, JOIN
      if (['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'].includes(upper) && next && next.text.toUpperCase() === 'JOIN') {
        inSelectClause = false;
        result = result.trimEnd() + '\n' + upper + ' JOIN ';
        i++; // skip JOIN
        continue;
      }

      if (upper === 'JOIN') {
        inSelectClause = false;
        result = result.trimEnd() + '\nJOIN ';
        continue;
      }

      if (upper === 'ON') {
        result += ' ON ';
        continue;
      }

      if (upper === 'INSERT' && next && next.text.toUpperCase() === 'INTO') {
        if (result && !result.endsWith('\n')) result += '\n';
        result += 'INSERT INTO ';
        i++;
        continue;
      }

      if (upper === 'VALUES') {
        result = result.trimEnd() + '\nVALUES ';
        continue;
      }

      if (upper === 'UPDATE') {
        if (result && !result.endsWith('\n')) result += '\n';
        result += 'UPDATE ';
        continue;
      }

      if (upper === 'SET') {
        result = result.trimEnd() + '\nSET ';
        continue;
      }

      if (upper === 'DELETE' && next && next.text.toUpperCase() === 'FROM') {
        if (result && !result.endsWith('\n')) result += '\n';
        result += 'DELETE FROM ';
        i++;
        continue;
      }

      if (upper === 'UNION') {
        inSelectClause = false;
        if (next && next.text.toUpperCase() === 'ALL') {
          result = result.trimEnd() + '\n\nUNION ALL\n\n';
          i++;
        } else {
          result = result.trimEnd() + '\n\nUNION\n\n';
        }
        continue;
      }

      if (upper === 'GO') {
        inSelectClause = false;
        result = result.trimEnd() + '\nGO\n';
        continue;
      }

      if (upper === 'USE') {
        if (result && !result.endsWith('\n')) result += '\n';
        result += 'USE ';
        continue;
      }
    }

    // Comma formatting
    if (token.text === ',') {
      if (parenDepth === 0 && inSelectClause && currentSelectHasCommas) {
        selectCommasCount++;
        result = result.trimEnd() + ',\n  ';
      } else {
        result = result.trimEnd() + ', ';
      }
      continue;
    }

    // Semicolon formatting
    if (token.text === ';') {
      result = result.trimEnd() + ';\n';
      inSelectClause = false;
      continue;
    }

    // Comment formatting
    if (token.type === 'comment') {
      result = result.trimEnd() + '\n' + token.text + '\n';
      continue;
    }

    // Spacing logic
    const prevText = prev ? prev.text : '';
    const needsSpaceBefore = result.length > 0 &&
      !result.endsWith('\n') &&
      !result.endsWith(' ') &&
      !result.endsWith('(') &&
      token.text !== ')' &&
      token.text !== ',' &&
      token.text !== ';' &&
      !(token.text === '(' && prev && (prev.type === 'word' || prev.type === 'bracket'));

    if (needsSpaceBefore) {
      result += ' ';
    }

    result += token.text;
  }

  // Clean trailing spaces and normalize excessive blank lines
  return result
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
