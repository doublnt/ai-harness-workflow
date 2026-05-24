# Rust + Tauri — Stack Knowledge Pack

## Stack summary

Tauri builds cross-platform desktop applications with a Rust backend and a WebView frontend (HTML/JS). The Rust process is native; the WebView renderer is sandboxed but treated as untrusted for IPC purposes. Communication crosses the IPC bridge via `#[tauri::command]` functions registered in `generate_handler![]`.

## Trust model

| Layer | Trust level | Notes |
|---|---|---|
| Rust native process | Full OS trust | Can read/write any file, spawn processes |
| WebView renderer (JS) | Untrusted | Same origin as a web page; do not trust its inputs |
| IPC bridge (`invoke`) | Trust boundary | Renderer-supplied args enter Rust here |
| Tauri plugins | Varies | Plugin code runs in native; plugin API surface is additional trust boundary |

The critical invariant: **everything that enters a `#[tauri::command]` fn from the renderer must be treated as untrusted input**.

## Universal failure modes in this stack

### trust-boundary
Every `#[tauri::command]` registered in `generate_handler![]` is reachable from any JS in the WebView. String arguments are renderer-controlled. Key risks:
- **Path traversal**: A `path: String` param passed to `fs::read_to_string` can be `../../etc/passwd`. Always canonicalize and assert the path is under an allowed root.
- **Command injection**: A `cmd: String` param passed to `Command::new("sh").arg("-c").arg(&cmd)` gives the renderer a shell. Never pass renderer strings to a shell.
- **Pointer smuggling**: `ptr: usize, len: usize` params in an unsafe block let the renderer read arbitrary native memory.

### resource-lifetime
- **tokio::spawn from command**: Spawns a background task that may outlive the window. If it captures an `AppHandle` or window reference, it operates on a dead handle after window close.
- **async long-poll**: An `async fn` command that runs a synchronous CPU loop inside blocks the executor thread and cannot be cancelled by window close.

### threading-discipline
- **Blocking async**: Calling synchronous blocking IO (e.g., `std::fs::read_to_string`, `std::net::TcpStream`) directly in an `async fn` without `spawn_blocking` starves the Tokio runtime.
- **State sharing**: `tauri::State<Mutex<T>>` is the standard; prefer `RwLock` for read-heavy state. Deadlock risk if a lock is held across an `.await`.

### external-interaction
- **HTTP from commands**: Unbounded `reqwest` calls without timeout/retry in a command cause the frontend to hang indefinitely if the server is slow.
- **Process spawning**: Subprocess output can be arbitrarily large; always bound the output or stream it.

### api-stability
- **Unregistered commands**: A `#[tauri::command]` fn not listed in `generate_handler![]` is unreachable via the normal IPC bridge but can mislead reviewers. If genuinely dead, remove the attribute.
- **generate_handler! drift**: After renaming a command fn, the old name in `generate_handler![]` causes a compile error. Catch with CI.

### error-propagation
- **Result<T, String>**: Tauri serializes `Err(String)` and sends it to the renderer. Avoid leaking internal paths or system details in error messages. Use opaque error codes for user-facing errors.
- **Panic in command**: An `unwrap()` on a `None` or `Err` in a command panics the entire process. Use `?` with proper `From` impls.

## Common patterns and their risks

```rust
// RISK: path traversal — path is renderer-controlled
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

// RISK: command injection — cmd is renderer-controlled
#[tauri::command]
pub async fn run_shell(cmd: String) -> Result<String, String> {
    Command::new("sh").arg("-c").arg(&cmd).output()...
}

// RISK: unsafe with renderer-controlled ptr+len
#[tauri::command]
pub fn read_raw(ptr: usize, len: usize) -> Vec<u8> {
    unsafe { std::slice::from_raw_parts(ptr as *const u8, len).to_vec() }
}
```

## Safe patterns

```rust
// Safe: canonicalize + allowlist root
#[tauri::command]
pub fn read_file(path: String, app: AppHandle) -> Result<String, String> {
    let allowed = app.path_resolver().app_data_dir().ok_or("no data dir")?;
    let resolved = std::fs::canonicalize(&path).map_err(|e| e.to_string())?;
    if !resolved.starts_with(&allowed) {
        return Err("path outside allowed root".into());
    }
    std::fs::read_to_string(resolved).map_err(|e| e.to_string())
}

// Safe: allowlist-based subprocess, no shell
#[tauri::command]
pub async fn run_tool(tool: AllowedTool) -> Result<String, String> {
    // AllowedTool is an enum, not a free String
    let bin = tool.binary_path();
    let out = Command::new(bin).output().map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}
```

## Extractor coverage

The `extractors/rust-tauri.mjs` extractor detects:
- All `#[tauri::command]` and `#[command]` functions (name, line, isAsync, params)
- `tauri::generate_handler![]` registrations
- `unsafe { }` blocks with enclosing command name
- `std::fs::*`, `fs::*` calls inside commands
- `std::process::Command::new`, `Command::new` calls inside commands
- `reqwest::*`, `TcpStream::connect` calls inside commands
- `tokio::spawn` calls inside commands
- Cross-file: unregistered commands, registered-but-missing

Not yet detected (PoC gaps):
- Path traversal checks (canonicalize / starts_with)
- Timeout/retry presence on reqwest calls
- Mutex-across-await deadlock patterns
- Serde deserialization of untrusted input (custom Deserialize impls)
