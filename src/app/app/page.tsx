"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Factory,
  FilePlus2,
  Layers3,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { BASE_DATE, SCENARIOS } from "@/core/seed";
import { CONFIG } from "@/core/config";
import { capacity, evaluate, prepare, schedule, rootId } from "@/core/solver";
import type { Order } from "@/core/types";
import { useNetwork } from "@/hooks/use-network";
const rp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const num = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const dec = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
const date = (day: number) => {
  const d = new Date(`${BASE_DATE}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};
const nav = [
  { id: "dashboard", label: "Dasbor jaringan", icon: LayoutDashboard },
  { id: "orders", label: "Pesanan", icon: Layers3 },
  { id: "disruption", label: "Simulator gangguan", icon: Activity },
  { id: "recovery", label: "Rencana pemulihan", icon: ShieldCheck },
  { id: "evaluation", label: "Evaluasi dampak", icon: BarChart3 },
];
export default function Home() {
  const {
    base,
    simulation,
    loaded,
    busy,
    message,
    setMessage,
    loadError,
    retry,
    start,
    runScenario,
    resetSimulation,
    save,
    dispatch,
  } = useNetwork();
  const [tab, setTab] = useState("dashboard");
  const [tick, setTick] = useState(0);
  const [chartWeek, setChartWeek] = useState(0);
  const [resetData, setResetData] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const data = simulation?.data ?? base;
  const config = simulation?.config ?? CONFIG;
  const selected = simulation?.selected ?? "S1";
  const running = !!simulation;
  const flow = simulation?.flow;
  const queue = simulation?.queue ?? [];
  const working = simulation?.working;
  const history = simulation?.history ?? [];
  const initial = useMemo(() => schedule(data, config), [data, config]);
  const threatened = useMemo(
    () => prepare(data, config).threatened,
    [data, config],
  );
  const actual = useMemo(
    () =>
      simulation?.history.length
        ? schedule(simulation.working, config)
        : initial,
    [simulation?.working, simulation?.history.length, config, initial],
  );
  const results = useMemo(
    () =>
      running && tab === "evaluation"
        ? (["none", "idle", "full"] as const).map((m) =>
            evaluate(data, m, config),
          )
        : [],
    [data, config, running, tab],
  );
  const full = results[2];
  const current = flow?.plans[flow.index];
  useEffect(() => {
    if (flow?.status !== "menunggu" || !current) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTick(now);
      if (now >= flow.expiresAt)
        dispatch({ type: "timeout", planId: current.id, at: now });
    }, 1000);
    return () => clearInterval(timer);
  }, [flow?.status, flow?.expiresAt, current?.id]);
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (nav.some((n) => n.id === hash)) setTab(hash);
    const navigate = () => {
      const h = window.location.hash.slice(1);
      if (h === "main-content") return;
      setMessage("");
      setTab(nav.some((n) => n.id === h) ? h : "dashboard");
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);
  function advance() {
    if (queue[0])
      dispatch({ type: "advance", orderId: queue[0].id, at: Date.now() });
  }
  function orderStatus(o: Order) {
    const outcome = history.find((h) => h.orderId === o.id);
    if (outcome) return outcome.plan ? "Dipulihkan" : "Tidak terselamatkan";
    if (o.status === "selesai") return "Selesai";
    if (initial.late.includes(o.id)) return "Terancam";
    if (
      working?.orders.some(
        (p) => rootId(p.id) === o.id && p.deadline > o.deadline,
      )
    )
      return "Tenggat diperpanjang";
    return "Terjadwal";
  }
  function exportEvaluation() {
    const rows = [
      [
        "Pendekatan",
        "Pesanan aktif",
        "Tepat waktu disepakati",
        "Tepat waktu awal",
        "Biaya pemulihan Rp",
        "Hari-pesanan",
        "Manfaat bersih Rp",
        "Kapasitas fleksibel persen",
      ],
      ...results.map((r, i) => [
        ["Tanpa HakPulih", "Mitra cadangan", "HakPulih penuh"][i],
        r.total,
        r.onTime,
        r.originalOnTime,
        r.cost,
        r.delayDays,
        r.benefit,
        r.flexiblePercent,
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hakpulih-${selected}-evaluasi.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const [filter, setFilter] = useState("");
  const filteredOrders = data.orders.filter(
    (o) =>
      `${o.id} ${data.customers.find((c) => c.id === o.customerId)?.name}`
        .toLowerCase()
        .includes(filter.toLowerCase()) &&
      (statusFilter === "all" || orderStatus(o) === statusFilter),
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Langsung ke konten
      </a>
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="HakPulih dasbor">
          <img
            className="brand-mark"
            src="/hakpulih-mark.png"
            alt=""
            width={35}
            height={35}
          />
          <span>
            <span className="brand-hak">Hak</span>
            <span className="brand-pulih">Pulih</span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">
            <Factory size={18} />
          </span>
          <div>
            <strong>Jaringan Percetakan</strong>
            <small>Ruang kerja simulasi</small>
          </div>
          <span className="online-dot" />
        </div>
        <p className="nav-label">RUANG KERJA</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              aria-current={tab === n.id ? "page" : undefined}
              className={tab === n.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setTab(n.id);
                setMessage("");
              }}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === "recovery" && queue.length > 0 && (
                <span className="nav-count">{queue.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <Sparkles size={19} />
          </span>
          <strong>
            Keluwesan kecil.
            <br />
            Dampak besar.
          </strong>
          <p>
            Tenggat yang lebih lentur membuka jalan bagi usaha lain untuk pulih.
          </p>
          <button onClick={() => setTab("evaluation")}>
            Lihat dampaknya <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="profile">
          <span className="avatar">HP</span>
          <div>
            <strong>Operator jaringan</strong>
            <small>Mode demonstrasi</small>
          </div>
          <CircleHelp size={18} />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Ruang kerja <ChevronRight size={14} />
            <strong>{nav.find((n) => n.id === tab)?.label}</strong>
          </span>
          <div>
            <a className="profile-link" href="/">
              <ArrowLeft size={14} /> Profil HakPulih
            </a>
            <span className="demo-badge">
              <span />
              SIMULASI MVP
            </span>
            <span className="top-date">
              {date(0)} – {date(config.horizon - 1)} 2026
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">BERSAMA, KEMBALI BERPRODUKSI</div>
              <h1>{nav.find((n) => n.id === tab)?.label}</h1>
              <p>
                {tab === "dashboard"
                  ? "Satu jaringan. Kapasitas bersama. Peluang untuk pulih."
                  : tab === "orders"
                    ? "Kelola pesanan dan ruang kelonggaran yang bisa dibagikan."
                    : tab === "disruption"
                      ? "Uji ketahanan jaringan dengan gangguan produksi yang berbeda."
                      : tab === "recovery"
                        ? "Temukan jalan pemulihan yang menguntungkan semua pihak."
                        : "Buktikan nilai kelonggaran tenggat pada skenario yang sama."}
              </p>
            </div>
            <button
              className="button secondary"
              disabled={busy || !loaded}
              onClick={resetSimulation}
            >
              <RotateCcw size={15} /> Reset simulasi
            </button>
          </div>
          {message && (
            <div className="notice" role="status">
              <span>{message}</span>
              <button
                aria-label="Tutup pemberitahuan"
                onClick={() => setMessage("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!loaded && (
            <section
              className="panel load-state"
              role={loadError ? "alert" : "status"}
            >
              <h3>
                {loadError
                  ? "Data belum dapat dimuat"
                  : "Memuat data jaringan…"}
              </h3>
              <p>{loadError || "Menyiapkan pesanan dan sesi terakhir Anda."}</p>
              {loadError && (
                <button className="button primary" onClick={() => void retry()}>
                  Coba lagi
                </button>
              )}
            </section>
          )}
          {loaded && (
            <>
              {tab === "dashboard" && (
                <>
                  <section className="hero">
                    <div>
                      <span className="pill light">
                        <span className="online-dot" /> JARINGAN AKTIF
                      </span>
                      <h2>
                        Kapasitas pulih bisa datang
                        <br />
                        dari tenggat yang lentur.
                      </h2>
                      <p>
                        Hubungkan pesanan mendesak dengan ruang produksi
                        <br className="desktop" /> yang dibuka lewat kesepakatan
                        bersama.
                      </p>
                      <button
                        className="button white"
                        onClick={() => setTab("disruption")}
                      >
                        Simulasikan gangguan <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="network-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="network-line line-one" />
                      <div className="network-line line-two" />
                      <div className="network-line line-three" />
                      <div className="node node-a">
                        <Factory />
                        <span>Aksara Print</span>
                        <small>Usaha A</small>
                      </div>
                      <div className="node node-b">
                        <Factory />
                        <span>Bina Grafika</span>
                        <small>Usaha B</small>
                      </div>
                      <div className="node node-c">
                        <Factory />
                        <span>Citra Cetak</span>
                        <small>Usaha C</small>
                      </div>
                      <span className="network-center">
                        <Layers3 size={30} />
                      </span>
                      <span className="art-label">
                        <Check size={13} /> Saling menguatkan
                      </span>
                    </div>
                  </section>
                  <div className="stats-grid">
                    <Stat
                      label="Usaha dalam jaringan"
                      value="3"
                      note="Terhubung untuk saling membantu"
                      icon={<Factory size={18} />}
                    />
                    <Stat
                      label="Kapasitas harian"
                      value={num(
                        base.businesses.reduce((s, b) => s + b.capacity, 0),
                      )}
                      suffix="lembar"
                      note="Brosur A5 · full color"
                      icon={<Layers3 size={18} />}
                    />
                    <Stat
                      label="Pesanan terancam"
                      value={String(threatened.length - history.length)}
                      note={
                        running
                          ? "Pesanan yang masih perlu ditinjau"
                          : "Belum ada gangguan aktif"
                      }
                      icon={<TriangleAlert size={18} />}
                      warning={threatened.length > 0}
                    />
                    <Stat
                      label="Pesanan fleksibel"
                      value={String(
                        data.orders.filter((o) => o.slack > 0).length,
                      )}
                      note="Potensi ruang untuk pemulihan"
                      icon={<Clock3 size={18} />}
                    />
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel capacity-panel">
                      <div className="section-head">
                        <div>
                          <h3>Kapasitas & beban produksi</h3>
                          <p>
                            {history.length
                              ? "Jadwal komitmen setelah peninjauan · lembar"
                              : "Jadwal awal sebelum pemulihan · lembar"}
                          </p>
                        </div>
                        <select
                          className="period"
                          aria-label="Pekan grafik kapasitas"
                          value={chartWeek}
                          onChange={(e) => setChartWeek(Number(e.target.value))}
                        >
                          <option value={0}>
                            {date(0)} – {date(6)}
                          </option>
                          <option value={1}>
                            {date(7)} – {date(13)}
                          </option>
                        </select>
                      </div>
                      <div className="legend">
                        <span>
                          <i className="key used" />
                          Beban terjadwal
                        </span>
                        <span>
                          <i className="key idle" />
                          Kapasitas tersedia
                        </span>
                        <span>
                          <i className="key lost" />
                          Gangguan
                        </span>
                      </div>
                      {data.businesses.map((b) => (
                        <div className="business-chart" key={b.id}>
                          <div className="business-label">
                            <span className={`business-icon business-${b.id}`}>
                              {b.id}
                            </span>
                            <div>
                              <strong>{b.name}</strong>
                              <small>{num(b.capacity)} lembar / hari</small>
                            </div>
                            <span className="quality">★ {dec(b.quality)}</span>
                          </div>
                          <div className="bars">
                            {Array.from({ length: 7 }, (_, offset) => {
                              const day = chartWeek * 7 + offset;
                              const cap = capacity(
                                b.capacity,
                                b.id,
                                day,
                                data.disruptions,
                              );
                              const used = actual.allocations
                                .filter(
                                  (a) => a.businessId === b.id && a.day === day,
                                )
                                .reduce((s, a) => s + a.quantity, 0);
                              return (
                                <div className="bar-column" key={day}>
                                  <div
                                    className="bar-track"
                                    tabIndex={0}
                                    role="img"
                                    aria-label={`${date(day)}, ${b.name}: beban ${num(used)}, kapasitas ${num(cap)} lembar`}
                                    title={`${date(day)}: beban ${num(used)}, kapasitas ${num(cap)} lembar`}
                                  >
                                    <div
                                      className="bar-used"
                                      style={{
                                        height: `${(used / b.capacity) * 100}%`,
                                      }}
                                    />
                                    <div
                                      className="bar-idle"
                                      style={{
                                        height: `${((cap - used) / b.capacity) * 100}%`,
                                      }}
                                    />
                                    <div
                                      className="bar-lost"
                                      style={{
                                        height: `${((b.capacity - cap) / b.capacity) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <small>{date(day).split(" ")[0]}</small>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="panel-foot">
                        <span className="online-dot" /> Kapasitas
                        memperhitungkan gangguan aktif
                      </div>
                    </section>
                    <section className="panel scenario-panel">
                      <div className="section-head">
                        <div>
                          <h3>Bagaimana jika…</h3>
                          <p>Jelajahi skenario pemulihan</p>
                        </div>
                        <Activity size={20} />
                      </div>
                      {SCENARIOS.map((s) => (
                        <button
                          key={s.id}
                          disabled={!loaded}
                          className="scenario-row"
                          onClick={() => {
                            runScenario(s.id);
                            setTab("recovery");
                          }}
                        >
                          <span
                            className={`scenario-number ${s.id === selected && running ? "selected" : ""}`}
                          >
                            {s.id}
                          </span>
                          <span>
                            <strong>{s.name}</strong>
                            <small>{s.description}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                      <div className="insight">
                        <span>
                          <Sparkles size={17} /> BUKAN SEKADAR MITRA CADANGAN
                        </span>
                        <p>
                          Pesanan fleksibel membuka kapasitas baru, bahkan saat
                          mesin mitra sudah terisi.
                        </p>
                        <button onClick={() => setTab("evaluation")}>
                          Bandingkan tiga pendekatan <ArrowRight size={14} />
                        </button>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {(tab === "dashboard" || tab === "orders") && (
                <section className="panel orders-panel">
                  <div className="section-head">
                    <div>
                      <h3>
                        Pesanan jaringan{" "}
                        <span className="count">{data.orders.length}</span>
                      </h3>
                      <p>
                        Status diperbarui setelah hasil peninjauan diterapkan.
                      </p>
                    </div>
                    <div className="actions">
                      <input
                        aria-label="Cari pesanan"
                        placeholder="Cari pesanan atau pelanggan…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      <select
                        aria-label="Filter status pesanan"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">Semua status</option>
                        {[
                          "Terjadwal",
                          "Terancam",
                          "Dipulihkan",
                          "Tenggat diperpanjang",
                          "Tidak terselamatkan",
                          "Selesai",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      {tab === "dashboard" && (
                        <button
                          className="text-button"
                          onClick={() => setTab("orders")}
                        >
                          Semua pesanan <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Pesanan / Pelanggan</th>
                          <th>Usaha</th>
                          <th>Jumlah</th>
                          <th>Tenggat</th>
                          <th>Kelonggaran</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders
                          .slice(0, tab === "dashboard" ? 6 : undefined)
                          .map((o) => (
                            <tr key={o.id}>
                              <td>
                                <strong>#{o.id}</strong>
                                <small>
                                  {
                                    data.customers.find(
                                      (c) => c.id === o.customerId,
                                    )?.name
                                  }
                                </small>
                              </td>
                              <td data-label="Usaha">
                                {
                                  data.businesses.find(
                                    (b) => b.id === o.businessId,
                                  )?.name
                                }
                              </td>
                              <td data-label="Jumlah">
                                {num(o.quantity)}{" "}
                                <span className="muted">lbr</span>
                              </td>
                              <td data-label="Tenggat">
                                {date(
                                  working?.orders.find((p) => p.id === o.id)
                                    ?.deadline ?? o.deadline,
                                )}
                                {working?.orders.some(
                                  (p) =>
                                    p.id === o.id && p.deadline > o.deadline,
                                ) && <small>Awal: {date(o.deadline)}</small>}
                              </td>
                              <td data-label="Kelonggaran">
                                {o.slack ? (
                                  <span className="flex-tag">
                                    <Clock3 size={12} /> +{o.slack} hari
                                  </span>
                                ) : (
                                  <span className="muted">Tenggat tetap</span>
                                )}
                              </td>
                              <td data-label="Status">
                                <span
                                  className={`status ${["Terancam", "Tidak terselamatkan"].includes(orderStatus(o)) ? "danger" : "healthy"}`}
                                >
                                  {orderStatus(o)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        {filteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="empty-table">
                              Tidak ada pesanan yang cocok. Coba kata kunci atau
                              status lain.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {tab === "orders" && (
                <section className="panel form-panel">
                  <div className="section-head">
                    <div>
                      <h3>Tambah pesanan</h3>
                      <p>Brosur A5 full color · satuan lembar</p>
                    </div>
                    <FilePlus2 size={20} />
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const f = new FormData(form);
                      const order: Order = {
                        id: `M-${crypto.randomUUID()}`,
                        businessId: String(f.get("businessId")),
                        customerId: String(f.get("customerId")),
                        quantity: Number(f.get("quantity")),
                        deadline: Number(f.get("deadline")),
                        slack: Number(f.get("slack")),
                        compensation: Number(f.get("compensation")),
                        value: Number(f.get("value")),
                        margin: Number(f.get("margin")),
                        cancellationPenalty: Number(
                          f.get("cancellationPenalty"),
                        ),
                        status: "aktif",
                      };
                      if (await save({ action: "add", order })) form.reset();
                    }}
                  >
                    <div className="form-grid">
                      <label>
                        Pelanggan
                        <select name="customerId">
                          {base.customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Usaha
                        <select name="businessId">
                          {base.businesses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field
                        label="Jumlah (lembar)"
                        name="quantity"
                        value={1000}
                        min={1}
                        max={100000}
                      />
                      <label>
                        Tenggat
                        <select name="deadline">
                          {Array.from({ length: 11 }, (_, i) => (
                            <option key={i} value={i}>
                              {date(i)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field
                        label="Kelonggaran maksimum (hari)"
                        name="slack"
                        value={2}
                        max={3}
                      />
                      <Field
                        label="Kompensasi per hari (Rp / pesanan)"
                        name="compensation"
                        value={30000}
                      />
                      <Field
                        label="Nilai pesanan (Rp)"
                        name="value"
                        value={1000000}
                      />
                      <Field
                        label="Margin pesanan (Rp)"
                        name="margin"
                        value={400000}
                      />
                      <Field
                        label="Penalti pembatalan (Rp)"
                        name="cancellationPenalty"
                        value={200000}
                      />
                    </div>
                    <div className="form-footer">
                      <p>
                        Kelonggaran hanya digunakan setelah pelanggan menyetujui
                        rencana.
                      </p>
                      <button
                        className="button primary"
                        disabled={busy || !loaded}
                      >
                        Simpan pesanan <Check size={16} />
                      </button>
                    </div>
                  </form>
                </section>
              )}
              {tab === "disruption" && (
                <>
                  <div className="scenario-grid">
                    {SCENARIOS.map((s) => (
                      <button
                        disabled={!loaded}
                        key={s.id}
                        className={`panel scenario-card ${selected === s.id && running ? "chosen" : ""}`}
                        onClick={() => runScenario(s.id)}
                      >
                        <span className="eyebrow">SKENARIO {s.id}</span>
                        <h3>{s.name}</h3>
                        <p>{s.description}</p>
                        <span className="text-button">
                          Jalankan skenario <ArrowRight size={15} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <section className="panel form-panel">
                    <div className="section-head">
                      <div>
                        <h3>Rancang gangguan sendiri</h3>
                        <p>Gangguan manual menggantikan skenario aktif.</p>
                      </div>
                      <Activity size={22} />
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const d = structuredClone(base);
                        d.disruptions = [
                          {
                            id: "manual",
                            businessId: String(f.get("business")),
                            start: Number(f.get("start")),
                            duration: Number(f.get("duration")),
                            loss: Number(f.get("loss")),
                          },
                        ];
                        start(d, Number(f.get("quality")), "manual");
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Usaha terdampak
                          <select name="business">
                            {base.businesses.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Tanggal mulai
                          <select name="start">
                            {Array.from({ length: 7 }, (_, i) => (
                              <option key={i} value={i}>
                                {date(i)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field
                          label="Durasi gangguan (hari)"
                          name="duration"
                          value={3}
                          min={1}
                          max={7}
                        />
                        <Field
                          label="Kapasitas hilang (%)"
                          name="loss"
                          value={100}
                          min={1}
                          max={100}
                        />
                        <Field
                          label="Penalti mutu (Rp / poin / lembar)"
                          name="quality"
                          value={CONFIG.qualityPenalty}
                          max={10000}
                        />
                      </div>
                      <div className="form-footer">
                        <p>
                          Semua pesanan menggunakan satu skenario yang sama.
                        </p>
                        <button className="button primary" disabled={!loaded}>
                          Jalankan gangguan <ArrowRight size={16} />
                        </button>
                      </div>
                    </form>
                  </section>
                  {running && (
                    <div className="notice">
                      <span>
                        {threatened.length} pesanan terancam pada skenario{" "}
                        {selected}.
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setTab("recovery")}
                      >
                        Tinjau rencana <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {tab === "recovery" && (
                <>
                  {!running ? (
                    <Empty
                      action={() => {
                        runScenario("S1");
                      }}
                    />
                  ) : (
                    <>
                      <div className="stats-grid">
                        <Stat
                          label="Pesanan terancam"
                          value={String(threatened.length)}
                          note={`Skenario ${selected}`}
                          icon={<TriangleAlert size={18} />}
                        />
                        <Stat
                          label="Selesai ditinjau"
                          value={String(history.length)}
                          note={`${history.filter((h) => h.plan).length} rencana disepakati`}
                          icon={<Check size={18} />}
                        />
                        <Stat
                          label="Masih dalam antrean"
                          value={String(queue.length)}
                          note="Kapasitas diperbarui setiap kesepakatan"
                          icon={<Layers3 size={18} />}
                        />
                        <Stat
                          label="Batas persetujuan"
                          value={
                            flow?.status === "menunggu"
                              ? `${Math.max(0, Math.ceil((flow.expiresAt - Math.max(tick, Date.now())) / 1000))} dtk`
                              : "—"
                          }
                          note="Otomatis beralih jika waktu habis"
                          icon={<Clock3 size={18} />}
                        />
                      </div>
                      {queue[0] && (
                        <div className="recovery-title">
                          <span className="status danger">
                            Pesanan terancam
                          </span>
                          <h2>
                            #{queue[0].id} · {num(queue[0].quantity)} lembar
                          </h2>
                          <p>
                            Tenggat {date(queue[0].deadline)} ·{" "}
                            {
                              data.businesses.find(
                                (b) => b.id === queue[0].businessId,
                              )?.name
                            }
                          </p>
                        </div>
                      )}
                      {current && flow && (
                        <section className="panel">
                          <div className="section-head">
                            <div>
                              <h3>
                                Rencana #{flow.index + 1}{" "}
                                <span className="status healthy">
                                  {flow.status === "disetujui"
                                    ? "Disetujui"
                                    : "Menunggu persetujuan"}
                                </span>
                              </h3>
                              <p>
                                {flow.plans.length} alternatif layak · diurutkan
                                menurut manfaat bersih total
                              </p>
                            </div>
                            <span className="benefit">
                              +{rp(current.benefit)}
                            </span>
                          </div>
                          <div className="plan-body">
                            <div className="plan-steps">
                              {current.transfers.map((t) => (
                                <div className="step" key={t.businessId}>
                                  <span className="step-icon">
                                    <ArrowUpRight size={18} />
                                  </span>
                                  <div>
                                    <strong>
                                      Alihkan {num(t.quantity)} lembar ke{" "}
                                      {
                                        data.businesses.find(
                                          (b) => b.id === t.businessId,
                                        )?.name
                                      }
                                    </strong>
                                    <p>
                                      Produksi selesai paling lambat{" "}
                                      {date(queue[0].deadline)}.
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {current.delays.map((d) => (
                                <div className="step" key={d.orderId}>
                                  <span className="step-icon amber">
                                    <Clock3 size={18} />
                                  </span>
                                  <div>
                                    <strong>
                                      Perpanjang tenggat #{d.orderId} sebanyak{" "}
                                      {d.days} hari
                                    </strong>
                                    <p>
                                      Kompensasi{" "}
                                      {rp(
                                        d.days *
                                          (working?.orders.find(
                                            (o) => o.id === d.orderId,
                                          )?.compensation ?? 0),
                                      )}{" "}
                                      untuk pelanggan terkait.
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {!current.delays.length && (
                                <p className="muted">
                                  Rencana ini memakai kapasitas tanpa
                                  perpanjangan tenggat.
                                </p>
                              )}
                            </div>
                            <div className="cost-box">
                              <h4>Rincian biaya pemulihan</h4>
                              {[
                                [
                                  "Kompensasi pelanggan",
                                  current.costs.compensation,
                                ],
                                [
                                  "Selisih produksi + laba jasa",
                                  current.costs.production,
                                ],
                                ["Transfer antarusaha", current.costs.transfer],
                                ["Penalti mutu", current.costs.quality],
                              ].map(([label, value]) => (
                                <div key={String(label)}>
                                  <span>{label}</span>
                                  <strong>{rp(Number(value))}</strong>
                                </div>
                              ))}
                              <div className="cost-total">
                                <span>Total biaya</span>
                                <strong>{rp(current.costs.total)}</strong>
                              </div>
                            </div>
                          </div>
                          <div className="approval-section">
                            <h3>Kesepakatan semua pihak</h3>
                            <p className="muted">
                              Manfaat pelanggan = kompensasi dikurangi tarif
                              kerugian penundaan yang diminta.
                            </p>
                            {current.parties.map((p) => (
                              <div className="party" key={p.id}>
                                <span className="avatar">
                                  {p.name.slice(0, 2).toUpperCase()}
                                </span>
                                <div className="party-name">
                                  <strong>{p.name}</strong>
                                  <small>{p.role}</small>
                                </div>
                                <strong className="party-benefit">
                                  {rp(p.benefit)}
                                </strong>
                                {flow.status === "menunggu" &&
                                p.approval === "menunggu" ? (
                                  <div className="actions">
                                    <button
                                      className="button reject"
                                      aria-label={`Tolak rencana untuk ${p.name}`}
                                      onClick={() =>
                                        dispatch({
                                          type: "vote",
                                          planId: current.id,
                                          partyId: p.id,
                                          decision: "tolak",
                                          at: Date.now(),
                                        })
                                      }
                                    >
                                      <X size={14} /> Tolak
                                    </button>
                                    <button
                                      className="button primary"
                                      aria-label={`Setujui rencana untuk ${p.name}`}
                                      onClick={() =>
                                        dispatch({
                                          type: "vote",
                                          planId: current.id,
                                          partyId: p.id,
                                          decision: "setuju",
                                          at: Date.now(),
                                        })
                                      }
                                    >
                                      <Check size={14} /> Setuju
                                    </button>
                                  </div>
                                ) : (
                                  <span className="status healthy">
                                    {p.approval}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                      {flow?.reason && <p className="notice">{flow.reason}</p>}
                      {flow?.status === "tidak terselamatkan" && (
                        <section className="panel empty">
                          <TriangleAlert size={30} />
                          <h3>Tidak terselamatkan</h3>
                          <p>
                            {flow.reason} Ruang pencarian dibatasi; ini bukan
                            bukti bahwa seluruh solusi matematis mustahil.
                          </p>
                        </section>
                      )}
                      {flow && flow.status !== "menunggu" && (
                        <button
                          className="button primary next-button"
                          onClick={advance}
                        >
                          Simpan hasil & lanjutkan antrean{" "}
                          <ArrowRight size={16} />
                        </button>
                      )}
                      {!flow && (
                        <section className="panel empty">
                          <ShieldCheck size={32} />
                          <h3>Peninjauan selesai</h3>
                          <p>
                            {history.filter((h) => h.plan).length} pesanan
                            disepakati, {history.filter((h) => !h.plan).length}{" "}
                            tidak terselamatkan.
                          </p>
                        </section>
                      )}
                      {history.length > 0 && (
                        <section className="panel history">
                          <h3>Hasil kesepakatan aktual</h3>
                          {history.map((h) => (
                            <div key={h.orderId}>
                              <strong>#{h.orderId}</strong>
                              <span
                                className={`status ${h.plan ? "healthy" : "danger"}`}
                              >
                                {h.plan ? "Disepakati" : "Tidak terselamatkan"}
                              </span>
                              <span>
                                {h.plan
                                  ? `Manfaat total ${rp(h.plan.benefit)}`
                                  : h.reason}
                              </span>
                            </div>
                          ))}
                        </section>
                      )}
                    </>
                  )}
                </>
              )}
              {tab === "evaluation" && (
                <>
                  {!running ? (
                    <Empty action={() => runScenario("S1")} />
                  ) : (
                    <>
                      <div className="evaluation-toolbar">
                        <button
                          className="button secondary"
                          onClick={exportEvaluation}
                        >
                          Unduh evaluasi CSV <ArrowDownRight size={15} />
                        </button>
                      </div>
                      <div className="evaluation-intro">
                        <span className="pill">
                          <Sparkles size={14} /> SKENARIO {selected}
                        </span>
                        <h2>Ruang yang lentur, peluang yang lebih besar.</h2>
                        <p>
                          Perbandingan hipotetis dengan semua pihak menyetujui
                          rencana terbaik.
                          <br />
                          Hasil persetujuan aktual ada pada halaman rencana
                          pemulihan.
                        </p>
                      </div>
                      <div className="evaluation-grid">
                        {results.map((r, i) => (
                          <section
                            className={`panel evaluation-card ${i === 2 ? "featured" : ""}`}
                            key={r.mode}
                          >
                            {i === 2 && (
                              <span className="recommended">
                                DENGAN KELONGGARAN TENGGAT
                              </span>
                            )}
                            <span className="eyebrow">PENDEKATAN 0{i + 1}</span>
                            <h3>
                              {
                                [
                                  "Tanpa HakPulih",
                                  "Mitra cadangan",
                                  "HakPulih penuh",
                                ][i]
                              }
                            </h3>
                            <p>
                              {
                                [
                                  "Mengandalkan kapasitas usaha sendiri",
                                  "Hanya kapasitas tanpa penundaan",
                                  "Kapasitas tersedia + tenggat fleksibel",
                                ][i]
                              }
                            </p>
                            <div className="big-metric">
                              {r.onTime}
                              <span> / {r.total}</span>
                            </div>
                            <strong>pesanan tepat waktu disepakati</strong>
                            <div className="progress">
                              <span
                                style={{
                                  width: `${r.total ? (r.onTime / r.total) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <small>
                              {dec(r.total ? (r.onTime / r.total) * 100 : 0)}%
                              sesuai tenggat setelah persetujuan
                            </small>
                            <dl>
                              <div>
                                <dt>Tepat waktu tenggat awal</dt>
                                <dd>{r.originalOnTime} pesanan</dd>
                              </div>
                              <div>
                                <dt>Biaya pemulihan</dt>
                                <dd>{rp(r.cost)}</dd>
                              </div>
                              <div>
                                <dt>Penundaan disepakati</dt>
                                <dd>{r.delayDays} hari-pesanan</dd>
                              </div>
                              <div>
                                <dt>Manfaat bersih total</dt>
                                <dd>{rp(r.benefit)}</dd>
                              </div>
                              <div>
                                <dt>Tidak terselamatkan</dt>
                                <dd>{r.failed.length} pesanan</dd>
                              </div>
                            </dl>
                          </section>
                        ))}
                      </div>
                      <div className="dashboard-grid">
                        <section className="panel origin-panel">
                          <div className="section-head">
                            <div>
                              <h3>Dari mana kapasitas pemulihan berasal?</h3>
                              <p>
                                Atribusi berdasarkan perubahan alokasi pada
                                kebijakan jadwal EDF.
                              </p>
                            </div>
                            <Layers3 size={20} />
                          </div>
                          <div className="origin-metric">
                            {dec(full.flexiblePercent)}
                            <span>%</span>
                          </div>
                          <p>dari kelonggaran tenggat pelanggan</p>
                          <div className="origin-bar">
                            <span
                              style={{ width: `${full.flexiblePercent}%` }}
                            />
                          </div>
                          <div className="legend">
                            <span>
                              <i className="key used" />
                              Kelonggaran {dec(full.flexiblePercent)}%
                            </span>
                            <span>
                              <i className="key idle" />
                              Tanpa penundaan{" "}
                              {full.recovered
                                ? dec(100 - full.flexiblePercent)
                                : "0"}
                              %
                            </span>
                          </div>
                          <p className="muted">
                            Total {num(full.recovered)} lembar dialihkan dan
                            dipulihkan.
                          </p>
                        </section>
                        <section className="panel parties-panel">
                          <div className="section-head">
                            <div>
                              <h3>Manfaat bersih per pihak</h3>
                              <p>
                                HakPulih penuh · setelah semua komponen biaya
                              </p>
                            </div>
                            <ArrowDownRight size={20} />
                          </div>
                          {full.partyBenefits.map((p) => (
                            <div className="benefit-row" key={p.id}>
                              <span>
                                {p.name}
                                <small>{p.role}</small>
                              </span>
                              <strong>{rp(p.benefit)}</strong>
                            </div>
                          ))}
                          {!full.partyBenefits.length && (
                            <p className="muted">
                              Belum ada pengalihan yang layak.
                            </p>
                          )}
                        </section>
                      </div>
                      <div className="notice">
                        <span>
                          {full.onTime > results[1].onTime
                            ? `HakPulih menyelesaikan ${full.onTime - results[1].onTime} pesanan lebih banyak dibanding mitra cadangan pada skenario ini.`
                            : "Pada skenario ini, kelonggaran tenggat belum menambah jumlah pesanan yang terselamatkan."}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {loaded && tab === "orders" && (
            <section className="panel reset-data">
              <div>
                <h3>Kembalikan data contoh</h3>
                <p>
                  Menghapus seluruh pesanan manual dan riwayat simulasi pada tab
                  ini.
                </p>
              </div>
              {!resetData ? (
                <button
                  className="button reject"
                  onClick={() => setResetData(true)}
                >
                  Reset data contoh
                </button>
              ) : (
                <div className="actions">
                  <span>Hapus pesanan manual?</span>
                  <button
                    className="button secondary"
                    onClick={() => setResetData(false)}
                  >
                    Batal
                  </button>
                  <button
                    className="button reject"
                    disabled={busy}
                    onClick={async () => {
                      if (await save({ action: "reset" })) setResetData(false);
                    }}
                  >
                    Ya, kembalikan seed
                  </button>
                </div>
              )}
            </section>
          )}
          <footer>
            <a href="/">
              <span className="brand-dot">●</span> HakPulih{" "}
              <span className="muted">· Kapasitas untuk bangkit bersama</span>
            </a>
            <span>
              © 2026 Vassel Goleyu · Simulasi lokal · Tanpa transaksi nyata
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  icon,
  suffix,
  warning,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  suffix?: string;
  warning?: boolean;
}) {
  return (
    <section className={`panel stat ${warning ? "warning" : ""}`}>
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>
        {value}
        <small>{suffix}</small>
      </strong>
      <p>{note}</p>
    </section>
  );
}
function Field({
  label,
  name,
  value,
  min = 0,
  max = 1000000000,
}: {
  label: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        name={name}
        defaultValue={value}
        min={min}
        max={max}
        step={1}
        required
      />
    </label>
  );
}
function Empty({ action }: { action: () => void }) {
  return (
    <section className="panel empty">
      <Activity size={34} />
      <h2>Mulai dari satu gangguan</h2>
      <p>
        Jalankan skenario untuk melihat pesanan terancam dan opsi pemulihannya.
      </p>
      <button className="button primary" onClick={action}>
        Jalankan skenario S1 <ArrowRight size={16} />
      </button>
    </section>
  );
}
