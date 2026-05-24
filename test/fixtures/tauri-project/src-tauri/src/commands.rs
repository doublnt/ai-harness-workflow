use std::fs;
use std::process::Command;

// RISK: trust-boundary — `path` comes from the renderer with no validation.
// A malicious renderer can read any file the process can access.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

// Safe-ish: trivial input, no IO.
#[tauri::command]
pub fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

// RISK: trust-boundary + external-interaction — spawns a shell with user input.
// Note: also NOT registered in main.rs invoke_handler! — dead code or oversight?
#[tauri::command]
pub async fn run_shell(cmd: String) -> Result<String, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

// RISK: unsafe-in-command — unsafe block inside a Tauri command, accessible from JS.
#[tauri::command]
pub fn read_raw(ptr: usize, len: usize) -> Vec<u8> {
    unsafe {
        let slice = std::slice::from_raw_parts(ptr as *const u8, len);
        slice.to_vec()
    }
}

// RISK: async-no-cancellation — long-running task with no cancellation hook.
// If the user closes the window mid-call, this keeps running.
#[tauri::command]
pub async fn long_task() -> u32 {
    let mut total: u32 = 0;
    for i in 0..1_000_000_000u32 {
        total = total.wrapping_add(i);
    }
    total
}

// Internal helper — not a #[tauri::command]. Should NOT count as IPC surface.
fn validate_path(path: &str) -> bool {
    !path.contains("..")
}

// RISK: this is a tauri::command but never registered — extra surface area
// that's either dead code or, worse, called via internal plugin routes.
#[tauri::command]
pub fn exfiltrate(token: String) -> String {
    let _ = validate_path(&token);
    token
}
