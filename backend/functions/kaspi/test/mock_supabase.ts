// in-memory mock of the subset of supabase-js used by the function
export const DB: Record<string, any[]> = { shop_items: [{ item: "ml", title: "Путь ML-инженера", amount: 4990 }, { item: "all", title: "Все пути", amount: 9990 }], orders: [], purchases: [], progress: [{ user_id: "u1", data: { coupons: { ml: 50 } } }] };
let seq = 0;
class Q {
  t: string; f: ((r: any) => boolean)[] = []; op = "select"; payload: any = null; isSingle = false; maybe = false; lim = 0; ord: any = null; opts: any = {};
  constructor(t: string) { this.t = t; }
  select() { return this; }
  eq(c: string, v: any) { this.f.push(r => r[c] === v); return this; }
  in(c: string, v: any[]) { this.f.push(r => v.includes(r[c])); return this; }
  gte(c: string, v: any) { this.f.push(r => r[c] >= v); return this; }
  order(c: string, o: any) { this.ord = [c, o]; return this; }
  limit(n: number) { this.lim = n; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  upsert(p: any, o: any) { this.op = "upsert"; this.payload = p; this.opts = o; return this; }
  maybeSingle() { this.maybe = true; return this; }
  single() { this.isSingle = true; return this; }
  then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej); }
  run() {
    const T = DB[this.t] = DB[this.t] || [];
    if (this.op === "insert") { const row = { id: "o" + (++seq), status: "new", created_at: new Date().toISOString(), ...this.payload }; T.push(row); return { data: row, error: null }; }
    if (this.op === "upsert") { const p = this.payload; if (!T.find(r => r.user_id === p.user_id && r.item === p.item)) T.push({ ...p, paid_at: new Date().toISOString() }); return { data: null, error: null }; }
    let rows = T.filter(r => this.f.every(f => f(r)));
    if (this.op === "update") { rows.forEach(r => Object.assign(r, this.payload)); return { data: null, error: null }; }
    if (this.lim) rows = rows.slice(0, this.lim);
    if (this.maybe) return { data: rows[0] ?? null, error: null };
    if (this.isSingle) return { data: rows[0], error: null };
    return { data: rows, error: null };
  }
}
export function createClient() {
  return { from: (t: string) => new Q(t), auth: { getUser: async (tok: string) => ({ data: { user: tok === "good" ? { id: "u1" } : null } }) } };
}
