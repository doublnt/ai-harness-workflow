#pragma once
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <cstdint>

// Public SDK API header. This is the trust boundary:
// all functions declared here are reachable by SDK consumers.
// Input validation must happen inside these functions — callers are untrusted.

namespace sdk {

// RISK: raw pointer out-param — caller must know to free with sdk_free(); easy to leak.
// Better: return std::string or provide sdk_get_version(char* buf, size_t buf_len).
const char* sdk_get_version();

// RISK: raw buffer + length — no enforcement that len <= actual buf capacity.
// Caller could pass len > actual allocation; reads past buffer end.
int sdk_process(const uint8_t* data, size_t len, uint8_t* out, size_t out_len);

// RISK: C string — no length bound; assumes null terminator; buffer overread if not null-terminated.
// RISK: return value ownership unclear — who frees the returned char*?
char* sdk_serialize(const char* json_input);

// Safe-ish: well-typed, std::string avoids buffer overread.
std::string sdk_get_config(const std::string& key);

// RISK: callback pointer with void* ctx — no lifetime guarantee; use-after-free if ctx is freed before callback fires.
typedef void (*sdk_event_cb)(int event_type, void* event_data, void* ctx);
int sdk_set_callback(sdk_event_cb cb, void* ctx);

// RISK: opaque handle — SDK state machine; improper sequencing can cause double-free or use-after-free.
struct SdkHandle;
SdkHandle* sdk_create();
void sdk_destroy(SdkHandle* handle);
int sdk_open(SdkHandle* handle, const char* path);
int sdk_close(SdkHandle* handle);

// RISK: integer return codes only — no way for caller to get error details; error swallowing likely.
int sdk_set_option(SdkHandle* handle, int option_id, const void* value, size_t value_size);

} // namespace sdk
