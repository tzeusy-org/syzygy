#ifndef SYZYGY_POLICY_GIT_PROTOCOL_H
#define SYZYGY_POLICY_GIT_PROTOCOL_H
#include <stdint.h>
#include <stddef.h>
#include <limits.h>
/* Private, same-build, native-endian pipe protocol. Lengths are checked before
 * conversion/allocation. No policy subject/input limit is added by transport. */
#define POLICY_GIT_MAGIC UINT64_C(0x53595a5047495431)
struct policy_git_request {
  uint64_t magic, version, argc, envc, input_bytes, max_buffer, timeout_ms, ignore_input, deadline_microseconds;
};
struct policy_git_receipt {
  uint64_t magic, version, reason, tree_complete, status, signal_number;
  uint64_t stdout_bytes, stderr_bytes;
};
enum policy_git_reason {
  POLICY_GIT_OK, POLICY_GIT_SPAWN, POLICY_GIT_PIPE, POLICY_GIT_INPUT,
  POLICY_GIT_LIMIT, POLICY_GIT_TIMEOUT, POLICY_GIT_WAIT, POLICY_GIT_SIGNAL,
  POLICY_GIT_EXIT, POLICY_GIT_CANCELLED, POLICY_GIT_PROTOCOL
};
static inline int policy_git_size(uint64_t value, size_t *result) {
  if (value > SIZE_MAX || value > PTRDIFF_MAX) return -1;
  *result = (size_t)value;
  return 0;
}
static inline int policy_git_add(size_t left, size_t right, size_t *result) {
  if (right > SIZE_MAX - left || left + right > PTRDIFF_MAX) return -1;
  *result = left + right;
  return 0;
}
#endif
