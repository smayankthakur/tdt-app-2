"use client";
import { useEffect, useState } from "react";
import { Notice, tone } from "./ui";

/**
 * /admin → App Control: one place for what the mobile app and the websites sell outside the readings —
 * Kundli Milan, the 12-month Tarot Report and the courses (on/off, prices, plans, topics, course list).
 * Saved to Firestore config/app; the app and thedivinetarotonline.com read it from GET /api/app/config (≈30 s).
 */
const TOPIC_NAME: Record<string, string> = {
  yearly: "Your Overall Year with Guidance", "no-contact": "His Feelings & Actions — No Contact", affair: "His Feelings & Actions — Affair",
  crush: "His Feelings & Actions — Crush / One-sided", separation: "His Feelings & Actions — Marriage Separation",
};
const EMPTY_COURSE = { id: "", title: "", subtitle: "", price: "", regular: "", enabled: true, days: 365, image: "", highlights: [] as string[], batch: "" };

export default function AppControl({ api, onNote }: { api: (path: string, method?: string, body?: unknown) => Promise<any>; onNote: (s: string) => void }) {
  const [c, setC] = useState<any>(null), [orders, setOrders] = useState<any[]>([]), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [del, setDel] = useState(-1);
  const load = async () => { const j = await api("/api/admin/app-config"); if (j.config) { setC(j.config); setOrders(j.courseOrders || []); } else setMsg(j.error || "Load nahi hua"); };
  useEffect(() => { load(); }, []);
  if (!c) return <p>{msg || "Load ho raha hai…"}</p>;

  const set = (path: string[], v: unknown) => setC((old: any) => {
    const n = structuredClone(old); let o = n;
    for (const k of path.slice(0, -1)) o = o[k];
    o[path[path.length - 1]] = v; return n;
  });
  const setCourse = (i: number, p: object) => set(["courses", "list"], c.courses.list.map((x: any, j: number) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => { const l = [...c.courses.list]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; set(["courses", "list"], l); };
  const save = async () => {
    setBusy(true); setMsg("Save ho raha hai…");
    const j = await api("/api/admin/app-config", "PUT", c);
    setBusy(false);
    if (j.ok) { setC(j.config); setMsg("Saved ✓ — app aur website par 1 minute ke andar dikhega"); onNote(""); } else setMsg(j.error || "Save nahi hua");
  };
  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <label className={`wpa-toggle ${on ? "on" : ""}`}><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span />{on ? "ON" : "OFF"}</label>);
  const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const paid = orders.filter((o) => o.status === "paid");

  return (<>
    {msg && <Notice kind={tone(msg)}>{msg}</Notice>}
    <p className="description">Yahan ki settings <b>mobile app</b> aur websites (<b>thedivinetarotonline.com/kundli-milan</b>, <b>/reports</b>) dono par lagti hain. Readings ki price / on-off &quot;Prices &amp; Offers&quot; mein hai.</p>

    <div className="wpa-postbox"><h2>🔮 Kundli Milan report</h2><div className="inside">
      <table className="wpa-form-table"><tbody>
        <tr><th>App + website par</th><td><Toggle on={c.kundli.enabled} onChange={(v) => set(["kundli", "enabled"], v)} /></td></tr>
        <tr><th>Price (₹)</th><td><input type="number" min={1} value={c.kundli.price} onChange={(e) => set(["kundli", "price"], e.target.value)} />
          <p className="description">Calculate karne ke baad pay karke hi result dikhta hai, aur detailed report email par jaati hai.</p></td></tr>
      </tbody></table>
    </div></div>

    <div className="wpa-postbox"><h2>📜 12-month Tarot Report</h2><div className="inside">
      <table className="wpa-form-table"><tbody><tr><th>App + website par</th><td><Toggle on={c.reports.enabled} onChange={(v) => set(["reports", "enabled"], v)} /></td></tr></tbody></table>
      <table className="wpa-table compact"><thead><tr><th>Plan</th><th style={{ width: 110 }}>On/Off</th><th style={{ width: 150 }}>Price (₹)</th><th style={{ width: 170 }}>PDF kitne din baad</th></tr></thead><tbody>
        {(["standard", "express"] as const).map((k) => { const p = c.reports.plans[k]; return (
          <tr key={k} className={p.enabled ? "" : "past"}><td><b>{k === "standard" ? "Standard" : "Express"}</b></td>
            <td><Toggle on={p.enabled} onChange={(v) => set(["reports", "plans", k, "enabled"], v)} /></td>
            <td><input type="number" min={1} value={p.rupees} onChange={(e) => set(["reports", "plans", k, "rupees"], e.target.value)} /></td>
            <td><input className="sm" type="number" min={1} max={60} value={p.days} onChange={(e) => set(["reports", "plans", k, "days"], e.target.value)} /> din</td></tr>); })}
      </tbody></table>
      <p><b>Topics</b></p>
      <div className="wpa-inline-form">{Object.keys(TOPIC_NAME).map((t) => (
        <label key={t}><input type="checkbox" checked={c.reports.topics[t] !== false} onChange={(e) => set(["reports", "topics", t], e.target.checked)} /> {TOPIC_NAME[t]}</label>))}</div>
      <p className="description">Order ki rakam server khud in prices se banata hai. Purane orders par koi asar nahi.</p>
    </div></div>

    <div className="wpa-postbox"><h2>🎓 Courses</h2><div className="inside">
      <table className="wpa-form-table"><tbody><tr><th>App mein courses</th><td><Toggle on={c.courses.enabled} onChange={(v) => set(["courses", "enabled"], v)} /></td></tr></tbody></table>
      {c.courses.list.map((x: any, i: number) => (
        <div key={i} className="wpa-postbox" style={{ margin: "10px 0", opacity: x.enabled ? 1 : 0.6 }}><div className="inside">
          <div className="wpa-inline-form" style={{ margin: 0 }}>
            <Toggle on={x.enabled} onChange={(v) => setCourse(i, { enabled: v })} />
            <input style={{ minWidth: 260 }} value={x.title} onChange={(e) => setCourse(i, { title: e.target.value })} placeholder="Course ka naam" />
            <input className="sm" style={{ width: 150 }} value={x.subtitle} onChange={(e) => setCourse(i, { subtitle: e.target.value })} placeholder="Level (Beginner…)" />
            <span className="wpa-muted">₹</span><input className="sm" style={{ width: 110 }} type="number" value={x.price} onChange={(e) => setCourse(i, { price: e.target.value })} placeholder="Price" />
            <span className="wpa-muted">Kati hui ₹</span><input className="sm" style={{ width: 110 }} type="number" value={x.regular ?? ""} onChange={(e) => setCourse(i, { regular: e.target.value })} placeholder="—" />
            <span className="wpa-muted">Access</span><input className="sm" type="number" value={x.days} onChange={(e) => setCourse(i, { days: e.target.value })} /> <span className="wpa-muted">din</span>
          </div>
          <div className="wpa-inline-form">
            <span className="wpa-muted">ID</span><input className="sm" style={{ width: 160 }} value={x.id} onChange={(e) => setCourse(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="tarot-beginners" />
            <input style={{ minWidth: 260 }} value={x.batch} onChange={(e) => setCourse(i, { batch: e.target.value })} placeholder="Batch / start date (khaali = nahi)" />
            <input style={{ minWidth: 320 }} value={x.image} onChange={(e) => setCourse(i, { image: e.target.value })} placeholder="Image link https://…" />
          </div>
          <textarea rows={3} style={{ width: "100%" }} value={(x.highlights || []).join("\n")} onChange={(e) => setCourse(i, { highlights: e.target.value.split("\n") })} placeholder="Kya seekhenge — har line ek point" />
          <div className="wpa-row-actions"><a onClick={() => move(i, -1)}>↑ Upar</a> | <a onClick={() => move(i, 1)}>↓ Neeche</a> | {del === i
            ? <><a className="wpa-link-delete" onClick={() => { set(["courses", "list"], c.courses.list.filter((_: any, j: number) => j !== i)); setDel(-1); }}>Pakka hatayein?</a> <a onClick={() => setDel(-1)}>Nahi</a></>
            : <a className="wpa-link-delete" onClick={() => setDel(i)}>Hatayein</a>}</div>
        </div></div>))}
      <p><button className="wpa-btn" onClick={() => set(["courses", "list"], [...c.courses.list, { ...EMPTY_COURSE }])}>+ Course jodein</button></p>
      <p className="description">ID ek baar rakhne ke baad na badlein (purane buyers ka enrolment isi ID se juda hai). OFF course app mein nahi dikhta aur bik nahi sakta.</p>
    </div></div>

    <p><button className="wpa-btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Changes"}</button>
      {c.updatedAt ? <span className="wpa-muted"> &nbsp;Last saved {new Date(c.updatedAt).toLocaleString("en-IN")}{c.updatedBy ? ` by ${c.updatedBy}` : ""}</span> : null}</p>

    <div className="wpa-postbox"><h2>🎓 App se course orders ({paid.length} paid · {inr(paid.reduce((s, o) => s + Number(o.amount || 0), 0))})</h2><div className="inside">
      <table className="wpa-table compact"><thead><tr><th style={{ width: 120 }}>Status</th><th>Course</th><th>Customer</th><th style={{ width: 110 }}>Amount</th><th style={{ width: 190 }}>Date</th></tr></thead><tbody>
        {!orders.length && <tr><td colSpan={5}>Abhi app se koi course order nahi hai.</td></tr>}
        {orders.map((o) => (
          <tr key={o.cid} className={o.status === "paid" ? "" : "past"}>
            <td>{o.status === "paid" ? <span className="wpa-status ok">Paid</span> : <span className="wpa-status">Payment pending</span>}</td>
            <td><b>{o.title}</b><div className="wpa-muted">{o.cid}{o.paymentId ? ` · ${o.paymentId}` : ""}</div></td>
            <td>{o.name || "—"}<div className="wpa-muted">{o.email}{o.phone ? ` · ${o.phone}` : ""}</div></td>
            <td>{inr(o.amount)}</td>
            <td>{new Date(o.paidAt || o.createdAt).toLocaleString("en-IN")}{o.until ? <div className="wpa-muted">Access till {new Date(o.until).toLocaleDateString("en-IN")}</div> : null}</td>
          </tr>))}
      </tbody></table>
      <p className="description">Paid hote hi customer ko welcome email aur owner email par notice jaata hai — course login 2 din ke andar bhejein.</p>
    </div></div>
  </>);
}
