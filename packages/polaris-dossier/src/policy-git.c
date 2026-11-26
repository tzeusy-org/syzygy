#define _GNU_SOURCE
#include <node_api.h>
#include "policy-git-protocol.h"
#include <errno.h>
#include <fcntl.h>
#include <math.h>
#include <poll.h>
#include <pthread.h>
#include <signal.h>
#include <spawn.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

/* Host threads only spawn the small verified supervisor. Its final wait4
 * includes its epilogue and recursively waited descendants. Host/thread CPU
 * remains in process.cpuUsage; no child usage is manually summed twice. */
struct job {
  napi_env env; napi_async_work work; napi_deferred deferred;
  unsigned char *request, *output; size_t request_size, output_size, allocated, cap;
  int supervisor, git, timeout, waited, helper_status, failed, no_child_known;
  pthread_mutex_t mutex; pthread_cond_t changed; bool mutex_ready, condition_ready, done; unsigned references;
  double deadline;
  struct policy_git_receipt receipt; size_t receipt_size;
  struct rusage usage;
};
static double milliseconds(void) { struct timespec sample; if (clock_gettime(CLOCK_MONOTONIC, &sample)) return -1; return sample.tv_sec * 1000.0 + sample.tv_nsec / 1000000.0; }
static void shut(int *fd) { if (*fd >= 0) { close(*fd); *fd = -1; } }
static int nonblock(int fd) { int flags = fcntl(fd, F_GETFL); return flags < 0 ? -1 : fcntl(fd, F_SETFL, flags | O_NONBLOCK); }
static void destroy(struct job *job) { if (!job) return; shut(&job->supervisor); shut(&job->git); free(job->request); free(job->output); if (job->condition_ready) pthread_cond_destroy(&job->changed); if (job->mutex_ready) pthread_mutex_destroy(&job->mutex); free(job); }
static bool property(napi_env env, napi_value object, const char *name, napi_value *value) {
  return napi_get_named_property(env, object, name, value) == napi_ok;
}
static int descriptor(napi_env env, napi_value object, const char *name) {
  napi_value value; int32_t fd; struct stat stats;
  if (!property(env, object, name, &value) || napi_get_value_int32(env, value, &fd) != napi_ok
    || fd < 3 || fstat(fd, &stats) || !S_ISREG(stats.st_mode) || (stats.st_mode & 0022)) return -1;
  return fcntl(fd, F_DUPFD_CLOEXEC, 256);
}
static struct job *decode(napi_env env, napi_callback_info info) {
  size_t argc = 1; napi_value object, bytes; void *data; size_t size;
  if (napi_get_cb_info(env, info, &argc, &object, NULL, NULL) != napi_ok || argc != 1
    || !property(env, object, "request", &bytes) || napi_get_buffer_info(env, bytes, &data, &size) != napi_ok
    || size < sizeof(struct policy_git_request)) return NULL;
  struct job *job = calloc(1, sizeof(*job)); if (!job) return NULL;
  job->env = env; job->supervisor = -1; job->git = -1;
  if (pthread_mutex_init(&job->mutex, NULL)) goto bad;
  job->mutex_ready = true;
  if (pthread_cond_init(&job->changed, NULL)) goto bad;
  job->condition_ready = true;
  struct policy_git_request header; memcpy(&header, data, sizeof(header));
  if (header.magic != POLICY_GIT_MAGIC || header.version != 1 || header.timeout_ms < 1 || header.timeout_ms > 10000
    || header.deadline_microseconds != 0 || policy_git_size(header.max_buffer, &job->cap) || size > PTRDIFF_MAX) goto bad;
  job->timeout = (int)header.timeout_ms;
  double admitted = milliseconds(); if (admitted < 0) goto bad;
  job->deadline = admitted + job->timeout;
  if (job->deadline * 1000 >= (double)UINT64_MAX) goto bad;
  header.deadline_microseconds = (uint64_t)(job->deadline * 1000);
  job->request = malloc(size); if (!job->request) goto bad;
  /* All JS-owned bytes and descriptors are copied before async work is queued. */
  memcpy(job->request, data, size); memcpy(job->request, &header, sizeof(header)); job->request_size = size;
  job->supervisor = descriptor(env, object, "supervisorFd"); job->git = descriptor(env, object, "gitFd");
  if (job->supervisor < 0 || job->git < 0) goto bad;
  return job;
bad: destroy(job); return NULL;
}
static int output(struct job *job, int *fd) {
  unsigned char bytes[16384];
  /* Return to deadline/control sampling even when a writer keeps this pipe
   * continuously readable. This is a per-turn scheduling bound, not a cap. */
  for (unsigned reads = 0; reads < 4; reads++) {
    ssize_t count = read(*fd, bytes, sizeof(bytes));
    if (count > 0) {
      size_t next;
      if (policy_git_add(job->output_size, (size_t)count, &next) || next > job->cap) return -1;
      if (next > job->allocated) {
        size_t grown = job->allocated ? job->allocated : 16384;
        while (grown < next) { if (grown > PTRDIFF_MAX / 2) { grown = next; break; } grown *= 2; }
        if (grown > job->cap) grown = job->cap;
        void *replacement = realloc(job->output, grown); if (!replacement) return -1;
        job->output = replacement; job->allocated = grown;
      }
      memcpy(job->output + job->output_size, bytes, (size_t)count); job->output_size = next;
    } else if (!count) { shut(fd); return 0; }
    else if (errno == EAGAIN || errno == EWOULDBLOCK) return 0;
    else if (errno != EINTR) return -1;
  }
  return 0;
}
static int receipt(struct job *job, int *fd) {
  unsigned char bytes[sizeof(job->receipt) + 1];
  for (;;) {
    ssize_t count = read(*fd, bytes, sizeof(bytes));
    if (count > 0) {
      if ((size_t)count > sizeof(job->receipt) - job->receipt_size) return -1;
      memcpy((char *)&job->receipt + job->receipt_size, bytes, (size_t)count); job->receipt_size += (size_t)count;
    } else if (!count) { shut(fd); return 0; }
    else if (errno == EAGAIN || errno == EWOULDBLOCK) return 0;
    else if (errno != EINTR) return -1;
  }
}
static void expired_without_child(struct job *job) {
  job->no_child_known = 1;
  job->receipt = (struct policy_git_receipt){.magic = POLICY_GIT_MAGIC, .version = 1,
    .reason = POLICY_GIT_TIMEOUT, .tree_complete = 1, .status = UINT64_MAX};
}
static void pump(struct job *job) {
  int request[2] = {-1,-1}, response[2] = {-1,-1}, final[2] = {-1,-1}, control[2] = {-1,-1}, nullfd = -1, exitfd = -1;
  pid_t child = -1; bool actions_ready = false, attributes_ready = false;
  posix_spawn_file_actions_t actions; posix_spawnattr_t attributes;
  sigset_t blocked, previous, pending, defaults, empty;
  sigemptyset(&blocked); sigaddset(&blocked, SIGPIPE);
  bool masked = pthread_sigmask(SIG_BLOCK, &blocked, &previous) == 0;
  bool pipe_pending = sigpending(&pending) == 0 && sigismember(&pending, SIGPIPE);
  double began = milliseconds(); size_t sent = 0;
  if (!masked || began < 0) { job->failed = 1; goto done; }
  if (began >= job->deadline) {
    /* Expiry while queued never spawns. This is proven no-child usage, not
     * an assumed zero for an unobserved child. */
    expired_without_child(job);
    goto done;
  }
  if (pipe2(request, O_CLOEXEC) || pipe2(response, O_CLOEXEC) || pipe2(final, O_CLOEXEC) || pipe2(control, O_CLOEXEC)
    || (nullfd = open("/dev/null", O_WRONLY | O_CLOEXEC)) < 0) { job->failed = 1; goto done; }
  if (posix_spawn_file_actions_init(&actions)) { job->failed = 1; goto done; } actions_ready = true;
#define ACTION(expression) do { if ((expression) != 0) { job->failed = 1; goto done; } } while (0)
  /* Sources are all >=3. Preserve their original descriptors until every dup
   * has run: targets 0..6 can collide with pipe sources, so first lift sources. */
  int sources[7] = {request[0], response[1], nullfd, final[1], control[0], job->git, job->supervisor};
  int lifted[7]; for (int i = 0; i < 7; i++) lifted[i] = -1;
  for (int i = 0; i < 7; i++) { lifted[i] = fcntl(sources[i], F_DUPFD_CLOEXEC, 512); if (lifted[i] < 0) { for (int j = 0; j < i; j++) close(lifted[j]); job->failed = 1; goto done; } }
  for (int i = 0; i < 7; i++) {
    if (posix_spawn_file_actions_adddup2(&actions, lifted[i], i)) { for (int j = 0; j < 7; j++) close(lifted[j]); job->failed = 1; goto done; }
  }
  if (posix_spawn_file_actions_addclosefrom_np(&actions, 7)) { for (int i = 0; i < 7; i++) close(lifted[i]); job->failed = 1; goto done; }
  if (posix_spawnattr_init(&attributes)) { for (int i = 0; i < 7; i++) close(lifted[i]); job->failed = 1; goto done; } attributes_ready = true;
  sigemptyset(&empty); sigfillset(&defaults); sigdelset(&defaults, SIGKILL); sigdelset(&defaults, SIGSTOP);
  int configured = posix_spawnattr_setsigmask(&attributes, &empty)
    || posix_spawnattr_setsigdefault(&attributes, &defaults)
    || posix_spawnattr_setflags(&attributes, POSIX_SPAWN_SETSIGMASK | POSIX_SPAWN_SETSIGDEF);
  char parent[32]; int written = snprintf(parent, sizeof(parent), "%ld", (long)getpid());
  char *argv[] = {"policy-git-supervisor", parent, NULL};
  char *environment[] = {"LANG=C", "PATH=/usr/bin:/bin", NULL};
  /* Descriptor/action preparation can consume the remaining admission time.
   * Do not dispatch even the supervisor after that original absolute bound. */
  double dispatch = milliseconds();
  if (dispatch < 0 || dispatch >= job->deadline) {
    for (int i = 0; i < 7; i++) close(lifted[i]);
    if (dispatch < 0) job->failed = 1; else expired_without_child(job);
    goto done;
  }
  int spawned = configured || written < 1 || (size_t)written >= sizeof(parent) ? EINVAL
    : posix_spawn(&child, "/proc/self/fd/6", &actions, &attributes, argv, environment);
  for (int i = 0; i < 7; i++) close(lifted[i]);
  if (spawned) { child = -1; job->failed = 1; goto done; }
  /* Acquire the owned, still-unreaped supervisor before the first wait4.
   * This fd only wakes poll; wait4 remains the sole exit/usage authority.
   * If unavailable, refuse the call and ask the supervisor to drain normally. */
#ifdef SYS_pidfd_open
  exitfd = (int)syscall(SYS_pidfd_open, child, 0);
#endif
  if (exitfd < 0) job->failed = 1;
  shut(&request[0]); shut(&response[1]); shut(&final[1]); shut(&control[0]); shut(&nullfd);
  if (nonblock(request[1]) || nonblock(response[0]) || nonblock(final[0])) job->failed = 1;
  while (!job->waited || response[0] >= 0 || final[0] >= 0) {
    if (!job->waited) {
      pid_t waited = wait4(child, &job->helper_status, WNOHANG, &job->usage);
      if (waited == child) { job->waited = 1; shut(&exitfd); }
      else if (waited < 0 && errno != EINTR) { job->failed = 1; break; }
    }
    if (job->waited && response[0] < 0 && final[0] < 0) break;
    double now = milliseconds();
    if (now < 0 || now >= job->deadline + 2500) job->failed = 1;
    if (job->failed) { shut(&control[1]); shut(&request[1]); }
    struct pollfd watched[] = {{request[1], POLLOUT, 0}, {response[0], POLLIN, 0}, {final[0], POLLIN, 0}, {exitfd, POLLIN, 0}};
    if (poll(watched, 4, 2) < 0 && errno != EINTR) job->failed = 1;
    if (watched[3].revents & (POLLERR | POLLNVAL)) job->failed = 1;
    if (request[1] >= 0 && watched[0].revents) {
      size_t remaining = job->request_size - sent; if (remaining > SSIZE_MAX) remaining = SSIZE_MAX;
      ssize_t count = write(request[1], job->request + sent, remaining);
      if (count > 0) { sent += (size_t)count; if (sent == job->request_size) shut(&request[1]); }
      else if (count < 0 && errno != EINTR && errno != EAGAIN && errno != EWOULDBLOCK) { job->failed = 1; shut(&request[1]); }
    }
    if (response[0] >= 0 && output(job, &response[0])) { job->failed = 1; shut(&response[0]); }
    if (final[0] >= 0 && receipt(job, &final[0])) { job->failed = 1; shut(&final[0]); }
    /* Never SIGKILL the supervisor before descendant drain. Closing control
     * asks its bounded TERM/KILL/reap path to run; wait4 joins its epilogue.
     * An uninterruptible kernel task can delay this join, as with execFile. */
  }
done:
  shut(&exitfd);
  shut(&request[0]); shut(&request[1]); shut(&response[0]); shut(&response[1]); shut(&final[0]); shut(&final[1]); shut(&control[0]); shut(&control[1]); shut(&nullfd);
  if (attributes_ready) posix_spawnattr_destroy(&attributes);
  if (actions_ready) posix_spawn_file_actions_destroy(&actions);
  if (masked) {
    if (!pipe_pending) { struct timespec zero = {0,0}; while (sigtimedwait(&blocked, NULL, &zero) >= 0) {} }
    pthread_sigmask(SIG_SETMASK, &previous, NULL);
  }
}
static bool valid(struct job *job) {
  return !job->failed && ((job->no_child_known && !job->waited)
    || (job->waited && WIFEXITED(job->helper_status) && WEXITSTATUS(job->helper_status) == 0))
    && (job->no_child_known || job->receipt_size == sizeof(job->receipt)) && job->receipt.magic == POLICY_GIT_MAGIC && job->receipt.version == 1
    && job->receipt.tree_complete == 1 && job->receipt.stdout_bytes == job->output_size
    && job->receipt.stderr_bytes <= job->cap && job->receipt.reason <= POLICY_GIT_PROTOCOL;
}
static bool number(napi_env env, napi_value object, const char *name, double value) {
  napi_value property; return napi_create_double(env, value, &property) == napi_ok && napi_set_named_property(env, object, name, property) == napi_ok;
}
static napi_value result(struct job *job, bool with_output) {
  napi_env env = job->env; napi_value object, bytes, known;
  if (napi_create_object(env, &object) != napi_ok || (with_output
    && (napi_create_buffer_copy(env, job->output_size, job->output, NULL, &bytes) != napi_ok
      || napi_set_named_property(env, object, "stdout", bytes) != napi_ok)) || napi_get_boolean(env, valid(job), &known) != napi_ok
    || napi_set_named_property(env, object, "usageComplete", known) != napi_ok
    || !number(env, object, "reason", (double)job->receipt.reason)
    || !number(env, object, "status", job->receipt.status == UINT64_MAX ? -1 : (double)job->receipt.status)
    || !number(env, object, "signal", (double)job->receipt.signal_number)
    || !number(env, object, "userMicroseconds", (double)job->usage.ru_utime.tv_sec * 1000000 + job->usage.ru_utime.tv_usec)
    || !number(env, object, "systemMicroseconds", (double)job->usage.ru_stime.tv_sec * 1000000 + job->usage.ru_stime.tv_usec)) {
    napi_throw_error(env, NULL, "policy Git result allocation"); return NULL;
  }
  return object;
}
static napi_value sync_call(napi_env env, napi_callback_info info) {
  struct job *job = decode(env, info); if (!job) { napi_throw_error(env, NULL, "policy Git request"); return NULL; }
  pump(job); napi_value value = result(job, true); destroy(job); return value;
}
static void release(struct job *job) {
  pthread_mutex_lock(&job->mutex);
  bool last = --job->references == 0;
  pthread_mutex_unlock(&job->mutex);
  if (last) destroy(job);
}
static void finalize(napi_env env, void *data, void *hint) { (void)env; (void)hint; release(data); }
static void execute(napi_env env, void *data) {
  (void)env; struct job *job = data; pump(job);
  shut(&job->supervisor); shut(&job->git); free(job->request); job->request = NULL;
  /* Independent of the event loop and Promise completion. A CPU query may
   * join this native state while JS completion callbacks cannot run. */
  pthread_mutex_lock(&job->mutex); job->done = true;
  pthread_cond_broadcast(&job->changed); pthread_mutex_unlock(&job->mutex);
}
static napi_value settle_sync(napi_env env, napi_callback_info info) {
  napi_value receiver; struct job *job = NULL; size_t argc = 0;
  if (napi_get_cb_info(env, info, &argc, NULL, &receiver, NULL) != napi_ok
    || napi_unwrap(env, receiver, (void **)&job) != napi_ok || !job) {
    napi_throw_error(env, NULL, "policy Git settle receiver"); return NULL;
  }
  pthread_mutex_lock(&job->mutex);
  while (!job->done) pthread_cond_wait(&job->changed, &job->mutex);
  pthread_mutex_unlock(&job->mutex);
  return result(job, false);
}
static void complete(napi_env env, napi_status status, void *data) {
  struct job *job = data;
  if (status != napi_ok) {
    /* There is no application cancellation API. Environment shutdown can
     * cancel work that never ran; no effect clock runs during that shutdown. */
    pthread_mutex_lock(&job->mutex); job->failed = 1; job->done = true;
    pthread_cond_broadcast(&job->changed); pthread_mutex_unlock(&job->mutex);
  }
  napi_value value = result(job, true);
  if (value) napi_resolve_deferred(env, job->deferred, value);
  else { napi_value error; if (napi_get_and_clear_last_exception(env, &error) == napi_ok) napi_reject_deferred(env, job->deferred, error); }
  free(job->output); job->output = NULL;
  napi_delete_async_work(env, job->work); release(job);
}
static napi_value async_call(napi_env env, napi_callback_info info) {
  struct job *job = decode(env, info); if (!job) { napi_throw_error(env, NULL, "policy Git request"); return NULL; }
  napi_value promise, name, handle; bool wrapped = false;
  if (napi_create_string_utf8(env, "policy-git", NAPI_AUTO_LENGTH, &name) != napi_ok
    || napi_create_object(env, &handle) != napi_ok || napi_create_promise(env, &job->deferred, &promise) != napi_ok
    || napi_create_async_work(env, NULL, name, execute, complete, job, &job->work) != napi_ok) goto bad;
  job->references = 2; /* queued work + wrapped JS handle */
  if (napi_wrap(env, handle, job, finalize, NULL, NULL) != napi_ok) goto bad;
  wrapped = true;
  napi_property_descriptor methods[] = {
    {"completion", NULL, NULL, NULL, NULL, promise, napi_default, NULL},
    {"settleSync", NULL, settle_sync, NULL, NULL, NULL, napi_default, NULL}
  };
  if (napi_define_properties(env, handle, 2, methods) != napi_ok || napi_queue_async_work(env, job->work) != napi_ok) goto bad;
  return handle;
bad:
  if (wrapped) { void *removed; napi_remove_wrap(env, handle, &removed); }
  if (job->work) napi_delete_async_work(env, job->work);
  destroy(job); napi_throw_error(env, NULL, "policy Git async initialization"); return NULL;
}
static napi_value initialize(napi_env env, napi_value exports) {
  napi_property_descriptor methods[] = {
    {"runSync", NULL, sync_call, NULL, NULL, NULL, napi_default, NULL},
    {"runAsync", NULL, async_call, NULL, NULL, NULL, napi_default, NULL}
  };
  if (napi_define_properties(env, exports, 2, methods) != napi_ok) return NULL;
  return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, initialize)
