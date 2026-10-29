# Perbandingan Nakama terbaru dengan MíngZhàn

Tanggal: 25 Oktober 2026, Asia/Jakarta. Mode: perbandingan kode, tanpa implementasi.

## 1. Sumber dan batas pemeriksaan

- Upstream: https://github.com/ahmadrosid/nakama, branch `main`.
- Upstream diperiksa pada commit `12dc48a2db7271d95c8865df0cabf9adbd0a2620`, release `v0.4.59`, terbit 25 Oktober 2026 pukul 00.33.55 WIB.
- Salinan Nakama lokal: `/Users/isdev/OtherHD/Dev/MingZhan/nakama`, HEAD `015886df33d4`. Referensi `origin/main` diperbarui dengan fetch; checkout tidak dipindah.
- MíngZhàn: `/Users/isdev/OtherHD/Dev/MingZhan/mingzhan`, HEAD `82d6569`; working tree termasuk perubahan UI dan bundel plugin yang sudah ada milik pengguna.
- MíngZhàn memiliki riwayat Git tersendiri; 22 commit yang dihitung adalah perubahan upstream setelah baseline Nakama lokal, bukan jarak ancestry Git MíngZhàn.
- Normalisasi nama Nakama/MíngZhàn pada sumber aplikasi dan paket: 1.546 berkas sama dengan baseline, 66 berbeda, tidak ada berkas baseline yang hilang. Ini kesamaan teks setelah normalisasi, bukan bukti seluruh perilaku identik.
- Dari 86 berkas produksi TS/TSX/MJS/SQL yang berubah pada upstream: 5 belum ada, 73 masih sama dengan baseline setelah normalisasi merek, 8 punya perubahan lokal lain; tidak ada yang identik dengan versi terbaru setelah normalisasi.
- Temuan penting diperiksa langsung pada implementasi, kontrak, route dan/atau tes upstream serta padanannya di MíngZhàn. Tidak membaca kredensial runtime, tidak menjalankan migrasi, tidak menjalankan kode upstream, dan tidak mengubah kode aplikasi. Tidak dilakukan pengujian runtime atau eksploitasi keamanan.

## 2. Temuan dan peta sumber

### A. Pengelolaan kredensial terenkripsi — belum ada; prioritas tinggi

Upstream menambahkan `ManagedSecrets`, tabel SQLite `managed_secrets`, enkripsi AES-256-GCM, pembatasan scope, prioritas environment, migrasi kredensial lama, pemeriksaan integritas, dan rotasi master key. Mencakup provider API key, email password, web search, Composio, custom tool API key; patch berikutnya mencakup Kernel browser key. UI dapat membedakan secret dari environment atau Settings serta menghapus/memakai secret tersimpan.

