# C++ SDK — Stack Knowledge Pack

## Stack summary

A C++ SDK exposes a public API surface (headers under `include/`) for use by external callers. The SDK native process has full OS trust; callers are untrusted. The public header is the trust boundary: all inputs that cross it must be validated. The SDK also manages its own internal resources (threads, memory, handles) which must follow RAII discipline.

## Trust model

| Layer | Trust level | Notes |
|---|---|---|
| SDK internal code | Trusted | Resource management, business logic |
| Public API callers | Untrusted | May pass malformed pointers, lengths, or paths |
| Callback ctx (void*) | Untrusted lifetime | SDK cannot control when the caller frees ctx |
| OS / kernel | Trusted | System calls validated by OS |

**The SDK must not crash on any caller-supplied input.** It must validate every pointer and length before use and return an error code rather than calling `abort()`.

## Universal failure modes in this stack

### trust-boundary
- **Pointer + length without bounds check**: `sdk_process(data, len, out, out_len)` where `len > out_len` causes heap buffer overflow via `memcpy(out, data, len)`. Always check `len <= out_len` before the copy.
- **Unbounded string functions**: `sprintf`, `strcpy`, `gets`, `scanf` do not check destination size. Replace with `snprintf`, `strncpy`, `fgets`.
- **char* in public API**: C-string APIs assume null termination. A caller who forgets the null terminator triggers a buffer overread inside the SDK. Prefer `(const char* buf, size_t len)` pairs.
- **char* return (ownership ambiguity)**: Returning `char*` creates an invisible ownership contract (static? heap? SDK-owned?). Document explicitly; prefer caller-supplied output buffers.

### resource-lifetime
- **void* ctx callbacks**: The SDK stores a raw pointer to caller memory. If the caller frees `ctx` while a callback registration is live, the SDK invokes a dangling pointer. Provide a deregistration function; document lifetime requirements.
- **Thread outlives captured object**: A `std::thread` that captures a raw pointer (e.g., `[handle]()`) creates a use-after-free if the handle is destroyed while the thread runs.
- **Thread::detach instead of join**: A detached thread cannot be checked for completion. If it captures any resources, those resources must outlive the thread — which is unverifiable after detach.
- **Raw new/delete**: Manual memory management allows double-free, use-after-free, and leaks. Use `std::unique_ptr`/`std::shared_ptr` instead.
- **Opaque handle double-free**: `sdk_destroy()` called twice on the same handle. SDK must null out the caller's pointer or use an intptr_t ID rather than a raw pointer.

### threading-discipline
- **Global mutable state**: Multiple callsites sharing a global `std::mutex` or `std::vector` with implicit lock ordering create deadlock risk. Document and enforce consistent lock ordering.
- **Data race on shared flag**: Reading `handle->is_open` from a worker thread while the main thread writes it (without `std::atomic` or mutex) is undefined behavior.
- **Lock held across re-entrant path**: If `sdk_open` (which acquires `g_mutex`) invokes a callback, and the callback calls `sdk_set_option` (which also acquires `g_mutex`), deadlock occurs.

### error-propagation
- **Integer return codes only**: Returning `-1` on error gives the caller no information about what went wrong. Consider adding `sdk_get_last_error()` or an out-parameter for structured error detail.
- **Ignored return values**: If callers ignore error codes from SDK functions, failures silently propagate. Use `[[nodiscard]]` in C++17 headers to force callers to handle return values.

### api-stability
- **ABI compatibility**: Adding a field to a struct in the public header breaks binary compatibility for callers who compiled against the old header. Use opaque handles or versioned structs.
- **Callback signature changes**: Changing `sdk_event_cb` typedef changes the vtable of every registered callback — silent crash at runtime for callers who didn't recompile.

## Common patterns and their risks

```cpp
// RISK: memcpy without bounds check
int sdk_process(const uint8_t* data, size_t len, uint8_t* out, size_t out_len) {
    memcpy(out, data, len);  // if len > out_len: heap overflow
    return len;
}

// RISK: sprintf overflow
char* sdk_serialize(const char* input) {
    char* buf = malloc(strlen(input) + 32);
    sprintf(buf, "{\"result\":\"%s\"}", input);  // if input is long: overflow
    return buf;  // caller must free; not obvious
}

// RISK: thread detach with captured pointer
handle->worker = std::thread([handle]() {
    while (handle->is_open) { ... }  // data race on is_open; use-after-free if handle freed
});
handle->worker.detach();  // orphan thread
```

## Safe patterns

```cpp
// Safe: bounds check before memcpy
int sdk_process(const uint8_t* data, size_t len, uint8_t* out, size_t out_len) {
    if (!data || !out || len == 0 || len > out_len) return SDK_ERR_INVALID_ARGS;
    memcpy(out, data, len);
    return SDK_OK;
}

// Safe: snprintf with truncation check
int sdk_serialize(const char* input, char* out, size_t out_len) {
    if (!input || !out || out_len == 0) return SDK_ERR_INVALID_ARGS;
    int written = snprintf(out, out_len, "{\"result\":\"%s\"}", input);
    return (written >= 0 && (size_t)written < out_len) ? SDK_OK : SDK_ERR_BUFFER_TOO_SMALL;
}

// Safe: RAII handle + joinable thread
struct SdkHandle {
    std::atomic<bool> is_open{false};
    std::unique_ptr<std::thread> worker;
    ~SdkHandle() {
        is_open.store(false);
        if (worker && worker->joinable()) worker->join();
    }
};
```

## Extractor coverage

The `extractors/cpp-sdk.mjs` extractor detects:
- Public API functions from `.h`/`.hpp` headers: raw pointer params, size params, void* ctx, char* return
- `memcpy`, `strcpy`, `strncpy`, `sprintf`, `gets` calls with enclosing function
- `malloc`, `free`, raw `new`, `delete` with enclosing function
- `std::thread` creation, `.detach()`, `.join()` calls
- `pthread_create` calls
- Global mutable state (`std::mutex`, `std::atomic`, `std::vector`, `std::map`)

Not yet detected (PoC gaps):
- Lock ordering violations (requires call graph)
- `[[nodiscard]]` absence on error-code-returning functions
- `std::atomic` vs non-atomic access to same variable
- ABI incompatibility (struct field additions across versions)
- `memset` on sensitive buffers (security zeroing)
