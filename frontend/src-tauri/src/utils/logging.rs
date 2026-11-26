use super::paths::app_data_dir;
use std::collections::VecDeque;
use std::fs::{self, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use std::sync::Mutex;

// Store backend logs globally
static BACKEND_LOGS: Mutex<VecDeque<String>> = Mutex::new(VecDeque::new());

// Get platform-specific log directory
fn get_log_directory() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home)
        .join("Library")
        .join("Logs")
        .join("Stirling-PDF")
}

// Helper function to add log entry
pub fn add_log(message: String) {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let log_entry = format!("{}: {}", timestamp, message);

    // Add to memory logs
    {
        let mut logs = BACKEND_LOGS
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        logs.push_back(log_entry.clone());
        // Keep only last 100 log entries
        if logs.len() > 100 {
            logs.pop_front();
        }
    }

    // Write to file
    write_to_log_file(&log_entry);

    // Remove trailing newline if present
    let clean_message = message.trim_end_matches('\n').to_string();
    println!("{}", clean_message); // Also print to console
}

// Write log entry to file
fn write_to_log_file(log_entry: &str) {
    let log_dir = get_log_directory();
    if let Err(e) = std::fs::create_dir_all(&log_dir) {
        eprintln!("Failed to create log directory: {}", e);
        return;
    }

    let log_file = log_dir.join("tauri-backend.log");
    let previous_log = log_dir.join("tauri-backend.previous.log");

    if std::fs::metadata(&log_file)
        .map(|metadata| metadata.len() > 5 * 1024 * 1024)
        .unwrap_or(false)
    {
        let _ = std::fs::remove_file(&previous_log);
        if let Err(error) = std::fs::rename(&log_file, &previous_log) {
            eprintln!("Failed to rotate log file: {}", error);
        }
    }

    match OpenOptions::new().create(true).append(true).open(&log_file) {
        Ok(mut file) => {
            if let Err(e) = writeln!(file, "{}", log_entry) {
                eprintln!("Failed to write to log file: {}", e);
            }
        }
        Err(e) => {
            eprintln!("Failed to open log file {:?}: {}", log_file, e);
        }
    }
}

// Get current logs for debugging
pub fn get_logs() -> Vec<String> {
    let logs = BACKEND_LOGS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    logs.iter().cloned().collect()
}

pub fn install_panic_handler(log_dir: PathBuf) {
    std::panic::set_hook(Box::new(move |info| {
        let _ = fs::create_dir_all(&log_dir);
        let path = log_dir.join("promin-crash.log");
        let truncate = fs::metadata(&path)
            .map(|metadata| metadata.len() > 2 * 1024 * 1024)
            .unwrap_or(false);
        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .copied()
            .or_else(|| info.payload().downcast_ref::<String>().map(String::as_str))
            .unwrap_or("non-string panic payload");
        let location = info
            .location()
            .map(|value| format!("{}:{}:{}", value.file(), value.line(), value.column()))
            .unwrap_or_else(|| "unknown location".to_string());

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .write(true)
            .append(!truncate)
            .truncate(truncate)
            .open(path)
        {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|duration| duration.as_secs())
                .unwrap_or_default();
            let _ = writeln!(file, "[{timestamp}] panic at {location}: {payload}");
            let _ = writeln!(file, "{}", std::backtrace::Backtrace::force_capture());
        }
    }));
}

fn append_file_lines(path: PathBuf, label: &str, output: &mut Vec<String>) {
    let Ok(mut file) = OpenOptions::new().read(true).open(path) else {
        return;
    };
    let Ok(length) = file.metadata().map(|metadata| metadata.len()) else {
        return;
    };
    let offset = length.saturating_sub(10 * 1024 * 1024);
    if file.seek(SeekFrom::Start(offset)).is_err() {
        return;
    }
    let mut bytes = Vec::new();
    if Read::take(file, 10 * 1024 * 1024)
        .read_to_end(&mut bytes)
        .is_err()
    {
        return;
    }
    let contents = String::from_utf8_lossy(&bytes);
    output.extend(
        contents
            .lines()
            .rev()
            .take(100)
            .map(|line| format!("[{label}] {line}")),
    );
}

// Command to get logs from frontend
#[tauri::command]
pub async fn get_tauri_logs(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    use tauri::Manager;

    let mut logs = get_logs();
    let app_log_dir = app
        .path()
        .app_log_dir()
        .map_err(|error| error.to_string())?;
    let mut native_logs = fs::read_dir(&app_log_dir)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with("promin-runtime") && name.ends_with(".log"))
        })
        .collect::<Vec<_>>();
    native_logs.push(app_log_dir.join("promin-crash.log"));
    native_logs.push(get_log_directory().join("tauri-backend.log"));
    native_logs.push(get_log_directory().join("tauri-backend.previous.log"));
    native_logs.push(app_data_dir().join("logs").join("stirling-pdf.log"));
    native_logs.sort();

    for path in native_logs {
        let label = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("native")
            .to_string();
        append_file_lines(path, &label, &mut logs);
    }

    Ok(logs.into_iter().take(1500).collect())
}
