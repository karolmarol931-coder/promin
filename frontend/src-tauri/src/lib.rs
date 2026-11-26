use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_window_state::StateFlags;

mod utils;
pub mod commands;

use commands::{
    add_opened_file,
    cleanup_backend,
    clear_opened_files,
    file_disk_state,
    forward_files_to_window,
    is_default_pdf_handler,
    get_backend_port,
    get_opened_files,
    open_files_in_new_window,
    open_in_new_window,
    pop_opened_files,
    pop_window_file_ids,
    release_window_watches,
    unwatch_disk_paths,
    watch_disk_paths,
    proxy_local_pdf_request,
    set_as_default_pdf_handler,
    print_pdf_file_native,
    start_backend,
    target_window_label,
    build_main_window,
    MAIN_WINDOW_LABEL,
};
use utils::{add_log, get_tauri_logs, install_panic_handler};

// Extract existing file paths from CLI args (skips the executable name).
fn parse_launch_files(args: &[String]) -> Vec<String> {
  args
    .iter()
    .skip(1)
    .filter(|arg| std::path::Path::new(arg).exists())
    .cloned()
    .collect()
}

// The webview may show the bundled app and its local development server.
fn is_app_url(url: &tauri::Url) -> bool {
  match url.scheme() {
    "tauri" | "about" | "blob" | "data" => true,
    "http" if url.host_str() == Some("tauri.localhost") => true,
    "http" if cfg!(debug_assertions) => {
      matches!(url.host_str(), Some("localhost") | Some("127.0.0.1"))
    }
    _ => false,
  }
}

