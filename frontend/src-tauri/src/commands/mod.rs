pub mod backend;
pub mod files;
pub mod file_drop;
pub mod default_app;
pub mod local_proxy;
pub mod print;
pub mod watcher;
pub mod window;

pub use backend::{cleanup_backend, get_backend_port, start_backend};
pub use files::{
    add_opened_file, clear_opened_files, file_disk_state, get_opened_files, pop_opened_files,
};
pub use watcher::{release_window_watches, unwatch_disk_paths, watch_disk_paths};
pub use window::{
    build_main_window,
    forward_files_to_window,
    open_files_in_new_window,
    open_in_new_window,
    pop_window_file_ids,
    target_window_label,
    MAIN_WINDOW_LABEL,
};
pub use default_app::{is_default_pdf_handler, set_as_default_pdf_handler};
pub use local_proxy::proxy_local_pdf_request;
pub use print::print_pdf_file_native;
