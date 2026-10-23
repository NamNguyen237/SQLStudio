declare module 'alasql' {
  interface AlaSQL {
    (sql: string, params?: any[] | Record<string, any>): any;
    fn: Record<string, Function>;
    databases: Record<string, any>;
    tables: Record<string, any>;
    options: Record<string, any>;
    parse: (sql: string) => any;
  }
  const alasql: AlaSQL;
  export default alasql;
}
