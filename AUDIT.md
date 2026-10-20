# Audit HakPulih — 18 Oktober 2026

Audit mencakup model, scheduler/solver, kelayakan ekonomi, transisi persetujuan, ketahanan penyimpanan, UI, metrik, dependensi, serta pemeriksaan browser. Fokusnya meningkatkan keandalan MVP lokal tanpa menambah pembayaran atau autentikasi kompleks.

## Temuan yang diperbaiki

| Prioritas | Temuan | Perbaikan dan bukti |
| --- | --- | --- |
| Tinggi | Reset simulasi diam-diam menghapus seluruh pesanan manual | Reset simulasi kini hanya membersihkan sesi; reset seed dipisah dan memerlukan konfirmasi di UI. |
| Tinggi | Keputusan dan gangguan hilang saat reload | Simpan log per tab, replay deterministik, invalidasi bila baseline berubah; tes pemulihan keputusan dan riwayat. |
| Tinggi | Klik berulang dapat mengenai snapshot/rencana yang sudah berganti | Transisi atomik memeriksa ID rencana/pesanan; satu pihak tidak dapat menimpa suaranya. |
| Sedang | Tabel dan grafik terus menampilkan keadaan sebelum kesepakatan | Dasbor memakai jadwal komitmen setelah hasil diterapkan; status dipulihkan/gagal/tenggat diperpanjang tampil. |
| Sedang | Pesanan selesai dapat masuk kandidat penundaan | Solver hanya menunda pesanan aktif; pesanan selesai tidak dipulihkan ulang. |
| Sedang | Jarak yang hilang diperlakukan sebagai transfer gratis | Jarak harus lengkap; solver menolak input tersebut secara eksplisit. |
| Sedang | Manfaat pihak berbeda digabung bila namanya sama | Agregasi menggunakan ID pihak, nama hanya untuk tampilan. |
| Sedang | Status HTTP 400 juga dipakai untuk kegagalan disk, berkas JSON tidak divalidasi | Pisahkan input 400 dan kegagalan penyimpanan 500; validasi struktur serta referensi, gunakan whitelist kolom. |
| Sedang | API tidak membatasi ukuran/format/asal mutasi | Maksimal body 16 KiB, JSON saja, pemeriksaan Origin jika tersedia. Dev server mengikat loopback. |
| Sedang | Berkas korup tidak dapat di-reset karena dibaca sebelum reset | Reset eksplisit dapat memulihkan seed; penambahan tetap menolak dan tidak menimpa berkas korup. |
| Sedang | Loading gagal masih menyajikan seed seolah data aktual | Tampilkan status gagal dan tombol coba lagi; konten operasional menunggu data berhasil dimuat. |
| Rendah | Ukuran huruf kecil, grafik tak bisa difokuskan, judul rentang tanggal tidak sesuai horizon | Besarkan teks, tambah label aksesibel, skip link, fokus grafik, kontrol pekan kedua, dan tanggal dinamis. |
| Rendah | Pemanggil bisa mengatur langkah pencarian nol sehingga loop tidak selesai | Validasi batas pencarian dan tes regresi. |
| Dependensi | npm audit awal melaporkan 5 temuan, termasuk rantai Vitest/tinypool dan PostCSS | Vitest diperbarui ke 4.1.12+, PostCSS dioverride ke 8.5.30+; audit ulang 0 temuan. |

## Tambahan yang relevan

- Filter status dan keadaan kosong yang jelas pada tabel pesanan.
- Ekspor CSV evaluasi tiga mode, termasuk metrik tenggat awal.
- Pemulihan tab terakhir melalui hash URL.
- Evaluasi dihitung saat halaman evaluasi dibuka sehingga tidak mengulang seluruh simulasi ketika meninjau persetujuan.
- Penyimpanan JSON dipisahkan menjadi modul yang bisa diuji dengan direktori sementara, termasuk delapan penulisan bersamaan.
- Test browser produksi dengan dataset terisolasi, bukan data operator.

## Hasil dan batasan

46 pengujian unit/integrasi lulus. TypeScript dan pemeriksaan dependensi lulus. Nilai evaluasi S1–S4 tetap sesuai tabel README setelah perbaikan; peningkatan terhadap mitra cadangan terjadi di S1, S2, dan S4.

Solver masih greedy dengan pencarian terbatas, sehingga bukan jaminan optimum global. Penundaan pelanggan dibayar sesuai tarif sehingga surplus pelanggan nol. Persetujuan adalah simulasi per tab, bukan bukti otorisasi server; beberapa operator/proses belum didukung. Belum ada pengukuran kapasitas dan mutu dengan data produksi nyata.

Build produksi dan pemeriksaan TypeScript akhir lulus. **7 test browser produksi lulus** melalui Playwright + Chrome lokal: desktop/mobile, persetujuan/fallback/reload, pesanan manual, reset terpisah, S1–S4, CSV, retry gagal muat, pembatasan API, serta timeout dan gangguan manual. Browser test pertama menemukan ketidakcocokan Origin saat Next menormalisasi hostname; perbaikan memakai Host permintaan asli, dilindungi enam test regresi, lalu seluruh suite browser dijalankan ulang dan lulus.

Tangkapan layar diperiksa langsung: [dasbor desktop](docs/audit-desktop.png), [simulator mobile](docs/audit-mobile.png), dan [evaluasi](docs/audit-evaluation.png). Tidak ditemukan overflow halaman pada viewport 390 px; tabel dan navigasi tetap dapat digulir di wadahnya.

Perintah reproduksi: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, `npm run report`, dan `npm audit`. Hasil ini menggambarkan versi dependensi yang terkunci pada `package-lock.json`, bukan jaminan aplikasi bebas seluruh bug atau kerentanan masa depan.
