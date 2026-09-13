
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, AlertTriangle, Bell, Boxes, ChevronDown, Clock3, Droplets,
  LayoutDashboard, MapPin, Menu, PackageCheck, Radio, RefreshCw,
  Search, Settings, ShieldCheck, Thermometer, Wifi, X
} from "lucide-react";
import "./styles.css";

const initialBags = [
  { id:"BB001", group:"O+", expiry:"18 Sep 2026", slot:"S1 / 01", status:"Available", temp:"4.2°C" },
  { id:"BB002", group:"A+", expiry:"22 Sep 2026", slot:"S1 / 02", status:"Available", temp:"4.1°C" },
  { id:"BB003", group:"B+", expiry:"16 Sep 2026", slot:"S1 / 03", status:"Available", temp:"4.3°C" },
  { id:"BB004", group:"O−", expiry:"14 Sep 2026", slot:"S2 / 01", status:"Expiring", temp:"4.2°C" },
  { id:"BB005", group:"AB+", expiry:"29 Sep 2026", slot:"S2 / 02", status:"Available", temp:"4.0°C" },
  { id:"BB006", group:"A−", expiry:"11 Oct 2026", slot:"S2 / 03", status:"Available", temp:"4.2°C" },
  { id:"BB007", group:"O+", expiry:"05 Oct 2026", slot:"S3 / 01", status:"Available", temp:"4.1°C" },
  { id:"BB008", group:"B−", expiry:"27 Sep 2026", slot:"S3 / 02", status:"Available", temp:"4.2°C" },
];

const events = [
  ["BB001", "Added to inventory", "S1 / 01", "2 min ago"],
  ["BB004", "Expiry warning", "S2 / 01", "11 min ago"],
  ["BB006", "RFID scan verified", "S2 / 03", "24 min ago"],
  ["BB003", "Temperature checked", "S1 / 03", "31 min ago"],
];

