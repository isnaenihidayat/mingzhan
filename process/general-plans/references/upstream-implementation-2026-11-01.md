# Pembaruan MingZhan — 1 November 2026

## Cakupan

Adaptasi pembaruan sampai upstream `b54709a30b8e67da4178e17724e78567371895ad` / v0.4.67, berdasarkan [audit sebelumnya](upstream-gap-audit-2026-11-01.md). Basis MingZhan `cb8b8a15bec8032ec997f6947bfe97ffc5b0a2e8`.

Desain MingZhan dipertahankan. File desain chat awal `apps/web/src/pages/chat/chat-page-layout.tsx` dan `apps/web/src/index.css` tidak berubah. Tata letak title bar, group chat, prompt editor, maskot, quick starters dan panel artifact yang sudah ada dipertahankan. Kontrol baru memakai komponen dan tema yang ada. Fitur koneksi desktop LAN yang dibatalkan tidak dikembalikan.

## Fitur dan lokasi

| Bagian | Perubahan | Lokasi utama |
| --- | --- | --- |
| MCP | Tombol **Search registry** di halaman MCP, pencarian registry resmi, memilih remote HTTP untuk mengisi form manual, placeholder secret header tidak disimpan sebagai credential. Library MingZhan yang sudah ada tetap lengkap. | `apps/web/src/components/soul-tools/McpTab.tsx`; `apps/web/src/components/soul-tools/mcp-tab/{McpServersSection,McpServerDialog,mcp-connect-app-views}.tsx`; `apps/server/src/services/mcp-registry.ts`; `apps/server/src/http/routes/mcp.ts`; `packages/client/src/client-profiles.ts` |
| Composio | Kartu Connect dari percakapan, koneksi Notion lewat Composio jika tersedia, fallback ke MCP langsung, status Connected mengikuti assignment agent, tools diperbarui setelah konfigurasi/koneksi berubah, revisi terpisah per organisasi. | `apps/server/src/services/composio-{api-client,service,tool-bridge}.ts`; `apps/web/src/components/chat/{chat-message-list,assistant-tool-group}.tsx`; `apps/web/src/hooks/use-composio.ts`; `apps/web/src/lib/profiles.ts` |
| Automations | Pemilihan tools/MCP/connectors per automation. Identitas orang yang menyimpan dipakai untuk OAuth dengan pemeriksaan membership. Mengganti agent membersihkan batas lama. Pembatasan berlaku di server, termasuk meniadakan skill scripts, load_skill, sub-agent, Super dan org-memory helpers yang tidak dipilih. | `apps/web/src/pages/automations/{automations-components,automation-detail-panel,automations-dialogs,use-automations-page}.tsx/.ts`; `apps/server/src/services/{automation-service,automation-runner,agent-service}.ts`; `apps/server/src/tools/automation-tools.ts`; `packages/db/src/automation-store.ts`; `packages/core/src/contract.ts` |
| Skill loader | Model memilih skill dari katalog melalui **load_skill**, bukan pemicu kata kunci. Isi lengkap, referensi dan konteks host skill dimuat. `/skill` tetap bekerja. Skill yang tidak boleh dipanggil model tidak dimasukkan ke katalog model. Metadata lama tetap dapat dibaca tanpa kehilangan instruksi. | `apps/server/src/tools/skill-manage-tool.ts`; `apps/server/src/services/skills-service.ts`; `packages/core/src/skills/{compose,discover,match,parse,types}.ts`; `packages/agent/src/{chat-prompt,learn-prompt}.ts` |
| Presentasi | Skill bawaan **slide-deck-design**, template HTML 16:9, Prev/Next dan keyboard, satu slide per halaman PDF. Warna default disesuaikan ke teal MingZhan. | `packages/core/src/skills/bundled/slide-deck-design/SKILL.md`; `packages/core/src/skills/bundled/slide-deck-design/assets/deck.html`; `bundled-names.ts`; `bundled/install.ts` |
| Artifact/PDF | Cetak/download melalui browser dengan aset yang di-resolve; save_artifact dapat membuat PDF dari HTML. Renderer headless Chrome tersedia dengan pembatasan network/berkas. Docker mempertahankan fallback WeasyPrint untuk host yang tidak dapat menjalankan sandbox Chrome. | `apps/web/src/lib/artifact-html-preview.ts`; `apps/web/src/components/chat/use-artifact-attachment-preview-panel.tsx`; `apps/server/src/services/html-pdf.ts`; `apps/server/src/tools/save-artifact-tool.ts`; `Dockerfile` |
| Notifikasi | Reply notifications pada halaman Notifications, web push, subscription dibersihkan ketika logout, navigasi membuka organisasi yang tepat. Electron memakai notifikasi lokal dan izin hanya untuk origin server yang benar. Popup opt-in otomatis tidak dipasang di chat awal. | `apps/server/src/services/{web-push,web-push-service}.ts`; `apps/server/src/http/routes/web-push.ts`; `apps/web/src/hooks/use-web-push.ts`; `apps/web/sw/service-worker.ts`; `apps/web/src/context/auth-context.tsx`; `apps/desktop/main.mjs` |
| Status chat | Tombol **Chat status** pada percakapan yang sudah berjalan; panel agent/model/channel, konteks, MCP/connectors dan outputs. Preview output memakai panel artifact yang sudah ada. Tidak menambahkan top bar baru atau kontrol pada welcome/chat awal. | `apps/web/src/pages/chat/{chat-status-panel,chat-page-content}.tsx`; `apps/web/src/context/chat-attachment-panel-context*.tsx/.ts` |
| Notifikasi menunggu | Dock notifikasi sidebar saat ada agent yang membutuhkan pengguna. | `apps/web/src/components/{SidebarNotifications,AppSidebar,ProfileRail}.tsx`; `apps/web/src/pages/NotificationsPage.tsx` |
| Antrean chat | Edit, hapus, dan kirim sekarang pada pesan antre, serta reset chat baru melalui satu jalur. | `apps/web/src/components/chat/{ChatMessageQueuePanel,chat-composer}.tsx`; `apps/web/src/pages/chat/{use-chat-page.ts,chat-page-content.tsx}` |
| API key | Tombol tampil/sembunyikan key, pembatasan field yang dikelola environment, Cancel/Save. Padding dasar dialog MingZhan dipertahankan. | `apps/web/src/components/chat/chat-add-capabilities-dialogs.tsx` |
| Microsoft Teams | `!help`, `!new`, `!clear`, `!stop`, `!status`; stop menjangkau giliran aktif dan antre. Balasan parsial tidak hilang. | `apps/platform/teams/src/chat-handler.ts` |

