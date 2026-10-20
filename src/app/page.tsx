import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Factory,
  Handshake,
  Network,
  Receipt,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { ProfileEffects } from "./profile-effects";
import "./profile.css";

const links = [
  ["#tentang", "Tentang"],
  ["#cara-kerja", "Cara kerja"],
  ["#dampak", "Dampak"],
  ["#nilai", "Nilai"],
];
const steps = [
  {
    icon: TriangleAlert,
    title: "Deteksi gangguan",
    text: "Mesin rusak atau kapasitas turun? HakPulih langsung menandai pesanan yang terancam lewat tenggat.",
  },
  {
    icon: Network,
    title: "Cari kapasitas",
    text: "Sistem memeriksa mesin mitra yang masih kosong dan pesanan fleksibel yang bisa digeser 1–3 hari.",
  },
  {
    icon: Handshake,
    title: "Sepakati bersama",
    text: "Setiap pihak melihat biaya dan manfaatnya. Rencana hanya berjalan bila semua pihak setuju.",
  },
  {
    icon: ShieldCheck,
    title: "Pulih & ukur",
    text: "Jadwal diperbarui otomatis, lalu dampaknya dibandingkan dengan pendekatan tanpa HakPulih.",
  },
];
const values = [
  {
    icon: Handshake,
    title: "Adil",
    text: "Tidak ada rencana tanpa persetujuan seluruh pihak. Satu penolakan cukup untuk beralih ke alternatif berikutnya.",
  },
  {
    icon: Receipt,
    title: "Transparan",
    text: "Kompensasi, selisih produksi, ongkos transfer, dan penalti mutu tampil rinci sebelum siapa pun menyetujui.",
  },
  {
    icon: Users,
    title: "Kolaboratif",
    text: "Sesama percetakan menjadi mitra pemulihan: kapasitas yang menganggur berubah menjadi pendapatan.",
  },
  {
    icon: ShieldCheck,
    title: "Dapat diaudit",
    text: "Algoritma deterministik dan teruji, sehingga setiap hasil simulasi dapat diulang dan diperiksa.",
  },
];
const impact = [
  { label: "Tanpa HakPulih", value: 33 },
  { label: "Mitra cadangan saja", value: 34 },
  { label: "HakPulih penuh", value: 35, featured: true },
];
const words = [
  "Kapasitas bersama",
  "Tenggat fleksibel",
  "Kompensasi adil",
  "Persetujuan semua pihak",
  "Biaya transparan",
  "Percetakan lokal",
];

function Wordmark() {
  return (
    <span className="cp-wordmark">
      <span>Hak</span>
      <span>Pulih</span>
    </span>
  );
}