pub fn run() {
  tauri::Builder::default()
    .plugin(
      // Dropping a file outside a dropzone makes WebKit navigate the webview to
      // that file, killing the app UI and its close handler (window becomes
      // unclosable). Block every off-app navigation at the Rust layer.
      tauri::plugin::Builder::<tauri::Wry, ()>::new("navigation-guard")
        .on_navigation(|_webview, url| {
          let allowed = is_app_url(url);
          if !allowed {
            add_log(format!("🚫 Blocked webview navigation to: {}", url));
          }
          allowed
        })
        .build()
    )
    .plugin(
      tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .max_file_size(10 * 1024 * 1024)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(4))
        .targets([
          tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
          tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
            file_name: Some("promin-runtime".to_string()),
          }),
        ])
        .build()
    )
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(
      tauri_plugin_window_state::Builder::default()
        .with_state_flags(StateFlags::all() & !StateFlags::DECORATIONS)
        .build()
    )
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
      // Runs in the existing instance when a second launch is attempted
      // (e.g. "open with" / double-click while the app is running).
      add_log(format!("📂 Second instance detected with args: {:?}", args));

      let files = parse_launch_files(&args);
      // Route to the window the user is in (focused -> main -> any) so opens
      // consolidate into one window instead of spawning a new one.
      let label = target_window_label(app).unwrap_or_else(|| MAIN_WINDOW_LABEL.to_string());

      if !files.is_empty() {
        add_log(format!("📂 Forwarding {} file(s) to existing window '{}'", files.len(), label));
        forward_files_to_window(app, &label, files);
      } else if let Some(window) = app.get_webview_window(&label) {
        // No files: just bring the app to the front.
        let _ = window.set_focus();
        let _ = window.unminimize();
      }
    }))
    .setup(|app| {
      match app.path().app_log_dir() {
        Ok(log_dir) => install_panic_handler(log_dir),
        Err(err) => add_log(format!("⚠️ Could not install panic log: {err}")),
      }
      add_log("🚀 Tauri app setup started".to_string());

      // The main window is built here, not in tauri.conf.json, so its chrome
      // (decorations, macOS overlay title bar, traffic-light inset) lives with
      // the spawned-window chrome in window.rs.
      if let Err(err) = build_main_window(app.handle()) {
        add_log(format!("❌ Failed to build main window: {}", err));
        // No fallback window exists, so abort startup rather than run headless.
        return Err(err.into());
      }

      // Files passed on the command line at first launch load into the main
      // window once the frontend mounts.
      let args: Vec<String> = std::env::args().collect();
      for path in parse_launch_files(&args) {
        add_log(format!("📂 Initial file from command line: {}", path));
        add_opened_file(path);
      }

      // Start backend immediately, non-blocking
      let app_handle = app.handle().clone();

      tauri::async_runtime::spawn(async move {
        add_log("🚀 Starting bundled backend in background".to_string());
        if let Err(e) = commands::backend::start_backend(app_handle.clone()).await {
          add_log(format!("⚠️ Backend start failed: {}", e));
        }
      });

      add_log("🔍 DEBUG: Setup completed".to_string());
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      start_backend,
      get_backend_port,
      get_opened_files,
      commands::file_drop::resolve_dropped_file_paths,
      commands::file_drop::install_drag_capture,
      pop_opened_files,
      clear_opened_files,
      file_disk_state,
      commands::files::publish_processing_file,
      watch_disk_paths,
      unwatch_disk_paths,
      open_in_new_window,
      open_files_in_new_window,
      pop_window_file_ids,
      get_tauri_logs,
      is_default_pdf_handler,
      set_as_default_pdf_handler,
      proxy_local_pdf_request,
      print_pdf_file_native,
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      match event {
        RunEvent::ExitRequested { .. } => {
          add_log("🔄 App exit requested, cleaning up...".to_string());
          cleanup_backend();
          // Use Tauri's built-in cleanup
          app_handle.cleanup_before_exit();
        }
        RunEvent::WindowEvent { event: WindowEvent::CloseRequested {.. }, label, .. } => {
          add_log("🔄 Window close requested (will cleanup on actual exit)...".to_string());
          // Don't cleanup here - let JavaScript handler prevent close if needed
          // Backend cleanup happens in ExitRequested when window actually closes
          //
          // Failsafe: if the webview somehow left the app (JS close handler gone,
          // window would stay open forever), destroy the window directly.
          if let Some(window) = app_handle.get_webview_window(&label) {
            let off_app = window.url().map(|u| !is_app_url(&u)).unwrap_or(false);
            if off_app {
              add_log(format!("🚨 Webview '{}' is off-app, destroying window directly", label));
              let _ = window.destroy();
            }
          }
        }
        RunEvent::WindowEvent { event: WindowEvent::Destroyed, label, .. } => {
          release_window_watches(app_handle, &label);
        }
        RunEvent::WindowEvent { event: WindowEvent::DragDrop(drag_drop_event), label, .. } => {
          use tauri::DragDropEvent;
          if let DragDropEvent::Drop { paths, .. } = drag_drop_event {
            add_log(format!("📂 Files dropped on window '{}': {:?}", label, paths));
            let file_paths: Vec<String> = paths
              .iter()
              .filter_map(|p| p.to_str().map(|s| s.to_string()))
              .collect();

            // Route to the window the file was actually dropped on.
            if !file_paths.is_empty() {
              forward_files_to_window(app_handle, &label, file_paths);
            }
          }
        }
        RunEvent::Opened { urls } => {
          use urlencoding::decode;

          add_log(format!("📂 Tauri file opened event: {:?}", urls));
          let file_paths: Vec<String> = urls
            .iter()
            .filter_map(|url| {
              let url_str = url.as_str();
              if !url_str.starts_with("file://") {
                return None;
              }
              let encoded = url_str.strip_prefix("file://").unwrap_or(url_str);
              // Decode URL-encoded characters (%20 -> space, etc.)
              match decode(encoded) {
                Ok(decoded) => Some(decoded.into_owned()),
                Err(e) => {
                  add_log(format!("⚠️ Failed to decode file path: {} - {}", encoded, e));
                  Some(encoded.to_string())
                }
              }
            })
            .collect();

          if !file_paths.is_empty() {
            // Route to the window the user is in (focused -> main -> any).
            let label = target_window_label(app_handle).unwrap_or_else(|| MAIN_WINDOW_LABEL.to_string());
            forward_files_to_window(app_handle, &label, file_paths);
          }
        }
        _ => {
          // Only log unhandled events in debug mode to reduce noise
        }
      }
    });
}

#[cfg(test)]
mod tests {
  use super::is_app_url;

  fn allows(raw: &str) -> bool {
    is_app_url(&tauri::Url::parse(raw).expect("valid url"))
  }

  #[test]
  fn allows_bundled_app_and_dev_server() {
    assert!(allows("tauri://localhost/index.html"));
    assert!(allows("http://tauri.localhost/"));
    assert!(allows("http://localhost:5173/"));
    assert!(allows("http://127.0.0.1:8080/api"));
    assert!(allows("about:blank"));
    assert!(allows("blob:http://localhost:5173/abc"));
    assert!(allows("data:text/html,hi"));
  }

  #[test]
  fn blocks_dropped_files() {
    // The #6872 lockup: webview navigating to a dropped PDF.
    assert!(!allows("file:///C:/Users/me/report.pdf"));
    assert!(!allows("file:///home/me/report.pdf"));
  }

  #[test]
  fn blocks_remote_origins() {
    assert!(!allows("https://example.com/"));
    assert!(!allows("https://localhost/"));
    assert!(!allows("http://evil.test/"));
    // Look-alike hosts must not slip past the allowlist.
    assert!(!allows("https://localhost.evil.test/"));
    assert!(!allows("https://nottauri.localhost.evil.test/"));
  }
}