Sumber: [#1638](https://github.com/ahmadrosid/nakama/pull/1638), [#2018](https://github.com/ahmadrosid/nakama/pull/2018), [#2013](https://github.com/ahmadrosid/nakama/pull/2013).

Modul upstream: `apps/server/src/services/managed-secrets.ts`, `packages/db/sql/schema.sql`, `packages/core/src/dev-secrets-key.ts`, `apps/server/src/services/data-portability.ts`, `apps/desktop/main.mjs` dan komponen pengaturan.

Bukti lokal: `managed-secrets.ts`, `dev-secrets-key.ts` dan tabel `managed_secrets` belum ada. `packages/core/src/user-config.ts` masih menulis `api_key: provider.apiKey`; `packages/core/src/email-config.ts` menulis `password: config.password`; `agent-browser-service.ts` menulis `api_key` pada konfigurasi browser. Custom-tool API key dan deklarasi environment **sudah memiliki enkripsi lokal** melalui `encryptCredential`; jangan menyebut MíngZhàn sama sekali belum punya enkripsi. Yang belum ada ialah sistem pengelolaan terpusat baru ini. Cakupan ini juga tidak membuktikan semua jenis rahasia, seperti seluruh token OAuth, otomatis ikut dimigrasi.

Dependensi: schema/migration, startup, Settings, tools, desktop/dev/Docker, backup/restore. Risiko: salah penamaan environment atau kehilangan master key dapat membuat kredensial tidak terbaca.

### B. Pembatasan secret pada proses anak — belum ada; prioritas tinggi

Upstream menghapus variabel secret dari environment bash/tools, worker PM2, coding harness dan proses pencarian. Konfigurasi sementara Codex/OpenCode/pi memakai referensi environment yang dipilih, bukan nilai API key di file. Patch ACP menyaring secret milik aplikasi dari `process.env` sambil tetap mengizinkan kredensial login provider yang memang dibutuhkan agen.

Sumber: [#1638](https://github.com/ahmadrosid/nakama/pull/1638), [#2022](https://github.com/ahmadrosid/nakama/pull/2022).

Bukti lokal: `providers/acp/acp-agent-process.ts` masih menjalankan `env: { ...process.env, ...launch.env }`; `getToolExecutionEnv` dan `mergeCodingAgentSpawnEnv` belum mempunyai filter baru `isSecretEnvKey`. `coding-agent-harness-config-files.ts` masih menuliskan API key langsung pada konfigurasi sementara.

Dependensi: `packages/core/src/secret-mask.ts`, ACP, coding-agent spawn/config, worker manager, `ensure-process-path.ts`, ripgrep. Tidak mengklaim ada kebocoran yang telah terjadi. Penamaan harus disesuaikan ke `MINGZHAN_*`; penyalinan filter `NAKAMA_*` saja tidak memadai.

### C. Informasi provider dibatasi berdasarkan peran — belum ada; prioritas tinggi

`GET /v1/providers` upstream hanya memberi non-platform-admin informasi identitas: id, label, type, modelCount, createdAt. Base URL, status kunci, inventaris custom model dan routing tidak ikut dikirim kepada pengguna biasa.

Sumber: [#2010](https://github.com/ahmadrosid/nakama/pull/2010).

Bukti lokal: `apps/server/src/http/routes/models.ts:1713` hanya memanggil `getRequestAuth(c)` lalu langsung mengembalikan `agent.listProviders()`. `provider-instance-helpers.ts` memasukkan baseUrl, hasApiKey, customModels, wireApi dan routing dalam ringkasan. Ini metadata konfigurasi, **bukan bukti endpoint mengirim raw API key**.

Dependensi kecil: route dan tes peran; perlu memastikan UI anggota tetap memperoleh informasi yang diperlukan.

### D. Penanganan output yang mencapai batas token — belum ada; prioritas tinggi

Provider OpenAI-compatible menandai `finish_reason: length` sebagai `truncated`. Tool loop menolak eksekusi tool call yang terpotong, memberi konteks agar model membagi pekerjaan, dan mencoba langkah tanpa thinking bila reasoning menghabiskan output. Pesan akhir membedakan batas token dari respons kosong biasa.

Sumber: [#2019](https://github.com/ahmadrosid/nakama/pull/2019), disempurnakan [#2020](https://github.com/ahmadrosid/nakama/pull/2020).

Bukti lokal: `ChatCompletionResult` pada `packages/core/src/contract.ts` tidak memiliki `truncated`; `packages/agent/src/chat.ts` tidak memiliki alur `thinkingOff`, `TRUNCATED_TOOL_CALL_ERROR` atau pengambilan langkah tersebut. Flag truncated lain untuk daftar file/memori bukan fitur ini.

Dependensi: kontrak, provider result builder, adapter OpenAI-compatible dan agent loop. Risiko: menjaga urutan tool-result dan penggunaan token saat retry.

### E. Netra: output lebih panjang dan pemulihan stream — belum ada; prioritas tinggi jika dipakai

Netra meminta batas output 32.000 token secara default; nilai custom model tetap menang. Error respons kosong/stream tertentu menjadi error 502 dengan penyebab yang bisa ditampilkan. Stream yang terputus dapat dicoba satu kali; teks parsial dipertahankan dalam riwayat dan langkah tool yang terpotong ditutup.

Sumber: [#2020](https://github.com/ahmadrosid/nakama/pull/2020).

Bukti lokal: cabang Netra pada `providers/create.ts` tidak mengirim `maxOutputTokens`; `OpenAICompatibleProviderOptions` belum mempunyai opsi tersebut; `ProviderStreamInterruptedError` dan retry terkait belum ada. Dukungan provider Netra itu sendiri **sudah ada**.

Dependensi: D, adapter provider, API error, agent loop dan SSE. Error wrapping respons kosong juga menyentuh beberapa adapter lain; bukan berarti seluruh provider memiliki mekanisme deteksi stream terputus yang sama.

### F. Onboarding berbasis tujuan dan setup checklist — belum ada; opsional

Pengguna baru tanpa web chat dan tanpa tujuan tersimpan dapat diminta mengisi tujuan. Server menyiapkan maksimal lima tindakan dari katalog nyata: koneksi toolkit, aktivasi skill, dan konteks organisasi. Tidak mengarang id toolkit/skill. UI menampilkan proses penyusunan, checklist, selesai/lewati, serta progres tersimpan per user/org di browser.

Sumber: [#2008](https://github.com/ahmadrosid/nakama/pull/2008), [#2011](https://github.com/ahmadrosid/nakama/pull/2011), [#2012](https://github.com/ahmadrosid/nakama/pull/2012).

Upstream: `packages/agent/src/setup-checklist.ts`, `POST /v1/user/setup-checklist`, `chat-onboarding.tsx`, `use-chat-onboarding.ts`, health `onboardingEnabled`.

Bukti lokal: tiga modul baru dan endpoint/kontrak belum ada. USER.md dan pengaturan konteks pengguna yang ada bukan checklist ini.

Catatan: upstream **opt-in** lewat `NAKAMA_ENABLE_ONBOARDING=1` atau `true`. Menyentuh tampilan chat awal sehingga harus diperlakukan terpisah dari perubahan lain. Menghasilkan checklist memakai panggilan model; Composio opsional. Tidak otomatis memasang semua integrasi tanpa tindakan pengguna.

### G. Setup custom tool dapat dibatalkan dan kedaluwarsa — belum ada; prioritas sedang

Upstream menambah status `rejected`, tombol Cancel setup, `DELETE /v1/tool-setups/:setupId`, penghapusan staged credential dan pemeriksaan persetujuan terkini. Setup pending/approved dengan `createdAt` lebih dari tujuh hari dapat ditolak saat diperiksa; bukan scheduler yang menjamin pembersihan tepat tujuh hari. Setup lama tanpa `createdAt` tidak ikut aturan tersebut.

Sumber: bagian dari [#1638](https://github.com/ahmadrosid/nakama/pull/1638).

Bukti lokal: `ToolSetupPlanSchema` hanya berisi pending/approved/ready; `loadToolSetup()` langsung mengembalikan hasil parse. `rejectToolSetup` dan route delete belum ada. Persetujuan setup custom tool dasar **sudah ada**.

Dependensi: managed secrets, custom-tool-shared, tools route, client, kontrak dan chat capability dialog.

### H. Koreksi panduan slide HTML — belum ada; perubahan kecil

Panduan artifact-design menjelaskan bahwa slide `container-type: size` tidak memperoleh lebar dari isi. Wrapper di antara body dan slide perlu lebar eksplisit seperti `width:100%`, agar slide tidak menyusut menjadi nol.

Sumber: [#2026](https://github.com/ahmadrosid/nakama/pull/2026), perubahan yang dirilis dalam v0.4.59.

Bukti lokal: `packages/core/src/skills/bundled/artifact-design/SKILL.md:91` belum memiliki tambahan tersebut. Ini perbaikan **instruksi pembuatan artefak**, bukan patch CSS yang otomatis memperbaiki semua slide yang sudah dibuat.

### I. Penyempurnaan UI kecil — belum ada; prioritas rendah

- Avatar agen di rail tetap berwarna; agen aktif ditandai garis di kiri. Lokal masih `opacity-45 grayscale`. [#2002](https://github.com/ahmadrosid/nakama/pull/2002).
- Tombol New chat grup diletakkan sebelum menu aksi. Lokal masih menu aksi lebih dulu. [commit a9959eb3](https://github.com/ahmadrosid/nakama/commit/a9959eb34c3b).

### J. Pemeliharaan, bukan fitur pengguna baru

- [#2016](https://github.com/ahmadrosid/nakama/pull/2016): satukan schema tool Super Nakama dengan Zod dan jalur seed profil. Lokal masih mempunyai implementasi lama; perlu menjaga aturan Super MíngZhàn yang dimodifikasi.
- [#1999](https://github.com/ahmadrosid/nakama/pull/1999): cassette pengujian MCP discovery eager/lazy; bukan penambahan fitur discovery yang sama sekali baru.
- [#2017](https://github.com/ahmadrosid/nakama/pull/2017): pengurangan tes bernilai rendah. Tidak otomatis disarankan menyalin penghapusan tes.
- Pembaruan README maintainer dan nomor release: tidak menambah kemampuan produk.

## 3. Yang sudah ada, sehingga tidak dihitung sebagai gap baru

MíngZhàn sudah memiliki provider Netra, MCP, Composio, custom tools beserta enkripsi kredensial tool lama, plugin Workflows/Supermemory/Data View, remote bash sandbox, thinking effort per sesi, group memory, lampiran grup, dan impor konfigurasi MCP OpenCode. Sebagian besar berasal dari baseline yang sama. Perbedaan nama merek, label Indonesia, angka versi `1.0.0`, serta bundel plugin lokal tidak dipakai untuk menentukan ketertinggalan fitur.

## 4. Matriks dependensi dan konflik lokal

| Area | Status | Titik lokal | Konflik utama |
|---|---|---|---|
| Metadata provider per peran | Perbaikan belum ada | models route | Kontrak yang dipakai UI anggota |
| Penyimpanan secret | Baru | db, config, agent-service, Settings | Master key, migrasi, backup, nama MINGZHAN |
| Environment proses anak | Perbaikan belum ada | ACP, coding harness, PM2, tools | Kredensial yang memang perlu diteruskan |
| Output-limit dan stream | Perbaikan belum ada | agent chat, provider shared, compatible provider | Retry, history, side effect alat |
| Onboarding checklist | Baru, opt-in | user-context, chat page, client | Chat awal memiliki modifikasi pengguna |
| Cancel/expiry setup tool | Belum ada | custom-tool-shared, tool routes | Bergantung secret store dan persetujuan |
| Panduan slide | Koreksi belum ada | artifact-design skill | Tidak memulihkan artefak lama |
| Rail/grup UI | Perbaikan kecil belum ada | ProfileRail, AgentGroupChatPage | Menjaga arah desain lokal |

## 5. Pertanyaan penguji asumsi

| Pertanyaan | Jawaban upstream | Jawaban lokal | Risiko bila salah |
|---|---|---|---|
| Apakah nomor versi menunjukkan parity? | v0.4.59 | v1.0.0 merupakan versi merek lokal; Git terpisah | Salah memilih baseline dan menyalin ulang fitur yang sudah ada |
| Apakah semua kredensial lokal masih plaintext? | Sebagian baru dipindah ke managed_secrets; migrasi mendukung format tool lama | Custom-tool credentials sudah terenkripsi, beberapa settings masih menulis file | Migrasi dapat merusak atau menggandakan kredensial; kritis |
| Apakah prefix environment sama? | NAKAMA_* | MINGZHAN_* | Filter salah tidak menutup akses atau memblokir login; kritis |
| Apakah GET providers perlu raw config untuk semua peran? | Non-admin menerima identitas saja | Endpoint lokal mengembalikan metadata lebih lengkap | Terlalu banyak metadata atau UI rusak; perlu uji peran |
| Apakah jawaban kosong selalu model tidak menjawab? | Bisa thinking menghabiskan batas atau stream terputus | Kontrak lokal belum membedakan kasus tersebut | Retry salah dan tool call terpotong dianggap valid |
| Apakah onboarding aman dipasang tanpa keputusan UI? | Opt-in dan mengganti empty-state chat bagi pengguna baru | Chat awal diminta dipertahankan dan sudah diedit lokal | Konflik UX; tunda UI ini |
| Apakah mengambil commit langsung aman? | Paket @nakama dan identitas upstream | Paket @mingzhan, kebijakan profil dan branding berbeda | Konflik lintas modul dan perilaku izin; kritis bila menyentuh isolasi organisasi |
| Apakah update panduan memperbaiki semua slide lama? | Hanya instruksi untuk generasi berikutnya | File artefak lama tetap tersimpan | Janji perbaikan yang tidak benar |

## 6. Matriks keputusan

| Keputusan | Opsi | Rekomendasi perbandingan |
|---|---|---|
| Provider metadata | Adaptasi patch route kecil | Dahulukan; manfaat jelas, area sempit |
| Reliability model | Pindahkan D dan E sebagai satu rangkaian perilaku | Dahulukan bila memakai Netra; hindari mengambil potongan kontrak saja |
| Secrets | Adaptasi sistem end-to-end atau mempertahankan format lama | Prioritas tinggi; butuh validasi migrasi/restore dan penamaan sebelum implementasi |
| Proses anak | Filter sesuai tujuan proses | Dahulukan bersamaan dengan pembatasan credential; jangan hapus semua login provider di ACP |
| Tool setup | Adaptasi bersama credential store | Sesudah dependensi secret siap |
| Slide | Tambahan panduan kecil | Kandidat perubahan terpisah berisiko rendah |
| Onboarding | Seluruh flow, hanya logika server, atau tunda | Tunda UI karena menyentuh chat awal; bukan kebutuhan untuk patch reliability/security |
| Pemeliharaan/test deletion | Ambil selektif | Refactor dan penghapusan tes bukan target fitur pengguna |

## 7. Risiko dan batas kesimpulan

Tiga asumsi kritis: migrasi/restore rahasia, penamaan environment pada proses anak, dan isolasi organisasi/izin saat mengadaptasi patch ke fork. Kategori risiko adaptasi: sedang menurut rubrik skill (3–4 asumsi kritis). Karena permintaan hanya pemeriksaan, hasil tetap berupa perbandingan, tanpa migrasi atau implementasi.

Kesimpulan “belum ada” berarti perilaku/struktur patch yang diperiksa belum ditemukan di working tree lokal, bukan bukti semua kegagalan akan terjadi pada penggunaan nyata. Pemeriksaan statis tidak membuktikan konfigurasi deployment, kebocoran aktif, atau keberhasilan perbaikan runtime.

## 8. Rekomendasi akhir

Dahulukan pembatasan informasi provider dan environment proses anak, diikuti perbaikan batas output/stream. Sistem secret baru penting, tetapi harus diperlakukan sebagai satu migrasi teruji, termasuk startup dan backup/restore. Koreksi panduan slide dapat berdiri sendiri. Onboarding dan UI rail bersifat opsional serta tidak perlu mengubah chat awal untuk memperoleh perbaikan keamanan/reliability lainnya.
