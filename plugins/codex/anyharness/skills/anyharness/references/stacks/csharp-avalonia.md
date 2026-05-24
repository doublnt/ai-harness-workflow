# C# + Avalonia — Stack Knowledge Pack

## Stack summary

Avalonia is a cross-platform MVVM desktop UI framework for .NET. ViewModels expose `ObservableProperty` fields and `RelayCommand`s; Views bind to them via XAML. The Avalonia threading model requires all UI (binding) updates to occur on the UI thread. Code-behind is discouraged; async/await is idiomatic.

## Threading model

| Thread | Role | Access to UI? |
|---|---|---|
| UI thread (main) | Renders, dispatches events, updates bindings | Yes |
| Task.Run / thread pool | Background work | No — must post back via Dispatcher.UIThread |
| async continuation | Runs on whatever thread awaited | Depends on SynchronizationContext |

`ObservableCollection<T>` change notifications are consumed by the XAML binding engine on the UI thread. Mutations from any other thread are a threading violation and will crash or silently corrupt state.

## Universal failure modes in this stack

### error-propagation
- **async void**: An `async void` method cannot be awaited. Exceptions propagate to the `SynchronizationContext` and crash the app. The only acceptable use is for event handlers, and even then the body must wrap in try/catch.
- **Fire-and-forget without error handling**: `_ = SomeAsync()` silently discards exceptions. Use a helper that logs or re-throws.

### threading-discipline
- **ObservableCollection cross-thread mutation**: `Collection.Add/Clear/Remove` from `Task.Run` or a background thread causes `InvalidOperationException` or silent corruption. Fix: `await Dispatcher.UIThread.InvokeAsync(() => ...)`.
- **Thread.Sleep in ViewModel**: Blocks the thread. If the call originates from the UI thread (e.g., a synchronous command handler), it freezes the window. Use `await Task.Delay(ms, ct)` instead.
- **Blocking async**: `result = someTask.Result` or `.GetAwaiter().GetResult()` on the UI thread deadlocks if the task needs the UI thread to complete. Use `await` throughout.

### resource-lifetime
- **HttpClient per-call**: `new HttpClient()` inside a method allocates a socket per call. Under load, sockets accumulate in TIME_WAIT and the process exhausts ephemeral ports. Use `IHttpClientFactory` or a single long-lived instance.
- **IDisposable fields without IDisposable class**: A class that holds `HttpClient`, `CancellationTokenSource`, `FileStream`, etc. must implement `IDisposable` and call `.Dispose()` on cleanup. ViewModels should hook into window `Closed` or navigation deactivation.
- **CancellationTokenSource not cancelled/disposed**: A `CancellationTokenSource` created in a field and never cancelled before the owner is GC'd leaks the kernel timer handle.

### trust-boundary
- **Process.Start with UseShellExecute=true**: The OS chooses a handler based on file association. If the `FileName` comes from a UI binding (user input or a list populated from the filesystem), the user can open an arbitrary executable.
- **Process.Start with user-supplied arguments**: Even without `UseShellExecute`, renderer/user-supplied arguments can inject shell metacharacters if the target binary interprets them.
- **P/Invoke (DllImport/LibraryImport)**: Native functions bypass CLR memory safety. Incorrect marshaling (wrong `CharSet`, missing null check, wrong buffer size), unchecked return values, or pointer arithmetic errors cause buffer overreads, stack corruption, or silent data loss.
- **unsafe blocks**: The `unsafe` keyword disables CLR bounds checking. Pointer arithmetic errors produce the same class of bugs as C/C++.

### external-interaction
- **HttpClient without Timeout**: The default `HttpClient` has no timeout. A slow or hung server causes the call to block indefinitely, hanging the UI if not wrapped in `Task.Run`.
- **No retry / circuit breaker**: Transient failures in external calls should be handled with Polly or similar. A single failing call causing the UI to show an error every time is an availability risk.

## Common patterns and their risks

```csharp
// RISK: async void — exceptions are unobserved
public async void OnButtonClick(object? sender, EventArgs e) {
    await DoWorkAsync(); // exception here crashes the app
}

// RISK: ObservableCollection mutated from Task.Run
await Task.Run(() => {
    Items.Clear();  // InvalidOperationException or silent corruption
    foreach (var i in data) Items.Add(i);
});

// RISK: new HttpClient() per call — socket exhaustion
public async Task Upload() {
    using var client = new HttpClient();  // BAD
    await client.PostAsync(url, content);
}

// RISK: Process.Start with UseShellExecute + unvalidated path
Process.Start(new ProcessStartInfo {
    FileName = userSuppliedPath,
    UseShellExecute = true,  // OS picks handler; .bat, .exe, .ps1 all run
});
```

## Safe patterns

```csharp
// Safe: async Task with internal try/catch for event-handler-like situations
public async Task LoadAsync() {
    try { await DoWorkAsync(); }
    catch (Exception ex) { StatusText = $"Error: {ex.Message}"; }
}

// Safe: collect on background, update on UI thread
var results = await Task.Run(() => Directory.GetFiles(path).ToList());
await Dispatcher.UIThread.InvokeAsync(() => {
    Items.Clear();
    foreach (var r in results) Items.Add(r);
});

// Safe: injected HttpClient (singleton lifetime)
public class MyViewModel(HttpClient httpClient) : ObservableObject {
    [RelayCommand]
    public async Task UploadAsync() {
        await httpClient.PostAsync(url, content);
    }
}

// Safe: Process.Start with allowlist
static readonly HashSet<string> AllowedExtensions = [".pdf", ".txt"];
public void OpenFile(string path) {
    var ext = Path.GetExtension(path).ToLower();
    if (!AllowedExtensions.Contains(ext)) throw new ArgumentException("Not allowed");
    Process.Start(new ProcessStartInfo { FileName = path, UseShellExecute = false });
}
```

## Extractor coverage

The `extractors/csharp-avalonia.mjs` extractor detects:
- `async void` methods (with event-handler heuristic: `object? sender, EventArgs`)
- `ObservableCollection` mutations (`.Add`, `.Clear`, `.Remove`) inside `Task.Run` lambdas
- `Process.Start` calls with `UseShellExecute=true` nearby
- `[DllImport]` / `[LibraryImport]` declarations (library name, method name)
- `unsafe` blocks with enclosing method name
- `new HttpClient()` inside methods (per-call creation) vs field-level
- `HttpClient` field in a class that does not implement `IDisposable`
- `CancellationTokenSource`, `FileStream`, etc. fields without `IDisposable` on class
- `Thread.Sleep` calls

Not yet detected (PoC gaps):
- Missing `CancellationToken` argument propagation into `Task.Delay` / `HttpClient` calls
- Timeout configuration on `HttpClient` (`.Timeout = ...`)
- `.Result` / `.GetAwaiter().GetResult()` deadlock patterns on the UI thread
- Polly / retry policy presence
- `ConfigureAwait(false)` consistency
