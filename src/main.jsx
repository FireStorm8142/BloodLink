import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Activity, AlertTriangle, Bell, Boxes, ChevronDown, Clock3, Droplets, LayoutDashboard, MapPin, Menu, PackageCheck, Radio, RefreshCw, Search, Settings, ShieldCheck, Thermometer, Wifi, X } from "lucide-react";
import "./styles.css";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const db = URL && KEY ? createClient(URL, KEY) : null;
const nav = [["Overview", LayoutDashboard], ["Inventory", Boxes], ["Storage", PackageCheck], ["Alerts", Bell], ["Activity Log", Activity], ["Connectivity", Wifi], ["Settings", Settings]];

const date = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dateTime = (v) => v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const ago = (v) => {
  if (!v) return "time unavailable";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(v).getTime()) / 60000));
  return mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.floor(mins / 60)} hr ago` : `${Math.floor(mins / 1440)} days ago`;
};
function statusOf(b) {
  const s = String(b.status || "Available");
  if (s.toLowerCase() === "expired" || (b.expiry_date && new Date(b.expiry_date) < new Date(new Date().toDateString()))) return "Expired";
  if (s.toLowerCase().includes("discard")) return "Discarded";
  if (s.toLowerCase().includes("issued")) return "Issued";
  if (s.toLowerCase().includes("expir") || (b.expiry_date && (new Date(b.expiry_date) - Date.now()) / 86400000 <= 7 && new Date(b.expiry_date) >= new Date(new Date().toDateString()))) return "Expiring";
  return s;
}

function App() {
  const [active, setActive] = useState("Overview");
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [bags, setBags] = useState([]), [slots, setSlots] = useState([]), [temps, setTemps] = useState([]), [events, setEvents] = useState([]), [alerts, setAlerts] = useState([]), [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState(""), [lastSync, setLastSync] = useState(null);

  const load = useCallback(async (quiet = false) => {
    if (!db) { setError("Supabase isn't configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY variables to .env."); setLoading(false); return; }
    quiet ? setRefreshing(true) : setLoading(true); setError("");
    const requests = await Promise.all([
      db.from("blood_bags").select("id,bag_code,rfid_uid,blood_group,collection_date,expiry_date,status,slot_id,created_at,updated_at").order("created_at", { ascending: false }),
      db.from("storage_slots").select("id,rack_code,slot_code,occupied,sensor_id,updated_at").order("rack_code").order("slot_code"),
      db.from("temp_logs").select("id,device_id,temp_c,recorded_at").order("recorded_at", { ascending: false }).limit(30),
      db.from("activity_logs").select("id,bag_id,event_type,description,old_slot_id,new_slot_id,created_at").order("created_at", { ascending: false }).limit(8),
      db.from("alerts").select("id,alert_type,severity,message,bag_id,resolved,created_at,updated_at").eq("resolved", false).order("created_at", { ascending: false }).limit(8),
      db.from("devices").select("id,device_code,device_name,status,last_seen_at,created_at").order("device_code")
    ]);
    const names = ["blood bags", "storage slots", "temperature logs", "activity logs", "alerts", "devices"];
    const bad = requests.findIndex(r => r.error);
    if (bad >= 0) setError(`Couldn't load ${names[bad]}: ${requests[bad].error.message}`);
    else {
      setBags(requests[0].data || []); setSlots(requests[1].data || []); setTemps(requests[2].data || []); setEvents(requests[3].data || []); setAlerts(requests[4].data || []); setDevices(requests[5].data || []); setLastSync(new Date());
    }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); const t = window.setInterval(() => load(true), 30000); return () => window.clearInterval(t); }, [load]);
  const slotById = useMemo(() => new Map(slots.map(s => [s.id, s])), [slots]);
  const joinedBags = useMemo(() => bags.map(b => ({ ...b, slot: slotById.get(b.slot_id), displayStatus: statusOf(b) })), [bags, slotById]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return joinedBags.filter(b => !q || [b.bag_code,b.blood_group,b.status,b.slot?.slot_code,b.slot?.rack_code,b.rfid_uid].filter(Boolean).join(" ").toLowerCase().includes(q)); }, [joinedBags, query]);
  const latestTemp = temps[0]?.temp_c;
  const online = devices.filter(d => d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 120000).length;
  const available = joinedBags.filter(b => ["available","expiring"].includes(String(b.displayStatus).toLowerCase())).length;
  const expiring = joinedBags.filter(b => b.displayStatus === "Expiring").length;
  const bagForSlot = useMemo(() => new Map(joinedBags.filter(b => b.slot_id).map(b => [b.slot_id, b])), [joinedBags]);

  if (!db) return <div className="setupScreen"><div className="setupCard"><div className="brandMark"><Droplets size={19}/></div><h1>Connect BloodLink to Supabase</h1><p>Add these variables to a <code>.env</code> file in your Vite project root. Use the publishable key, never a secret/service-role key.</p><pre>{`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key`}</pre><p>Restart the Vite server after saving the file.</p></div></div>;

  return <div className="app">
    <aside className={`sidebar ${mobile ? "open" : ""}`}>
      <div className="brand"><div className="brandMark"><Droplets size={19}/></div><div><strong>BloodLink</strong><span>Inventory system</span></div><button className="closeBtn" onClick={() => setMobile(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="sectionLabel">WORKSPACE</div>
      {nav.slice(0,5).map(([name,Icon]) => <button key={name} className={`navItem ${active===name ? "selected" : ""}`} onClick={() => {setActive(name);setMobile(false)}}><Icon size={17}/><span>{name}</span>{name==="Alerts" && alerts.length>0 && <em>{alerts.length}</em>}</button>)}
      <div className="sectionLabel">SYSTEM</div>
      {nav.slice(5).map(([name,Icon]) => <button key={name} className={`navItem ${active===name ? "selected" : ""}`} onClick={() => {setActive(name);setMobile(false)}}><Icon size={17}/><span>{name}</span></button>)}
      <div className="sidebarBottom"><div className="connection"><span className={`dot ${online < devices.length ? "offline" : ""}`}></span><div><b>{online}/{devices.length} devices active</b><small>{lastSync ? `Updated ${ago(lastSync)}` : "Waiting for data"}</small></div></div><div className="user"><div className="avatar">BL</div><div><b>Blood bank operator</b><small>Demo workspace</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="menuBtn" onClick={() => setMobile(true)} aria-label="Open menu"><Menu/></button><div><div className="breadcrumbs">BloodLink <span>/</span> {active}</div><h1>{active}</h1></div><div className="topActions"><div className="bankSelect"><MapPin size={15}/> Blood bank prototype <ChevronDown size={14}/></div><button className="iconBtn" onClick={() => setActive("Alerts")} aria-label="Open alerts"><Bell size={18}/>{alerts.length>0 && <span className="notifDot"/>}</button></div></header>
      {error && <div className="errorBanner"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => load(true)}>Retry</button></div>}
      {active === "Overview" && <div className="content">
        <div className="pageIntro"><div><p className="eyebrow"><span className="liveDot"/> DATABASE VIEW</p><h2>Storage overview</h2><p>Current inventory, storage conditions and device activity.</p></div><div className="actions"><button className="secondary" disabled={refreshing} onClick={() => load(true)}><RefreshCw size={15} className={refreshing ? "spin" : ""}/>{refreshing ? "Refreshing…" : "Refresh"}</button></div></div>
        <div className="stats"><Stat title="Registered bags" value={loading ? "—" : bags.length} sub="Total in database" icon={Droplets}/><Stat title="Available" value={loading ? "—" : available} sub="Not issued or expired" icon={ShieldCheck}/><Stat title="Expiring soon" value={loading ? "—" : expiring} sub="Within 7 days" icon={Clock3} warn={expiring>0}/><Stat title="Latest temperature" value={latestTemp==null ? "—" : `${Number(latestTemp).toFixed(1)}°C`} sub={temps[0] ? `Recorded ${ago(temps[0].recorded_at)}` : "No readings yet"} icon={Thermometer}/></div>
        <div className="grid"><section className="panel inventory"><div className="panelHead"><div><h3>Blood inventory</h3><p>Registered RFID-tagged bags</p></div><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search bag, group, slot…"/></div></div><div className="tableWrap"><table><thead><tr><th>Bag ID</th><th>Group</th><th>Expiry date</th><th>Location</th><th>Status</th><th>Temp.</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="emptyCell">Loading inventory…</td></tr> : filtered.length===0 ? <tr><td colSpan="6" className="emptyCell">No matching blood bags found.</td></tr> : filtered.slice(0,100).map(b=><tr key={b.id}><td><b>{b.bag_code || "Uncoded"}</b><span className="tag">RFID</span></td><td><span className="blood">{b.blood_group || "—"}</span></td><td>{date(b.expiry_date)}</td><td>{b.slot ? `${b.slot.rack_code || ""} · ${b.slot.slot_code || "Unassigned"}` : "Unassigned"}</td><td><span className={`status ${String(b.displayStatus).toLowerCase()}`}>{b.displayStatus}</span></td><td>{latestTemp==null ? "—" : `${Number(latestTemp).toFixed(1)}°C`}</td></tr>)}</tbody></table></div></section>
          <section className="panel sidePanel"><div className="panelHead"><div><h3>Storage slots</h3><p>{slots.filter(s=>s.occupied===true).length} occupied of {slots.length}</p></div><span className="miniBadge">{slots.length ? "DATABASE" : "NO SLOTS"}</span></div><div className="rack">{loading ? <p className="emptyText">Loading slots…</p> : slots.length===0 ? <p className="emptyText">No storage slots registered.</p> : slots.map(s=>{const bag=bagForSlot.get(s.id);const occupied=s.occupied===true;return <div className={`slot ${occupied ? "warning" : ""}`} key={s.id}><span className="slotLed"/><div><small>{s.rack_code || "Rack"} / {s.slot_code || "Slot"}</small><b>{bag?.bag_code || (occupied ? "Occupied" : "Empty")}</b></div><span className="slotGroup">{bag?.blood_group || (occupied ? "In use" : "—")}</span></div>})}</div></section></div>
        <div className="bottomGrid"><section className="panel"><div className="panelHead"><div><h3>Recent activity</h3><p>Latest recorded scans and changes</p></div><button className="linkBtn" onClick={()=>setActive("Activity Log")}>View all →</button></div><div className="events">{loading ? <p className="emptyText">Loading activity…</p> : events.length===0 ? <p className="emptyText">No activity recorded yet.</p> : events.slice(0,6).map(e=>{const bag=bags.find(b=>b.id===e.bag_id);return <div className="event" key={e.id}><div className="eventIcon"><Radio size={14}/></div><div><b>{bag?.bag_code || "Inventory"} <span>{e.description || e.event_type || "Activity recorded"}</span></b><small>{e.event_type || "event"}</small></div><time>{ago(e.created_at)}</time></div>})}</div></section>
          <section className="panel alertPanel"><div className="panelHead"><div><h3>Open alerts</h3><p>Unresolved items from the database</p></div><span className="count">{alerts.length}</span></div>{loading ? <p className="emptyText">Loading alerts…</p> : alerts.length===0 ? <p className="emptyText padded">No unresolved alerts.</p> : alerts.slice(0,5).map(a=><div className="alertItem" key={a.id}><div className="alertIcon"><AlertTriangle size={16}/></div><div><b>{a.message || a.alert_type || "Alert"}</b><span>{a.severity || "Unspecified severity"} · {ago(a.created_at)}</span></div></div>)}</section></div>
      </div>}
      {active === "Inventory" && <DataPage title="Inventory" description="Blood bags registered in Supabase." headers={["Bag ID","Blood group","Collection date","Expiry date","Status","RFID UID"]} rows={joinedBags.map(b=>[b.bag_code,b.blood_group,date(b.collection_date),date(b.expiry_date),b.displayStatus,b.rfid_uid])} loading={loading}/>}
      {active === "Storage" && <DataPage title="Storage" description="Configured rack slots and their occupancy." headers={["Rack","Slot","Occupied","Sensor","Updated"]} rows={slots.map(s=>[s.rack_code,s.slot_code,s.occupied ? "Yes" : "No",s.sensor_id || "Unassigned",dateTime(s.updated_at)])} loading={loading}/>}
      {active === "Alerts" && <DataPage title="Alerts" description="Unresolved alerts from the database." headers={["Type","Severity","Message","Created"]} rows={alerts.map(a=>[a.alert_type,a.severity,a.message,dateTime(a.created_at)])} loading={loading}/>}
      {active === "Activity Log" && <DataPage title="Activity log" description="Recent RFID scans and inventory events." headers={["Event","Description","Bag","Time"]} rows={events.map(e=>[e.event_type,e.description,bags.find(b=>b.id===e.bag_id)?.bag_code || "—",dateTime(e.created_at)])} loading={loading}/>}
      {active === "Connectivity" && <DataPage title="Device connectivity" description="Based on the last heartbeat recorded by the Edge Function." headers={["Device","Name","Last seen","Connection"]} rows={devices.map(d=>[d.device_code,d.device_name || "—",dateTime(d.last_seen_at),d.last_seen_at && Date.now()-new Date(d.last_seen_at).getTime()<120000 ? "Recently seen" : "No recent heartbeat"])} loading={loading}/>}
      {active === "Settings" && <section className="placeholder"><div className="placeholderIcon"><Settings size={26}/></div><h2>Dashboard settings</h2><p>This dashboard reads from Supabase. Device writes are handled by the Edge Function.</p><p className="settingsLine">Project: {URL}</p><button className="primary" onClick={()=>load(true)}>Refresh connection</button></section>}
    </main>
  </div>;
}
function Stat({title,value,sub,icon:Icon,warn}) { return <div className="stat"><div className={`statIcon ${warn?"warn":""}`}><Icon size={18}/></div><div><span>{title}</span><strong>{value}</strong><small className={warn?"warnText":""}>{sub}</small></div></div>; }
function DataPage({title,description,headers,rows,loading}) { return <div className="content"><div className="pageIntro"><div><h2>{title}</h2><p>{description}</p></div></div><section className="panel"><div className="tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={headers.length} className="emptyCell">Loading…</td></tr> : rows.length===0 ? <tr><td colSpan={headers.length} className="emptyCell">No records to display.</td></tr> : rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v==null || v==="" ? "—" : String(v)}</td>)}</tr>)}</tbody></table></div></section></div>; }
createRoot(document.getElementById("root")).render(<App/>);