function App() {
  const [bags, setBags] = useState(initialBags);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Overview");
  const [toast, setToast] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = useMemo(() => bags.filter(b =>
    [b.id,b.group,b.slot,b.status].join(" ").toLowerCase().includes(query.toLowerCase())
  ), [bags, query]);

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const simulateScan = () => {
    const id = `BB${String(9 + bags.length).padStart(3,"0")}`;
    const slot = "S3 / 03";
    setBags([...bags, {id, group:"O+", expiry:"18 Oct 2026", slot, status:"Available", temp:"4.2°C"}]);
    notify(`RFID scan simulated: ${id} → ${slot}`);
  };

  const simulateTemp = () => notify("Demo alert: temperature threshold exceeded (5.8°C)");

  return (
    <div className="app">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brandMark"><Droplets size={19}/></div>
          <div><strong>BloodLink</strong><span>Inventory Console</span></div>
          <button className="closeBtn" onClick={()=>setMobileOpen(false)}><X size={18}/></button>
        </div>

        <div className="sectionLabel">MONITORING</div>
        {[
          ["Overview", LayoutDashboard], ["Inventory", Boxes], ["Storage", PackageCheck],
          ["Alerts", Bell], ["Activity Log", Activity]
        ].map(([name, Icon]) => (
          <button key={name} className={`navItem ${active===name ? "selected":""}`} onClick={()=>{setActive(name);setMobileOpen(false)}}>
            <Icon size={17}/><span>{name}</span>
            {name==="Alerts" && <em>2</em>}
          </button>
        ))}

        <div className="sectionLabel">SYSTEM</div>
        {[["Connectivity", Wifi], ["Settings", Settings]].map(([name, Icon]) => (
          <button key={name} className="navItem" onClick={()=>notify(`${name} panel is a demo`)}>
            <Icon size={17}/><span>{name}</span>
          </button>
        ))}

        <div className="sidebarBottom">
          <div className="connection"><span className="dot"></span><div><b>ESP32 online</b><small>Last sync 12 sec ago</small></div></div>
          <div className="user"><div className="avatar">JP</div><div><b>Operator</b><small>Blood Bank Admin</small></div><ChevronDown size={15}/></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="menuBtn" onClick={()=>setMobileOpen(true)}><Menu/></button>
          <div>
            <div className="breadcrumbs">BloodLink <span>/</span> {active}</div>
            <h1>{active}</h1>
          </div>
          <div className="topActions">
            <div className="bankSelect"><MapPin size={15}/> Kochi Blood Bank <ChevronDown size={14}/></div>
            <button className="iconBtn" onClick={()=>notify("No new critical notifications")}><Bell size={18}/><span className="notifDot"/></button>
          </div>
        </header>

        {active !== "Overview" ? (
          <section className="placeholder">
            <div className="placeholderIcon"><Boxes size={26}/></div>
            <h2>{active}</h2>
            <p>This section is wired as a demo. The Overview contains the main prototype interactions.</p>
            <button className="primary" onClick={()=>setActive("Overview")}>Back to Overview</button>
          </section>
        ) : (
        <div className="content">
          <div className="pageIntro">
            <div>
              <p className="eyebrow"><span className="liveDot"></span> LIVE SYSTEM</p>
              <h2>Storage overview</h2>
              <p>Real-time blood inventory and cold-chain status.</p>
            </div>
            <div className="actions">
              <button className="secondary" onClick={()=>notify("Inventory refreshed")}><RefreshCw size={15}/> Refresh</button>
              <button className="primary" onClick={simulateScan}><Radio size={15}/> Simulate RFID scan</button>
            </div>
          </div>

          <div className="stats">
            <Stat title="Total units" value={bags.length} sub="+1 today" icon={Droplets}/>
            <Stat title="Available" value={bags.filter(b=>b.status==="Available").length} sub="Ready for issue" icon={ShieldCheck}/>
            <Stat title="Expiring soon" value={bags.filter(b=>b.status==="Expiring").length} sub="Next 48 hours" icon={Clock3} warn/>
            <Stat title="Storage temp." value="4.2°C" sub="Within target range" icon={Thermometer}/>
          </div>

          <div className="grid">
            <section className="panel inventory">
              <div className="panelHead">
                <div><h3>Inventory</h3><p>RFID-tagged units currently registered</p></div>
                <div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ID, group, slot..." /></div>
              </div>
              <div className="tableWrap">
                <table>
                  <thead><tr><th>Bag ID</th><th>Group</th><th>Expiry</th><th>Location</th><th>Status</th><th>Temp.</th></tr></thead>
                  <tbody>{filtered.map(b=>
                    <tr key={b.id}>
                      <td><b>{b.id}</b><span className="tag">RFID</span></td>
                      <td><span className="blood">{b.group}</span></td>
                      <td>{b.expiry}</td><td>{b.slot}</td>
                      <td><span className={`status ${b.status.toLowerCase()}`}>{b.status}</span></td>
                      <td>{b.temp}</td>
                    </tr>
                  )}</tbody>
                </table>
              </div>
            </section>

            <section className="panel sidePanel">
              <div className="panelHead"><div><h3>Rack status</h3><p>6-slot prototype</p></div><span className="miniBadge">ONLINE</span></div>
              <div className="rack">
                {[1,2,3,4,5,6].map((n,i) => {
                  const bag = bags[i];
                  return <div className={`slot ${bag?.status==="Expiring" ? "warning":""}`} key={n}>
                    <span className="slotLed"></span><div><small>Slot {n}</small><b>{bag?.id || "Empty"}</b></div><span className="slotGroup">{bag?.group || "—"}</span>
                  </div>
                })}
              </div>
              <button className="outlineWide" onClick={()=>notify("Rack view opened (demo)")}>Open rack view <span>→</span></button>
            </section>
          </div>

          <div className="bottomGrid">
            <section className="panel">
              <div className="panelHead"><div><h3>Recent activity</h3><p>Latest RFID and sensor events</p></div><button className="linkBtn" onClick={()=>setActive("Activity Log")}>View all →</button></div>
              <div className="events">{events.map((e,i)=><div className="event" key={i}><div className="eventIcon"><Radio size={14}/></div><div><b>{e[0]} <span>{e[1]}</span></b><small>{e[2]}</small></div><time>{e[3]}</time></div>)}</div>
            </section>
            <section className="panel alertPanel">
              <div className="panelHead"><div><h3>Attention required</h3><p>Items needing operator action</p></div><span className="count">2</span></div>
              <button className="alertItem" onClick={simulateTemp}><div className="alertIcon"><Thermometer size={16}/></div><div><b>Temperature alert</b><span>Tap to simulate a cold-chain warning</span></div><span>→</span></button>
              <button className="alertItem" onClick={()=>notify("Expiry workflow opened for BB004")}><div className="alertIcon"><AlertTriangle size={16}/></div><div><b>BB004 expires soon</b><span>O− · S2 / 01 · 14 Sep 2026</span></div><span>→</span></button>
            </section>
          </div>
        </div>
        )}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Stat({title,value,sub,icon:Icon,warn}) {
  return <div className="stat"><div className={`statIcon ${warn?"warn":""}`}><Icon size={18}/></div><div><span>{title}</span><strong>{value}</strong><small className={warn?"warnText":""}>{sub}</small></div></div>
}

createRoot(document.getElementById("root")).render(<App />);
