use tauri::Manager;

mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::greet,
            // RISK: commands::run_shell exists but is not registered here.
            // commands::exfiltrate exists but is not registered.
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
