# MingZhan (明战) Workspace

**Dari ide menjadi hasil kerja.**

MingZhan adalah workspace AI untuk percakapan, agen, dokumen, dan automasi. Setiap agen dapat memiliki identitas, instruksi, memori, tools, serta skills sesuai tugasnya. Workspace mendukung organisasi dan peran anggota agar akses data tetap terpisah.

Proyek ini dikembangkan dari [Nakama](https://github.com/ahmadrosid/nakama), dengan penyesuaian identitas MingZhan, terminologi Indonesia, skills bawaan, dan pembaruan fitur upstream.

## Fitur utama

| Bagian | Kemampuan |
| --- | --- |
| Percakapan | Chat dengan agen, lampiran dokumen, riwayat prompt, dan pertanyaan pilihan dari agen. |
| Agen | Identitas, gaya kerja, instruksi, memori, serta penetapan tools dan skills per agen. |
| Skills | 37 skills bawaan, pengelolaan versi, dan pencarian serta instalasi dari skills.sh. |
| Dokumen dan artefak | Preview lampiran, hasil kerja yang dapat ditinjau dan diedit sesuai format, serta ekspor artefak HTML ke PDF. |
| Automasi | Pekerjaan manual atau terjadwal, termasuk preset setiap jam dan beberapa jam. |
| Grup agen | Kolaborasi dalam percakapan dan thread, file bersama, serta preview perubahan memori grup. |
| Provider AI | Konfigurasi provider dan model, termasuk discovery katalog Cloudflare Workers AI. |
| Integrasi | MCP, Composio, plugin, dan kanal Telegram, WhatsApp, Discord, serta Slack. |
| Administrasi | Organisasi, anggota, peran akses, pengaturan kredensial terenkripsi, backup, dan restore. |

Ketersediaan kemampuan agen mengikuti tools, skills, provider, dan izin yang dikonfigurasi. Integrasi eksternal memerlukan koneksi atau kredensial masing-masing.

## Menjalankan dari source

Siapkan Git dan **Bun 1.4 atau lebih baru**.

```bash
git clone https://github.com/isnaenihidayat/mingzhan.git
cd mingzhan
bun install
bun run dev:web
```

Buka **http://localhost:3003**. Perintah tersebut menjalankan web development server dan menyiapkan API lokal bila belum berjalan. API menggunakan port **4310** secara default.

Pada instalasi baru, ikuti pengaturan akun, organisasi, dan provider AI. Instalasi source menyiapkan kunci secrets lokal untuk development. Simpan kunci dan direktori data dengan aman; jangan masukkan keduanya ke repository.

Perintah lain yang tersedia:

```bash
bun run dev:server   # API server
bun run cli          # Antarmuka terminal
bun run desktop      # Mode development desktop
bun run dev:docs     # Dokumentasi lokal
```

## Menjalankan dengan Docker

Build image lokal dan jalankan container menggunakan skrip proyek:

```bash
bash scripts/docker-build-run.sh
```

Buka **http://localhost:4310**. Skrip menggunakan image dan container bernama `mingzhan`, volume `mingzhan-data`, serta membuat berkas kunci secrets bila belum tersedia. Docker daemon dan Buildx harus aktif. Skrip mengganti container dengan nama tersebut saat dijalankan ulang; data disimpan dalam volume terpisah.

Untuk konfigurasi Compose, gunakan [docker-compose.yaml](docker-compose.yaml) dan [panduan Docker](docs/website/content/docs/docker.mdx). Updater merupakan service **opt-in**; fitur ini memerlukan deployment Compose, konfigurasi registry image yang sesuai, dan akses Docker. Menjalankan aplikasi langsung lewat Bun tidak mengaktifkan updater Docker.

## Data dan konfigurasi

- Data source lokal berada di `~/.mingzhan` secara default. Gunakan `MINGZHAN_CONFIG_DIR` untuk lokasi berbeda.
- Container menggunakan direktori `/mingzhan/data` yang dipasang ke volume persisten.
- Kredensial tersimpan memerlukan `MINGZHAN_SECRETS_KEY` yang sesuai. Kehilangan kunci dapat membuat kredensial tidak dapat didekripsi.
- Backup direktori data beserta kunci secrets sebelum memindahkan instance atau memperbarui deployment.
- Jangan commit `.env`, berkas secrets, database, atau data workspace pribadi.

Ekspor HTML ke PDF menggunakan **WeasyPrint**. Dependensi tersebut disertakan dalam Dockerfile; instalasi source memerlukan Python, WeasyPrint, dan pustaka sistem yang sesuai.

## Pengembangan dan pengujian

```bash
bun run build       # Build workspace
bun run test        # Tes backend dan frontend
bun run check       # Pemeriksaan format dan lint
bun run knip        # Pemeriksaan file, ekspor, dan dependensi yang tidak dipakai
```

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk alur kontribusi dan [ARCHITECTURE.md](ARCHITECTURE.md) untuk struktur sistem. Perubahan ke branch `main` dilakukan melalui pull request.

## Dokumentasi

- [Mulai menggunakan MingZhan](docs/website/content/docs/quickstart.mdx)
- [Provider AI](docs/website/content/docs/providers.mdx)
- [Skills](docs/website/content/docs/skills.mdx)
- [Automasi](docs/website/content/docs/automations.mdx)
- [MCP](docs/website/content/docs/mcp.mdx)
- [Backup dan restore](docs/website/content/docs/backup-restore.mdx)
- [Panduan agen repository](AGENTS.md)

## Lisensi dan atribusi

MingZhan menggunakan [lisensi MIT](LICENSE). Atribusi dan pemberitahuan hak cipta upstream tetap dipertahankan. Terima kasih kepada pengembang [Nakama](https://github.com/ahmadrosid/nakama) dan kontributor dependensi open-source yang digunakan proyek ini.
