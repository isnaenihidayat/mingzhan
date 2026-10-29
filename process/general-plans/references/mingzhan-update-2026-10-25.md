# MíngZhàn — pembaruan dari Nakama, 25 Oktober 2026

## Cakupan

Diadaptasi dari Nakama hingga commit `12dc48a2db7271d95c8865df0cabf9adbd0a2620` (v0.4.59). Onboarding baru, goal prompt, dan setup checklist tidak dimasukkan. Perubahan UI/plugin milik pengguna yang sudah ada sebelum pekerjaan tetap dipertahankan.

Commit sumber yang diadaptasi:

- `c0798113` — inventaris provider mengikuti peran.
- `919a8a2b` — avatar rail berwarna dan penanda aktif.
- `b99d3d7a` — pengelolaan secret terenkripsi; pembatasan environment; pembatalan dan expiry setup custom tool.
- `128972bc` — master key development lokal.
- `8010ac52` — Kernel browser key memakai secret store.
- `a9959eb3` — posisi New chat grup.
- `9405e53a` — penanganan batas output model.
- `620f8229` — Netra 32.000 output token default, error stream yang bisa ditampilkan, retry terbatas.
- `b72e414e` — environment proses ACP disaring.
- `6b98706a` — panduan lebar wrapper slide HTML.

Commit refactor internal, penghapusan tes, perubahan README maintainer, nomor release upstream, dan onboarding tidak diambil.

## Hasil implementasi

1. `ManagedSecrets` menyimpan kredensial terkait pada tabel SQLite `managed_secrets` dengan AES-256-GCM dan identitas scope/name sebagai AAD. Migrasi format konfigurasi lama diverifikasi sebelum nilai lama dibuang. Enkripsi tool lama tetap dapat dimigrasi.
2. Provider/API key, email, web search, Composio, custom tool dan Kernel browser mendapat alur secret Settings. Sumber environment ditampilkan dan memegang prioritas. Nilai secret tidak dikembalikan lewat ringkasan Settings.
3. Startup melakukan pemeriksaan integritas, migrasi, pemasangan resolver dan hydration provider. Rotasi master key didukung. Ekspor/impor disesuaikan agar secret tidak kembali sebagai nilai konfigurasi plaintext.
4. Development, desktop, Docker helper, Compose dan panduan operasi disesuaikan. Desktop menggunakan penyimpanan aman OS dan alur recovery key. Tidak menjalankan migrasi pada data nyata pengguna selama pekerjaan ini.
5. Environment server tidak diwariskan utuh ke proses alat/coding harness/worker. ACP menyaring secret aplikasi sambil mempertahankan kredensial login provider yang dibutuhkannya. Konfigurasi sementara Codex/OpenCode/pi memakai referensi environment untuk kunci yang dipilih.
6. `GET /v1/providers` membatasi metadata kepada non-platform-admin. Ini perlindungan metadata; bukan klaim bahwa endpoint lama mengembalikan raw API key.
7. Adapter OpenAI-compatible dan agent loop membedakan output limit, mencegah eksekusi tool call terpotong dan mencoba tanpa thinking bila diperlukan. Netra mengirim default max output 32.000 token dengan custom model override tetap berlaku. Stream terputus mendapat retry satu kali dan riwayat parsial dipertahankan.
8. Setup alat mendapat createdAt, status rejected, endpoint pembatalan, penghapusan staged secret, dan expiry tujuh hari yang diperiksa saat setup dibaca/disetujui.
9. Rail agen dan header grup mendapat perbaikan kecil upstream. Panduan artifact-design diperbarui. Tampilan chat awal tidak didesain ulang.

## Penyesuaian khusus fork

Semua paket, environment dan konfigurasi memakai identitas MíngZhàn yang sudah ada, termasuk `@mingzhan/*` dan `MINGZHAN_*`. Nama simbol SuperMingzhan serta izin profil lokal dipertahankan. Dokumentasi Docker mempertahankan repository image `ghcr.io/mingpromotion/mingzhan`.

Validasi menyentuh beberapa ketidakcocokan rebranding yang sudah ada:

- Hash CSP bootstrap tema diselaraskan dengan script `apps/web/index.html` yang ada; tidak menambah izin unsafe-inline.
- Tes URL release desktop mengikuti URL-encoding nama berkas Unicode.
- Prefix metadata artefak dalam fixture mengikuti `.mingzhan-meta.json`.
- Tes larangan ekspor profil memeriksa status penolakan, bukan salinan teks nama merek.
- Tes shell memberi waktu startup yang cukup bagi login shell macOS/Windows, sambil tetap memeriksa timeout, penghentian descendants dan isolasi workspace.

