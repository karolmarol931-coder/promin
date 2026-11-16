# Promin macOS app

The frontend is a Tauri view embedded in the native macOS application. The entry point does not mount the editor in a browser. The app connects only to its bundled backend on loopback.

## Development

Run the native application with the local backend:

```bash
task desktop:dev
```

Build the `.app` and `.dmg` packages:

```bash
task desktop:build
```

Run frontend checks:

```bash
task frontend:check
```

Run native shell tests:

```bash
cd frontend/src-tauri && cargo test --lib
```

`frontend/.env` contains public local-app defaults. Machine-specific overrides belong in the uncommitted `.env.local` and `.env.desktop.local` files.
