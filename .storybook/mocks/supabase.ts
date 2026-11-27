/**
 * In-memory stand-in for src/lib/supabase.ts, swapped in by .storybook/main.ts.
 * It implements just enough of the query builder for the flows we story:
 * select / insert / update / delete with eq, is, in, order, single, maybeSingle.
 * Seeded rows are returned as-is (the select() column list is ignored), except
 * that `events` rows get their relations attached like EVENT_SELECT asks for.
 */
type Row = Record<string, any>;

export interface MockUser {
  id: string;
  email: string;
}

const tables: Record<string, Row[]> = {};
let currentUser: MockUser | null = null;
let counter = 0;

export const mockDb = {
  /** Replace all data and set who is logged in. */
  reset(seed: Record<string, Row[]> = {}, user: MockUser | null = null) {
    for (const key of Object.keys(tables)) delete tables[key];
    for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));
    currentUser = user;
    counter = 0;
  },
  /** Log in as someone else without touching the data. */
  loginAs(user: MockUser | null) {
    currentUser = user;
  },
  rows(table: string): Row[] {
    return (tables[table] ??= []);
  },
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function withDefaults(table: string, row: Row): Row {
  const id = `${table}-${++counter}`;
  if (table === "events") {
    return { event_id: id, slug: `${slugify(row.title ?? "event")}-${counter}`, created_at: new Date().toISOString(), cancelled_at: null, description: null, ...row };
  }
  if (table === "messages") return { id, created_at: new Date().toISOString(), ...row };
  return { ...row };
}

function hydrate(table: string, row: Row): Row {
  if (table !== "events") return row;
  const profile = (id: string) => mockDb.rows("profiles").find((p) => p.profile_id === id) ?? null;
  return {
    ...row,
    creator: profile(row.creator_id),
    event_interests: mockDb
      .rows("event_interests")
      .filter((ei) => ei.event_id === row.event_id)
      .map((ei) => ({ interests: mockDb.rows("interests").find((i) => i.interest_id === ei.interest_id) })),
    event_participants: mockDb
      .rows("event_participants")
      .filter((p) => p.event_id === row.event_id)
      .map((p) => ({ profile_id: p.profile_id, profiles: profile(p.profile_id) })),
  };
}

class Query implements PromiseLike<{ data: any; error: any }> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private filters: ((r: Row) => boolean)[] = [];
  private returning = false;
  private mode: "many" | "single" | "maybe" = "many";

  constructor(private table: string) {}

  select() {
    this.returning = true;
    return this;
  }
  insert(p: Row | Row[]) {
    this.op = "insert";
    this.payload = p;
    return this;
  }
  update(p: Row) {
    this.op = "update";
    this.payload = p;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  is(col: string, val: unknown) {
    this.filters.push((r) => (r[col] ?? null) === val);
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }
  or() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  private run(): { data: any; error: any } {
    const rows = (tables[this.table] ??= []);
    const matches = (r: Row) => this.filters.every((f) => f(r));
    let result: Row[] = [];

    if (this.op === "insert") {
      result = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((p) => withDefaults(this.table, p));
      rows.push(...result);
    } else if (this.op === "update") {
      result = rows.filter(matches);
      result.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === "delete") {
      result = rows.filter(matches);
      tables[this.table] = rows.filter((r) => !matches(r));
    } else {
      result = rows.filter(matches);
    }

    const out = result.map((r) => hydrate(this.table, r));
    if (this.mode === "single") {
      return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: `Expected 1 row, got ${out.length}` } };
    }
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return { data: this.op === "select" || this.returning ? out : null, error: null };
  }

  then<R1 = { data: any; error: any }, R2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
  }
}

const session = () => (currentUser ? { access_token: `token-${currentUser.id}`, user: currentUser } : null);

export const supabase = {
  from: (table: string) => new Query(table),
  auth: {
    getSession: async () => ({ data: { session: session() }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ data: {}, error: null }),
    signOut: async () => ({ error: null }),
  },
  channel: () => {
    const ch = { on: () => ch, subscribe: () => ch, unsubscribe() {} };
    return ch;
  },
  removeChannel: () => {},
  rpc: async (fn: string, args: Row = {}) => {
    // These mirror supabase/migrations/20261127000200_unsend_unread_messages.sql
    if (fn === "mark_chat_read") {
      const now = new Date().toISOString();
      mockDb.rows("messages").forEach((m) => {
        if (m.sender_id === args.p_buddy_id && m.receiver_id === currentUser?.id && !m.read_at) m.read_at = now;
      });
      return { data: null, error: null };
    }
    if (fn === "unsend_message") {
      const isHi5 = (m: Row) => m.content === "👋";
      const isProposal = (m: Row) => /(^|\n)\/activities\/[a-z0-9-]+\s*$/.test(m.content);
      const msg = mockDb
        .rows("messages")
        .find(
          (m) =>
            m.id === args.p_message_id &&
            m.sender_id === currentUser?.id &&
            !m.unsent_at &&
            (isHi5(m) || (!m.read_at && !isProposal(m))),
        );
      if (!msg) return { data: null, error: { message: "Message can not be unsent" } };
      msg.unsent_at = new Date().toISOString();
      if (!isHi5(msg)) msg.content = "";
      const left = mockDb
        .rows("messages")
        .some((m) => m.sender_id === msg.sender_id && m.receiver_id === msg.receiver_id && isHi5(m) && !m.unsent_at);
      if (isHi5(msg) && !left) {
        tables.hi5s = mockDb.rows("hi5s").filter((h) => !(h.sender_id === msg.sender_id && h.receiver_id === msg.receiver_id));
      }
      return { data: { ...msg }, error: null };
    }
    return { data: null, error: null };
  },
};