## Stabilitas, keamanan dan runtime

| Bagian | Perbaikan | Lokasi |
| --- | --- | --- |
| Streaming | Drain buffer ketika batas byte tercapai, perhitungan UTF-8 bytes, pertahankan snapshot tools aktif. | `apps/server/src/services/session-turn-registry.ts` |
| Backup | Lewati berkas/direktori non-konfigurasi yang terhapus di tengah export; manifest mengikuti isi yang benar-benar tersimpan. Kehilangan konfigurasi tetap gagal. | `apps/server/src/services/data-portability.ts` |
| Callback OAuth | Header forwarded hanya dipercaya ketika operator mengaktifkan trusted proxy; public URL terkonfigurasi tetap didahulukan. | `apps/server/src/services/composio-callback-url.ts` |
| Composio usang | Akun yang ditolak ditandai perlu dihubungkan ulang; error satu aplikasi tidak memutus seluruh chat. | `apps/server/src/services/composio-{api-client,service,tool-bridge}.ts` |
| Provider | Hapus provider yang baru dibuat jika API key ditolak, agar record kosong tidak menjadi default. | `apps/web/src/hooks/use-app-queries.ts`; `apps/web/src/components/settings/provider-instance-card.tsx` |
| Slack | Simpan event sampai turn selesai; ack setelah diterima aman; pemulihan setelah crash dan deduplikasi. | `apps/platform/slack/src/{chat-handler,index,socket}.ts` |
| Turn lifecycle | Runner dan policy terpusat untuk lock, stream/replay, hooks, timeout, cancel dan cleanup ACP. Automation/workflow tanpa pengguna tidak mendapatkan ask_user_question. | `apps/server/src/services/{turn-runner,turn-kinds,agent-service}.ts`; `apps/server/src/http/routes/sessions.ts`; `apps/server/src/tools/sub-agent-tool.ts` |
| Child chat | Channel web untuk child; akses shared parent untuk child, bukan branch; batas child terbuka; query/index parent langsung; close/delete cascade. Pilihan profile/model/thinking dan project MingZhan tetap diwariskan sesuai fungsi sebelumnya. | `apps/server/src/services/agent-service.ts`; `packages/db/src/{adapters/sqlite,migrate,types}.ts` |
| Netra | Context dan output limit dibaca dari model endpoint; cache, retry metadata yang belum lengkap, dan compaction mengikuti batas model. Opsi output statis tetap kompatibel. | `apps/server/src/providers/{compatible-models,netra-model-limits,create}.ts`; `apps/server/src/providers/openai-compatible/index.ts`; `apps/server/src/services/agent-service.ts` |
| Docker updater | Status running sejak request menunggu, progres layer download, serta reload script dari image yang baru dipasang. | `scripts/mingzhan-updater.sh`; `apps/server/src/services/system-status-service.ts`; `apps/web/src/components/settings/VersionSettingsRow.tsx`; `packages/core/src/contract.ts` |
| Distribusi skill | Referensi Markdown ikut dikemas dalam image, bukan hanya SKILL.md. | `.dockerignore` |
| record-demo | Baca hasil evaluate melalui `res.value` saat flush frame. Ini skill pengembang repository, bukan skill produk untuk semua pengguna. | `.agents/skills/record-demo/SKILL.md` |