## Menjalankan versi baru

- Gunakan Bun 1.4 atau lebih baru. Validasi menemukan Bun global 1.3.14; Bun 1.4.0 dipakai sementara dari npm untuk tes, tanpa mengganti instalasi global.
- Source development (`bun run dev:server` atau `dev:web`) menyiapkan master key lokal sekali di `~/.config/mingzhan/dev-secrets.env` kecuali environment menyediakan kunci. Simpan file itu karena dibutuhkan untuk membaca Settings yang dienkripsi.
- Production/Docker perlu `MINGZHAN_SECRETS_KEY` berisi 32 byte acak dalam base64. Compose membaca `mingzhan-secrets.env`; build/run helper membuat atau memakai kembali file kunci tersendiri. Jangan mengganti kunci pada setiap restart.
- Simpan master key terpisah dari backup data. Startup baru memigrasikan kredensial lama setelah bisa mengenkripsi dan memverifikasi hasilnya.
- Instance lokal telah direstart setelah pengguna meminta aktivasi. Rincian aktivasi dicatat di bawah.

## Validasi

- Build web dan server: lulus.
- Build worker automation, Telegram, WhatsApp, Discord dan Slack: lulus.
- Build dokumentasi: lulus.
- Tes seluruh server/paket/CLI/desktop unit test dengan Bun 1.4: **4.408 lulus, 22 dilewati, 0 gagal** (461 berkas).
- Tes web: **898 lulus, 0 gagal** (102 berkas).
- Total tes akhir: **5.306 lulus, 22 dilewati, 0 gagal**.
- Tes fokus pembaruan: 660 lulus, 6 dilewati, 0 gagal.
- Tes plugin dengan Bun 1.4: 75 lulus, 0 gagal.
- Tes bash setelah penyesuaian startup macOS: 30 lulus, 0 gagal.
- Tes portability setelah pembaruan assertion perilaku: 23 lulus, 0 gagal.
- Format/lint pada berkas kode pembaruan: bersih (109 berkas dalam pemeriksaan terakhir, ditambah pemeriksaan ulang tes portability).
- `git diff --check`: bersih.
- Pemeriksaan sebelum update dan sesudahnya mengonfirmasi 13 berkas UI/plugin yang sudah berubah sebelumnya tetap identik byte-per-byte dengan snapshot awal.

Pemeriksaan global belum bersih karena utang yang sudah ada di luar pembaruan: Biome melaporkan 153 masalah format; oxlint melaporkan 4 masalah spasi pada `chat-page-layout.tsx` yang merupakan perubahan pengguna dan dipertahankan; Knip melaporkan `@types/mailparser` serta ekspor `SUGGESTION_CATEGORIES`/`SuggestionCategory` yang tidak digunakan. Pemeriksaan berkas pembaruan sendiri lulus.

Putaran awal dengan Bun 1.3.14 gagal pada intersepsi registry plugin; putaran Bun 1.4 menghapus kegagalan tersebut. Koreksi fixture branding dan waktu startup shell diverifikasi terpisah. Log rinci disimpan sementara di `/tmp/mingzhan-update-*.log`.

## Aktivasi instance lokal

Pada 25 Oktober 2026, instance Bun langsung pada `127.0.0.1:4310` dihentikan dengan SIGTERM dan dijalankan kembali dari build server terbaru. Docker tidak dipakai.

- Runtime Bun 1.4.0 disimpan khusus instance di `/Users/isdev/.local/share/mingzhan/runtime/bun-1.4.0/bin/bun`; instalasi global tidak diganti.
- Cadangan data sebelum migrasi: `/Users/isdev/.mingzhan-backups/before-secrets-upgrade-20261025-061407`.
- Master key disimpan dengan izin 0600 di `/Users/isdev/.config/mingzhan/dev-secrets.env`, di luar direktori data.
- Migrasi menghasilkan satu secret terenkripsi; field kredensial plaintext lama tidak lagi ada pada config.ini.
- Jumlah organisasi, pengguna, profil, sesi dan pesan tidak berubah setelah restart.
- Dashboard HTTP 200; health `ok=true`, `providerConfigured=true`, `userConfigured=true`.
- Proses baru PID 5398; log instance di `/Users/isdev/.mingzhan/logs/server.log`.


## Follow-up: optional setup recommendations

The user subsequently approved the non-chat onboarding pieces. Goals, the authenticated checklist API and manual Settings recommendations are implemented and activated. See [validation and use](mingzhan-setup-recommendations-2026-10-25.md). The initial chat remains unchanged.