export default function Profile() {
  return (
    <div className="cp">
      <ProfileEffects />
      <a className="skip-link" href="#konten">
        Langsung ke konten
      </a>
      <header className="cp-header">
        <div className="cp-container cp-header-inner">
          <a className="cp-logo" href="#top" aria-label="HakPulih, ke atas">
            <img src="/hakpulih-mark.png" alt="" width={36} height={36} />
            <Wordmark />
          </a>
          <nav aria-label="Navigasi profil">
            {links.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <a className="cp-btn cp-btn-primary cp-btn-sm" href="/app">
            Buka aplikasi <ArrowUpRight size={16} />
          </a>
        </div>
      </header>

      <main id="konten" tabIndex={-1}>
        <section className="cp-hero" id="top">
          <div className="cp-blob cp-blob-a" aria-hidden="true" />
          <div className="cp-blob cp-blob-b" aria-hidden="true" />
          <div className="cp-grid-bg" aria-hidden="true" />
          <div className="cp-container cp-hero-inner">
            <div className="cp-hero-copy">
              <span className="cp-pill cp-load" style={{ "--d": 0 } as Style}>
                <span className="cp-live" /> Jaringan pemulihan produksi
                percetakan
              </span>
              <h1>
                <span className="cp-load" style={{ "--d": 1 } as Style}>
                  Kapasitas untuk
                </span>{" "}
                <span
                  className="cp-load cp-gradient-text"
                  style={{ "--d": 2 } as Style}
                >
                  bangkit bersama.
                </span>
              </h1>
              <p className="cp-lead cp-load" style={{ "--d": 3 } as Style}>
                Saat mesin satu percetakan berhenti, HakPulih menghubungkan
                pesanan mendesak dengan kapasitas mitra dan tenggat yang bisa
                digeser — dengan kompensasi adil dan persetujuan semua pihak.
              </p>
              <div className="cp-actions cp-load" style={{ "--d": 4 } as Style}>
                <a className="cp-btn cp-btn-primary" href="/app">
                  Coba simulasinya <ArrowRight size={18} />
                </a>
                <a className="cp-btn cp-btn-ghost" href="#cara-kerja">
                  Lihat cara kerja
                </a>
              </div>
              <ul className="cp-checks cp-load" style={{ "--d": 5 } as Style}>
                <li>
                  <Check size={15} /> Semua pihak menyetujui
                </li>
                <li>
                  <Check size={15} /> Biaya transparan
                </li>
                <li>
                  <Check size={15} /> Tanpa transaksi nyata (MVP)
                </li>
              </ul>
            </div>
            <div className="cp-hero-art" aria-hidden="true">
              <div className="cp-ring cp-ring-1" />
              <div className="cp-ring cp-ring-2" />
              <div className="cp-ring cp-ring-3" />
              <div className="cp-halo" />
              <img
                className="cp-hero-mark"
                src="/hakpulih-mark.png"
                alt=""
                width={320}
                height={320}
              />
              <div className="cp-chip cp-chip-1">
                <span className="cp-chip-icon danger">
                  <TriangleAlert size={16} />
                </span>
                <div>
                  <strong>Mesin A berhenti</strong>
                  <small>3 hari · kapasitas hilang 100%</small>
                </div>
              </div>
              <div className="cp-chip cp-chip-2">
                <span className="cp-chip-icon amber">
                  <Clock3 size={16} />
                </span>
                <div>
                  <strong>+2 hari disepakati</strong>
                  <small>Pelanggan menerima kompensasi</small>
                </div>
              </div>
              <div className="cp-chip cp-chip-3">
                <span className="cp-chip-icon ok">
                  <Check size={16} />
                </span>
                <div>
                  <strong>Pesanan dialihkan</strong>
                  <small>Selesai sebelum tenggat</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cp-stats" aria-label="Angka simulasi">
          <div className="cp-container cp-stats-grid">
            {[
              [3, "usaha percetakan dalam jaringan uji"],
              [36, "pesanan disimulasikan"],
              [4, "skenario gangguan diuji"],
              [120, "detik batas setiap persetujuan"],
            ].map(([n, label], i) => (
              <div
                className="cp-stat"
                data-reveal
                style={{ "--d": i } as Style}
                key={label}
              >
                <strong data-count={n}>{n}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="cp-section" id="tentang">
          <div className="cp-container cp-about">
            <div data-reveal>
              <span className="cp-eyebrow">Tentang HakPulih</span>
              <h2>
                Satu mesin berhenti tidak harus berarti pesanan gagal.
              </h2>
              <p>
                Usaha percetakan kecil sering bergantung pada satu atau dua
                mesin. Ketika mesin rusak, pesanan terancam batal, penalti
                menumpuk, dan pelanggan pergi. Mitra cadangan pun kerap sudah
                penuh.
              </p>
              <p>
                HakPulih melihat sumber kapasitas yang selama ini tersembunyi:
                pelanggan yang bersedia menunggu satu sampai tiga hari bila
                diberi kompensasi. Kelonggaran kecil itu membuka ruang produksi
                bagi usaha lain untuk pulih.
              </p>
            </div>
            <div className="cp-about-cards">
              <article
                className="cp-card cp-card-navy"
                data-reveal
                style={{ "--d": 1 } as Style}
              >
                <Sparkles size={22} />
                <h3>Visi</h3>
                <p>
                  Ekosistem produksi lokal yang tangguh, tempat usaha kecil
                  saling menguatkan saat terguncang.
                </p>
              </article>
              <article
                className="cp-card"
                data-reveal
                style={{ "--d": 2 } as Style}
              >
                <Factory size={22} />
                <h3>Misi</h3>
                <ul>
                  <li>Menjaga pesanan tetap terselesaikan saat gangguan.</li>
                  <li>Mengubah kapasitas menganggur menjadi pendapatan.</li>
                  <li>Membagi biaya pemulihan secara adil dan terbuka.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <div className="cp-marquee" aria-hidden="true">
          <div className="cp-marquee-track">
            {[...words, ...words].map((w, i) => (
              <span key={i}>
                {w} <i />
              </span>
            ))}
          </div>
        </div>

        <section className="cp-section cp-soft" id="cara-kerja">
          <div className="cp-container">
            <div className="cp-heading" data-reveal>
              <span className="cp-eyebrow">Cara kerja</span>
              <h2>Dari gangguan ke kesepakatan, dalam empat langkah.</h2>
            </div>
            <ol className="cp-steps" data-reveal>
              {steps.map((s, i) => (
                <li key={s.title} style={{ "--d": i } as Style}>
                  <span className="cp-step-icon">
                    <s.icon size={22} />
                    <b>{i + 1}</b>
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="cp-section" id="dampak">
          <div className="cp-container cp-impact">
            <div data-reveal>
              <span className="cp-eyebrow">Dampak</span>
              <h2>Kelonggaran kecil, selisih yang nyata.</h2>
              <p>
                Pada skenario S1 — mesin Aksara Print berhenti tiga hari —
                HakPulih menyelamatkan lebih banyak pesanan daripada hanya
                mengandalkan mitra cadangan.
              </p>
              <div className="cp-impact-facts">
                <div>
                  <strong>
                    <span data-count="3">3</span>/4
                  </strong>
                  <span>skenario uji lebih baik dari mitra cadangan</span>
                </div>
                <div>
                  <strong>
                    <span data-count="62.5">62,5</span>%
                  </strong>
                  <span>kapasitas pemulihan S1 berasal dari kelonggaran</span>
                </div>
              </div>
            </div>
            <figure className="cp-chart" data-reveal style={{ "--d": 1 } as Style}>
              <figcaption>
                Pesanan tepat waktu (tenggat disepakati) · skenario S1 · dari 36
              </figcaption>
              {impact.map((r, i) => (
                <div
                  className={`cp-bar ${r.featured ? "featured" : ""}`}
                  key={r.label}
                  style={{ "--d": i, "--w": `${(r.value / 36) * 100}%` } as Style}
                >
                  <div className="cp-bar-label">
                    <span>{r.label}</span>
                    <strong>{r.value}</strong>
                  </div>
                  <div className="cp-bar-track">
                    <span />
                  </div>
                </div>
              ))}
              <p className="cp-note">
                Hasil simulasi pada data contoh, bukan data produksi nyata.
              </p>
            </figure>
          </div>
        </section>

        <section className="cp-section cp-soft" id="nilai">
          <div className="cp-container">
            <div className="cp-heading" data-reveal>
              <span className="cp-eyebrow">Nilai kami</span>
              <h2>Dibangun di atas kepercayaan, bukan paksaan.</h2>
            </div>
            <div className="cp-values">
              {values.map((v, i) => (
                <article
                  className="cp-card cp-value"
                  data-reveal
                  style={{ "--d": i } as Style}
                  key={v.title}
                >
                  <span className="cp-value-icon">
                    <v.icon size={22} />
                  </span>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cp-section">
          <div className="cp-container">
            <div className="cp-cta" data-reveal>
              <img
                className="cp-cta-mark"
                src="/hakpulih-mark.png"
                alt=""
                width={260}
                height={260}
              />
              <div>
                <h2>Lihat sendiri bagaimana jaringan pulih.</h2>
                <p>
                  Jalankan skenario gangguan, tinjau rencana pemulihan, dan
                  setujui bersama — semuanya dalam simulasi lokal.
                </p>
              </div>
              <div className="cp-actions">
                <a className="cp-btn cp-btn-white" href="/app">
                  Buka aplikasi HakPulih <ArrowRight size={18} />
                </a>
                <a className="cp-btn cp-btn-outline" href="/app#disruption">
                  Langsung ke simulator
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="cp-footer">
        <div className="cp-container cp-footer-inner">
          <div>
            <a className="cp-logo" href="#top" aria-label="HakPulih, ke atas">
              <img src="/hakpulih-mark.png" alt="" width={36} height={36} />
              <Wordmark />
            </a>
            <p>Kapasitas untuk bangkit bersama.</p>
          </div>
          <nav aria-label="Tautan kaki">
            {links.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
            <a href="/app">Aplikasi</a>
          </nav>
        </div>
        <div className="cp-container cp-footer-bottom">
          <span>© 2026 Vassel Goleyu. All rights reserved.</span>
          <span>MVP simulasi lokal · Tanpa transaksi nyata</span>
        </div>
      </footer>
    </div>
  );
}

type Style = React.CSSProperties & Record<`--${string}`, string | number>;