## Verifikasi

- Suite non-web: **4.776 lulus, 22 skip, 0 gagal**. Skip mencakup pemeriksaan spesifik platform/lingkungan yang tidak tersedia.
- Suite web: **988 lulus, 0 gagal**.
- Regresi UI integrasi MCP dan antrean: **27 lulus, 0 gagal**.
- Regresi PDF/save_artifact setelah penyesuaian renderer: **18 lulus, 0 gagal**, termasuk headless Chrome nyata di macOS, slide terpisah, dan pembatasan aset.
- Model limit Netra/output request: **23 lulus, 0 gagal** (tercakup pula pada suite non-web).
- Unit desktop: **15 lulus**. Smoke Electron dan runtime desktop yang baru dibangun lulus: setup, akun persisten, chat sesudah relaunch, shutdown dan parent disconnect.
- Build web beserta TypeScript, server dan seluruh worker dalam Docker berhasil. `check:ci`, Knip dan syntax shell updater lulus.
- Registry resmi diuji langsung dari container: HTTP 200, 16 hasil Notion, termasuk 6 server remote HTTP.
- PDF pada image Docker nyata berhasil menghasilkan `%PDF` menggunakan fallback tanpa menonaktifkan sandbox Chrome.
- Pemeriksaan pasca-restart: `/health` OK, versi 1.0.4, API v1, `userConfigured=true`; `/chat` HTTP 200; endpoint registry membutuhkan autentikasi.
- Jumlah data sebelum/sesudah restart: **16 sessions, 2 profiles, 2 projects**, sama.

## Docker dan pemulihan

Image final lokal: `sha256:0ac68cf26358885b867f1c5a3ea438dce9a171340a1456652736e8d7e92f73cf`.

Image lokal diperbarui dan instance `mingzhan-mingzhan-1` direstart. Service `mingzhan-updater-1` diaktifkan melalui profile Compose `updater`; heartbeat tersedia. Volume data, backup dan updater lama digunakan kembali.

Backup konsisten dibuat setelah aplikasi dihentikan, sebelum image diganti:

`/mingzhan/backups/pre-upstream-20261101T142052Z.tar.gz`

Backup berada di volume `mingzhan_mingzhan-backups` dengan izin terbatas. Socket PM2 tidak diarsipkan; socket dibuat kembali saat runtime aktif. Image sebelum pembaruan dipertahankan sebagai `mingzhan:before-update-20261101`.

## Tidak diterapkan atau masih memerlukan lingkungan/akun

1. **Restyle title bar, layout group/panel, Prompt tab/side-sheet editor dan Groups empty state upstream tidak diterapkan**, sesuai permintaan mempertahankan desain MingZhan. Fungsi baru diintegrasikan ke komponen yang ada.
2. **Popup opt-in notifikasi otomatis pada chat awal tidak diterapkan.** Pengguna mengaktifkan Reply notifications melalui halaman Notifications. Web push memerlukan browser yang mendukung, izin pengguna, dan secure context (HTTPS atau localhost).
3. **Headless Chrome native belum dapat dipakai pada host Docker ini karena sandbox dibatasi host**, termasuk setelah paket chromium-sandbox diuji. Sandbox tidak dinonaktifkan. PDF otomatis tetap berfungsi melalui fallback WeasyPrint; hasil layout kompleks dapat berbeda dari Chrome. Untuk hasil print yang mengikuti browser, gunakan kontrol PDF/print browser. Headless Chrome sudah teruji pada macOS dan tetap tersedia di source bagi host yang mendukung sandbox.
4. **Login/OAuth Composio, kredensial MCP dan channel Teams/Slack tidak dibuat atas nama pengguna.** Implementasi dan tes tersedia; penggunaan layanan nyata memerlukan konfigurasi serta izin akun masing-masing.
5. **Installer desktop baru dan pengujian native Windows/Linux belum dibuat pada tugas ini.** Source dan runtime desktop diperbarui serta diuji pada macOS. Aplikasi desktop yang sudah terpasang memerlukan build/installer baru untuk menerima perubahan native notifikasi. Fitur koneksi server LAN tetap dibatalkan.
6. **Tidak ada push atau rilis GitHub pada tugas ini.** Pembaruan berjalan pada checkout dan instance Docker lokal.

Daftar semua berkas yang berubah, termasuk pengujian, tersedia pada `upstream-update-files-2026-11-01.txt` di folder ini.
