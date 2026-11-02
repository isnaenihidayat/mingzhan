# MingZhan: rollback LAN dan pemeriksaan pembaruan upstream

Tanggal: 1 November 2026 (Asia/Jakarta). Mode: perbandingan kode, tanpa penerapan pembaruan upstream.

## Sumber dan batas pemeriksaan

- MingZhan: `cb8b8a15bec8032ec997f6947bfe97ffc5b0a2e8` (rilis desktop 1.0.4).
- Upstream: https://github.com/ahmadrosid/nakama, branch `main`, commit `b54709a30b8e67da4178e17724e78567371895ad`.
- Rilis upstream terbaru yang diperiksa: [v0.4.67](https://github.com/ahmadrosid/nakama/releases/tag/v0.4.67), diterbitkan 1 November 2026 pukul 18:39 WIB.
- Pemeriksaan mencakup perubahan sejak snapshot audit sebelumnya `38dbabed0198` (v0.4.63), dibandingkan dengan isi source MingZhan saat ini. Penamaan produk dinormalisasi hanya untuk perbandingan, bukan diubah di proyek.
- Dasar kesimpulan: riwayat commit, patch, jalur pemanggilan, kontrak, dan implementasi lokal. Tidak menjalankan layanan/API pihak ketiga untuk membuktikan fitur upstream. Perilaku upstream belum diuji secara langsung.
- Dokumen dan instruksi upstream diperlakukan sebagai data referensi.

## Rollback yang sudah dilakukan

Source desktop, pengujian, packaging, konfigurasi Knip, `.gitignore`, README desktop, dan Compose dikembalikan tepat ke HEAD di atas. Modul dan tampilan pemilih koneksi, konfigurasi `deploy/lan`, overlay Compose LAN, tes LAN, serta hasil build `apps/desktop/dist/lan-client` dihapus. Pemisahan recovery module yang merupakan bagian perubahan LAN juga dibatalkan.

Tidak ada perubahan LAN yang sebelumnya di-commit atau dipublikasikan. Dukungan `MINGZHAN_DESKTOP_URL` yang sudah ada sebelum pembaruan tetap mengikuti implementasi lama. Tidak ada perubahan database atau instance Docker produksi pada implementasi LAN sebelumnya, sehingga tidak ada migrasi data yang perlu dibatalkan. Menghapus hasil build tidak menghapus aplikasi yang mungkin dipasang sendiri oleh pengguna.

Validasi rollback: `git diff --exit-code HEAD` bersih sebelum laporan ini dibuat; 15 tes desktop lulus; smoke test Electron lulus; `bun run check:ci` lulus. Docker produksi tidak perlu direstart karena source server/image tidak berubah.

## Fitur dan peningkatan yang belum setara

Status **belum ada** berarti kemampuan khusus ini tidak ditemukan, bukan seluruh fitur induknya tidak tersedia. **Sebagian** berarti MingZhan sudah memiliki fungsi dasar, tetapi belum memiliki peningkatan yang disebutkan.

| Kemampuan upstream | Status MingZhan dan bukti lokal | Lokasi integrasi | Sumber |
| --- | --- | --- | --- |
| Cari MCP melalui registry resmi dan isi konfigurasi dari hasil pencarian | Belum ada. Library lokal/manual/import sudah tersedia, tetapi tidak ada `mcp-registry.ts` atau kontrak pencarian registry. Upstream hanya menampilkan remote HTTP/streamable HTTP, bukan seluruh paket stdio/SSE. Perbaikan placeholder header diperlukan bersama fiturnya. | `apps/server/src/http/routes/mcp.ts`; `apps/web/src/components/soul-tools/mcp-tab/McpServerDialog.tsx`; `packages/client/src/client-profiles.ts`; `packages/core/src/contract.ts` | [#2201](https://github.com/ahmadrosid/nakama/pull/2201), [#2240](https://github.com/ahmadrosid/nakama/pull/2240) |
| Koneksi Notion sekali klik melalui Composio; kartu Connect untuk aplikasi Composio dari chat; tools diperbarui setelah koneksi berubah | Sebagian. OAuth Composio untuk toolkit yang sudah ditugaskan tersedia. Notion di library MCP memakai endpoint MCP langsung. Belum ada alur Composio baru, kartu Connect yang mengikuti assignment profil, atau revisi tools per organisasi. | `apps/server/src/services/composio-{service,tool-bridge,api-client}.ts`; `apps/web/src/hooks/use-composio.ts`; `apps/web/src/components/chat/assistant-tool-group.tsx`; dialog MCP/capabilities | [#2182](https://github.com/ahmadrosid/nakama/pull/2182), [#2242](https://github.com/ahmadrosid/nakama/pull/2242) |
| Batas tools, server MCP, dan connectors per automation; identitas akun eksekusi | Belum ada batas per automation. Assignment tools pada profil sudah ada. Kontrak automation belum memiliki `toolLimit`/`runAsUserId`. Upstream memeriksa membership dan tidak menyertakan skill/Super/org-memory tools yang tidak ada dalam pemilih saat batas aktif. | `packages/core/src/contract.ts`; `packages/db/src/automation-store.ts`; `apps/server/src/services/{automation-service,automation-runner,agent-service}.ts`; `apps/web/src/pages/automations/` | [#2216](https://github.com/ahmadrosid/nakama/pull/2216) |
| Model memilih dan memuat instruksi skill melalui `load_skill` | Belum ada. Lokal masih menggunakan `matchSkillsForMessage` dan `composeMatchedSkillsPrompt`. `/skill` dan skill yang tidak boleh dipanggil model harus tetap dihormati jika diadaptasi. | `apps/server/src/tools/skill-manage-tool.ts`; `apps/server/src/services/skills-service.ts`; `apps/server/src/services/agent-service.ts`; `packages/core/src/skills/` | [#2218](https://github.com/ahmadrosid/nakama/pull/2218) |
| Skill `slide-deck-design`, template HTML 16:9, navigasi keyboard, satu slide per halaman PDF, warna brand saat print | Belum ada skill/template ini. MingZhan sudah memiliki skill `pptx`, yang menghasilkan jenis keluaran berbeda. | `packages/core/src/skills/bundled/`; `packages/core/src/skills/bundled-names.ts`; `packages/core/src/skills/bundled/install.ts` | [#2236](https://github.com/ahmadrosid/nakama/pull/2236), [#2239](https://github.com/ahmadrosid/nakama/pull/2239) |
| Cetak artifact HTML melalui browser; PDF otomatis melalui headless Chrome | Sebagian. Export PDF sudah ada, tetapi `html-pdf.ts` masih memakai WeasyPrint. Upstream mengganti jalur render, aturan aset, print CSP, Docker dan ekspor tool; bukan sekadar mengganti tombol. | `apps/server/src/services/html-pdf.ts`; `apps/server/src/tools/save-artifact-tool.ts`; `apps/web/src/lib/artifact-html-preview.ts`; `apps/web/src/components/chat/use-artifact-attachment-preview-panel.tsx`; `Dockerfile` | [#2231](https://github.com/ahmadrosid/nakama/pull/2231) |
| Web push ketika balasan selesai, pencabutan subscription saat logout, membuka organisasi yang tepat; notifikasi desktop | Belum ada alur push ini. Notifikasi internal sudah ada, tetapi service/routes/hook web push tidak ada. Desktop hanya mengizinkan `clipboard-sanitized-write`, belum `notifications`. | `apps/server/src/services/web-push*.ts` (baru); routes web-push (baru); `apps/web/sw/service-worker.ts`; auth context; `apps/desktop/main.mjs` | [#2186](https://github.com/ahmadrosid/nakama/pull/2186), [#2189](https://github.com/ahmadrosid/nakama/pull/2189), [#2191](https://github.com/ahmadrosid/nakama/pull/2191), [#2203](https://github.com/ahmadrosid/nakama/pull/2203) |
| Panel Status chat: agent/model/channel, konteks, MCP, connectors dan outputs; dock notifikasi sidebar | Belum ada panel ini. Artifact panel dan notifikasi internal yang ada tidak setara dengan panel Status/dock baru. Mengubah UI; perlu keputusan desain terpisah. | `apps/web/src/pages/chat/chat-status-panel.tsx` (baru); `chat-page-content.tsx`; attachment panel context; `SidebarNotifications.tsx` | [#2207](https://github.com/ahmadrosid/nakama/pull/2207), [#2242](https://github.com/ahmadrosid/nakama/pull/2242) |
| Perintah Teams `!help`, `!new`, `!clear`, `!stop`, `!status`, termasuk menghentikan giliran antre | Belum ada parser/handler perintah tersebut pada Teams. Channel Teams dasar sudah tersedia. | `apps/platform/teams/src/chat-handler.ts` | [#2226](https://github.com/ahmadrosid/nakama/pull/2226) |

## Perbaikan teknis yang masih tertinggal

| Prioritas kajian | Perbaikan dan bukti selisih | Lokasi MingZhan | Sumber |
| --- | --- | --- | --- |
| Tinggi | Gate header forwarded pada resolver callback dengan `MINGZHAN_TRUST_PROXY`. Flag rate limiter sudah ada, tetapi resolver callback lokal masih membaca `X-Forwarded-Host/Proto` tanpa gate tersebut. | `apps/server/src/services/composio-callback-url.ts` | [#2176](https://github.com/ahmadrosid/nakama/pull/2176) |
| Tinggi | Drain buffer streaming saat batas byte tercapai; hitung UTF-8 bytes dan pertahankan snapshot aktif. Loop lokal dapat tetap melebihi batas byte setelah compact tanpa mengurangi event bila jumlah event sudah di bawah batas. Ini temuan source, bukan kejadian hang yang direproduksi pada instance produksi. | `apps/server/src/services/session-turn-registry.ts` | [#2188](https://github.com/ahmadrosid/nakama/pull/2188), [#2193](https://github.com/ahmadrosid/nakama/pull/2193) |
| Tinggi | Akun Composio yang ditolak tidak merusak seluruh chat; tandai koneksi usang dan tetap jalankan aplikasi lain. Lokal belum memiliki `findRejectedConnectedAccountIds`/penanganan sesi yang baru. | `apps/server/src/services/composio-{api-client,service,tool-bridge}.ts` | [#2246](https://github.com/ahmadrosid/nakama/pull/2246) |
| Tinggi | Backup toleran terhadap file/direktori non-konfigurasi yang terhapus ketika export berjalan; hitungan manifest mengikuti isi yang benar-benar diarsipkan. Kehilangan konfigurasi tetap gagal. Lokal masih membaca setiap file tanpa penanganan race ini. | `apps/server/src/services/data-portability.ts` | [#2245](https://github.com/ahmadrosid/nakama/pull/2245) |
| Tinggi | Saat key provider baru ditolak, hapus record provider yang baru dibuat agar tidak menjadi default kosong. Mutation lokal belum melakukan cleanup setelah `setProviderSecret` gagal. | `apps/web/src/hooks/use-app-queries.ts`; `provider-instance-card.tsx` | [#2230](https://github.com/ahmadrosid/nakama/pull/2230) |
| Tinggi | Slack menyimpan event sampai giliran selesai dan melakukan ack setelah diterima aman, untuk pemulihan setelah crash. Lokal masih menggunakan kontrak onEvent void/ack awal tanpa alur durable baru. | `apps/platform/slack/src/{socket,index,chat-handler}.ts` | [#2217](https://github.com/ahmadrosid/nakama/pull/2217) |
| Sedang | Pembatasan tools per jenis turn dan satu turn runner untuk lock, replay, lifecycle, hook, dan cleanup ACP sebelum/ketika setup gagal. Jangan menambahkan `ask_user_question` ke automation/plugin workflow tanpa pengguna yang menunggu. Lokal belum memiliki `turn-kinds.ts`/`turn-runner.ts`; cleanup ACP baru dimulai setelah beberapa langkah setup. | `apps/server/src/services/agent-service.ts`; `apps/server/src/services/session-runtime.ts`; routes sessions; sub-agent tool | [#2181](https://github.com/ahmadrosid/nakama/pull/2181), [#2197](https://github.com/ahmadrosid/nakama/pull/2197), [#2198](https://github.com/ahmadrosid/nakama/pull/2198), [#2204](https://github.com/ahmadrosid/nakama/pull/2204), [#2213](https://github.com/ahmadrosid/nakama/pull/2213), [#2214](https://github.com/ahmadrosid/nakama/pull/2214) |
| Sedang | Child chat sub-agent: channel web, akses mengikuti shared parent hanya untuk child, branch tetap milik pembuatnya, query anak langsung/index parent, batas hanya child terbuka, cleanup close/delete. Lokal sudah mengabaikan chat tertutup saat membuat child, tetapi masih menghitung sibling dari daftar umum dan mewarisi channel parent. Jadi peningkatan ini sebagian, bukan seluruhnya hilang. | `apps/server/src/services/agent-service.ts`; sessions routes; `packages/db/src/{types,migrate,adapters/sqlite}.ts` | [#2225](https://github.com/ahmadrosid/nakama/pull/2225), [#2234](https://github.com/ahmadrosid/nakama/pull/2234) |
| Sedang | Context window Netra dibaca dari `/v1/models` untuk compaction, lookup dimulai lebih awal dan diulang jika metadata belum lengkap. Lokal baru membaca output limit. | `apps/server/src/providers/{compatible-models,create}.ts`; `agent-service.ts` | [#2238](https://github.com/ahmadrosid/nakama/pull/2238) |
| Sedang | Docker updater langsung berstatus running sejak request menunggu, progres layer download, serta menjalankan script versi yang baru dipasang. Lokal belum memiliki progress field dan waiting-request handling yang baru. | `apps/server/src/services/system-status-service.ts`; `apps/web/src/components/settings/VersionSettingsRow.tsx`; `scripts/mingzhan-updater.sh`; kontrak core | [#2221](https://github.com/ahmadrosid/nakama/pull/2221) |
| Rendah | `?new=1` menggunakan satu `enterDraftChat` dan menangani storage yang tidak tersedia. Handler lokal masih memiliki reset duplikat. | `apps/web/src/pages/chat/use-chat-page.ts` | [#2241](https://github.com/ahmadrosid/nakama/pull/2241) |
| Rendah | Skill pengembang `record-demo`: hasil `page.evaluate` dibaca dari `res.value` saat flush frame. Ini bukan skill produk yang otomatis tersedia untuk semua agent. | `.agents/skills/record-demo/SKILL.md` | [#2235](https://github.com/ahmadrosid/nakama/pull/2235) |

## Perubahan desain yang terpisah dari fungsi

Belum diambil dan bukan rekomendasi untuk diterapkan otomatis:

- Title bar/panel baru [#2174](https://github.com/ahmadrosid/nakama/pull/2174), tinggi top bar seragam [#2194](https://github.com/ahmadrosid/nakama/pull/2194), layout group chat [#2192](https://github.com/ahmadrosid/nakama/pull/2192). Preferensi sebelumnya untuk mempertahankan desain tetap berlaku.
- Prompt tab dan editor side sheet [#2206](https://github.com/ahmadrosid/nakama/pull/2206).
- Dialog API key Connect tool [#2205](https://github.com/ahmadrosid/nakama/pull/2205).
- Contoh pesan pada Groups empty state [#2202](https://github.com/ahmadrosid/nakama/pull/2202).
- Panel Status/dock di atas juga perubahan UI, meski membawa fungsi baru.

## Sudah tersedia atau tidak dihitung sebagai fitur baru

- Session runtime [#2177](https://github.com/ahmadrosid/nakama/pull/2177).
- Pembukaan kembali artifact panel setelah reload [#2175](https://github.com/ahmadrosid/nakama/pull/2175).
- Link chat sub-agent dan pemberitahuan selesai background run di chat [#2168](https://github.com/ahmadrosid/nakama/pull/2168).
- Pemulihan worker lock [#2172](https://github.com/ahmadrosid/nakama/pull/2172).
- Validasi admin terakhir yang usable [#2151](https://github.com/ahmadrosid/nakama/pull/2151).
- Group API membuang unknown keys, sementara tool tetap strict [#2149](https://github.com/ahmadrosid/nakama/pull/2149).
- Panduan artifact print-friendly [#2179](https://github.com/ahmadrosid/nakama/pull/2179); ini belum mencakup penggantian mesin PDF baru.
- Skill pengembang record-demo dasar [#2178](https://github.com/ahmadrosid/nakama/pull/2178); perbaikan flush lebih baru masih tertinggal.
- ACP SDK 2.0.2, MCP SDK 1.32.2, Composio 0.27.0, CJK 1.0.4, Knip 6.43.0, dan pembaruan paket docs yang diperiksa sudah sesuai. Sort import dictation tidak memberi fitur baru.
- Perbaikan test Google Meet/Windows dan plugin worker marker adalah pemeliharaan tes, bukan kemampuan produk. Marker atomic write sudah ada lokal; perubahan timeout test Google Meet perlu dibandingkan terpisah jika test suite diport.
- Nomor rilis, README pemasaran, dan kontak keamanan upstream bukan fitur yang perlu disalin.

## Matriks dependensi dan keputusan

| Keputusan | Cara upstream | Kondisi lokal | Risiko utama | Rekomendasi kajian |
| --- | --- | --- | --- | --- |
| Isolasi akun automation | runAsUserId + membership + allowlist | Profil/org/auth tersedia, field automation baru belum ada | Tinggi: meminjam OAuth akun yang salah | Adaptasi kontrak dan enforcement bersamaan, jangan hanya UI picker |
| Registry MCP | API publik resmi, remote HTTP saja | Library manual dan desain MCP khusus | Sedang: salah menganggap semua stdio sudah didukung registry | Tambahkan pencarian ke desain lokal, pertahankan form manual |
| Skill loading | load_skill mengganti keyword matching | Skill marketplace, skill custom/berkas pendukung tersedia | Sedang: assignment/izin/body skill berubah | Migrasikan katalog dan loader bersama, uji skill MingZhan yang sudah diadopsi |
| PDF | Browser print + headless Chrome server | WeasyPrint dan packaging desktop/Docker | Sedang/tinggi: akses URL/file lokal dan binary lintas OS | Audit batas aset/SSRF serta distribusi Chrome sebelum mengganti renderer |
| Push | Service worker + subscription server + native desktop permission | SW tersedia; desktop sengaja tidak mendaftarkan PWA SW | Sedang: notifikasi lintas org/logout atau ganda | Ikuti dua jalur web/native; hanya izin origin server yang benar |
| Runtime turns | Runner/policy terpusat | Session runtime sudah diadopsi; jalur one-shot masih terpisah | Tinggi: lock/cleanup berubah | Port bertahap dengan tes lifecycle dan fixture ACP yang ada |
| Tampilan | Komponen/top bar baru | Desain MingZhan diminta tetap | Sedang: regresi chat awal | Pisahkan usulan UI dari perbaikan backend |

## Lima pertanyaan uji asumsi sebelum adaptasi

1. **Apakah izin tool juga dibatasi di server?** Upstream memfilter tools/MCP/connectors dan meniadakan helper di luar picker. Lokal baru assignment profil. Jika salah, UI terlihat terbatas tetapi automation tetap bisa memakai tools lain.
2. **Akun siapa dipakai automation?** Upstream menyimpan pelaku eksekusi dan memeriksa keanggotaan saat run. Lokal belum menyimpan field yang sama. Jika salah, OAuth lintas pengguna/org bisa digunakan tidak semestinya.
3. **Apakah skill khusus tetap dimuat dengan konteks host dan assignment yang benar?** Upstream loader menyertakan host context/usage. Lokal memuat hasil keyword match. Jika salah, browser/computer/agent skill yang sudah diadopsi bisa kehilangan instruksi atau akses.
4. **Apakah browser dan desktop memakai jalur notifikasi yang sama?** Upstream membedakan web push dan renderer desktop. Lokal menonaktifkan registrasi PWA SW di Electron. Jika salah, desktop tidak menerima balasan atau menerima duplikat.
5. **Di mana mesin PDF berjalan dan apa yang boleh diakses?** Upstream memisahkan print browser dan headless Chrome server. Lokal bergantung Python/WeasyPrint. Jika salah, hasil print rusak, binary tidak tersedia, atau renderer menjangkau sumber yang tidak semestinya.
6. **Apakah refactor lifecycle mempertahankan antrean, replay, shutdown dan isolasi session?** Upstream runner/policy menguasai lifecycle lebih luas; lokal punya modifikasi project/visual/desktop sendiri. Jika salah, proses ACP atau lock bisa tertinggal.
7. **Apakah fitur perlu mengubah chat awal?** Sebagian perubahan upstream UI tidak diperlukan untuk memperbaiki backend. Jika salah, adopsi fungsi sekaligus mengganti desain yang pengguna minta dipertahankan.

Ringkasan risiko: empat asumsi kritis (izin tool/OAuth, loader skill dan konteks, batas renderer PDF, lifecycle session/ACP), sehingga risiko kajian **sedang** menurut hitungan framework. Patch kecil mempunyai cakupan lebih rendah; menyamakan seluruh tree upstream sekaligus tidak disarankan. Kompatibilitas aktual harus dibuktikan dengan tes lokal sebelum penerapan.

## Rekomendasi hasil kajian

Urutan manfaat: perbaikan streaming, backup, callback, provider dan Composio terlebih dahulu; kemudian batas automation, MCP registry, skill loader dan alur integrasi; setelah itu renderer PDF/push dan refactor runtime dengan tes lintas platform. Perubahan desain dipisahkan dari tahap fungsi.

Laporan ini hanya perbandingan dan tidak memberikan hasil uji runtime fitur upstream. Tidak ada fitur upstream baru yang diterapkan pada pemeriksaan ini. Tidak ada push atau rilis GitHub.
