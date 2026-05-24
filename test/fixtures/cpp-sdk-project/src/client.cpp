#include "sdk/client.h"
#include <cstring>
#include <cstdlib>
#include <mutex>
#include <thread>
#include <vector>
#include <cassert>

namespace sdk {

// RISK: global mutable state protected by a non-recursive mutex.
// sdk_set_option acquires the same mutex — deadlock if called from sdk_open.
static std::mutex g_mutex;
static std::vector<SdkHandle*> g_handles;

// RISK: returns pointer to static string — not thread-safe if called concurrently.
const char* sdk_get_version() {
    static char version[] = "1.0.0";
    return version;  // safe only if read-only; would be RISK if written
}

// RISK: no bounds check on `len` vs. internal buffer size.
// RISK: memcpy with user-supplied len — classic buffer overflow if len > out_len.
int sdk_process(const uint8_t* data, size_t len, uint8_t* out, size_t out_len) {
    if (!data || !out) return -1;
    // RISK: no check that len <= out_len before memcpy.
    memcpy(out, data, len);  // RISK: len may exceed out_len — heap buffer overflow.
    return static_cast<int>(len);
}

// RISK: malloc + sprintf without bounds check — classic buffer overflow.
// RISK: returns heap-allocated char*; caller must free(); ownership not obvious.
char* sdk_serialize(const char* json_input) {
    if (!json_input) return nullptr;
    size_t input_len = strlen(json_input);
    // RISK: buffer sized to input_len + 32 but sprintf below may write more.
    char* buf = static_cast<char*>(malloc(input_len + 32));
    if (!buf) return nullptr;
    // RISK: sprintf does not respect buffer size — potential overflow.
    sprintf(buf, "{\"result\":\"%s\"}", json_input);
    return buf;
}

std::string sdk_get_config(const std::string& key) {
    // Safe: std::string; no buffer overread possible.
    return key.empty() ? "" : "default_value";
}

// RISK: callback pointer stored globally with void* ctx — no lifetime enforcement.
// If ctx is a stack variable or freed object, callback invocation = use-after-free.
static sdk_event_cb g_callback = nullptr;
static void* g_ctx = nullptr;

int sdk_set_callback(sdk_event_cb cb, void* ctx) {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_callback = cb;
    g_ctx = ctx;
    return 0;
}

struct SdkHandle {
    bool is_open = false;
    std::string path;
    std::thread worker;  // RISK: thread not joined before handle destruction — thread outlives handle.
};

SdkHandle* sdk_create() {
    std::lock_guard<std::mutex> lock(g_mutex);
    auto* h = new SdkHandle();
    g_handles.push_back(h);
    return h;
}

// RISK: double-free if sdk_destroy called twice on same handle.
// RISK: use-after-free if caller uses handle after sdk_destroy.
void sdk_destroy(SdkHandle* handle) {
    if (!handle) return;
    std::lock_guard<std::mutex> lock(g_mutex);
    // RISK: thread not joined — worker may be running and accessing handle memory.
    if (handle->worker.joinable()) {
        handle->worker.detach();  // RISK: detach instead of join — thread becomes orphan.
    }
    // RISK: no removal from g_handles — dangling pointer left in global vector.
    delete handle;  // RISK: g_handles still holds this pointer after delete.
}

int sdk_open(SdkHandle* handle, const char* path) {
    if (!handle || !path) return -1;
    // RISK: g_mutex already held by sdk_create in a different call path;
    // if sdk_open is called while g_mutex is held (e.g. from sdk_set_option callback), deadlock.
    std::lock_guard<std::mutex> lock(g_mutex);
    handle->path = path;
    handle->is_open = true;

    // RISK: lambda captures `handle` raw pointer — if handle is destroyed while thread runs, use-after-free.
    handle->worker = std::thread([handle]() {
        while (handle->is_open) {
            // RISK: reading handle->is_open without synchronization — data race.
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
            if (g_callback) {
                // RISK: g_callback + g_ctx may be concurrently cleared by sdk_set_callback — data race.
                g_callback(1, nullptr, g_ctx);
            }
        }
    });
    return 0;
}

int sdk_close(SdkHandle* handle) {
    if (!handle) return -1;
    handle->is_open = false;  // RISK: unsynchronized write — data race with worker thread.
    return 0;
}

int sdk_set_option(SdkHandle* handle, int option_id, const void* value, size_t value_size) {
    if (!handle || !value) return -1;
    // RISK: uses memcpy with caller-supplied value_size and void* — no type safety.
    // RISK: no bounds check — value_size could exceed internal option storage.
    (void)option_id; (void)value_size;
    return 0;
}

} // namespace sdk
