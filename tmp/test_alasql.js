const alasql = require('alasql');
try {
  alasql('CREATE DATABASE testdb;');
  alasql('USE testdb;');
  alasql('CREATE TABLE sv (masv STRING, hoten STRING);');
  alasql("INSERT INTO sv VALUES ('SV01', 'An'), ('SV02', 'Binh');");
  console.log('Tables:', Object.keys(alasql.databases.testdb.tables));
  alasql('CREATE VIEW view_sv AS SELECT * FROM sv;');
  console.log('Views:', alasql.databases.testdb.views);
  const res = alasql('SELECT * FROM view_sv;');
  console.log('View SELECT result:', res);
} catch (e) {
  console.error('Error:', e.message);
}
