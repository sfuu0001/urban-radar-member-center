/**
 * 数据层替身：用链式 thenable 模拟 PostgREST 查询。
 *
 * 原项目里这些查询打到自建 PostgREST（dishes / profiles / table_carts …）。
 * 抽出来的两个界面不需要真连库，但 UI 会 `await wbDb.from(...).update(...).eq(...)`
 * 并读 `{ data, error }`，所以这里保持同样的形状，统一返回「空数据 + 无错误」，
 * 让界面按乐观路径继续走。
 */

function makeQuery(): any {
  const q: any = new Proxy(
    function () {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          // 让 await 直接得到 { data, error } 信封
          return (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 });
        }
        if (prop === 'catch') return () => q;
        if (prop === 'finally') return (fn: () => void) => { fn(); return q; };
        // select / eq / update / upsert / order / limit / single …一律继续链
        return () => q;
      },
      apply() {
        return q;
      }
    }
  );
  return q;
}

export const wbDb = {
  from(_table: string) {
    return makeQuery();
  },
  rpc(_fn: string, _args?: unknown) {
    return makeQuery();
  }
};

export const wbCloud = {
  database: wbDb,
  auth: {
    getUser: async () => ({ data: { user: null }, error: null })
  }
};

export const WB_APPLICATION_ID = 'demo-app';
export const WB_PUBLIC_CONFIG = { endpoint: '', accessKey: '', publishableKey: '' };
