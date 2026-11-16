# Promin

Promin is a native macOS application for working with PDF files. PDF processing runs through the backend bundled with the app on the same Mac.

Promin does not provide a browser version, online account, cloud sync, or subscription billing.

## Development

Requirements: macOS, Node.js, Rust, and JDK 25.

Start the native app in development mode:

```bash
task desktop:dev
```

Build the macOS application and disk image:

```bash
task desktop:build
```

Run frontend checks and native Rust tests:

```bash
task frontend:check
cd frontend/src-tauri && cargo test --lib
```

The Java backend is built and bundled as part of the desktop build. Its tests can be run with:

```bash
task backend:test
```

## License

See [LICENSE](LICENSE).
