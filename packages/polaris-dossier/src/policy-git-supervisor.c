#define _GNU_SOURCE
#include "policy-git-protocol.h"
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

/* This single-threaded process owns only one fixed Git invocation and its
 * descendants. Node never becomes a subreaper. fd4 is host lifetime control;
 * fd5 is the verified Git inode. No observed executable is accepted. */
static volatile sig_atomic_t interrupted;
static void interrupt_handler(int signal_number) { (void)signal_number; interrupted = 1; }
static double milliseconds(void) {
  struct timespec sample;
  if (clock_gettime(CLOCK_MONOTONIC, &sample)) return -1;
  return (double)sample.tv_sec * 1000 + (double)sample.tv_nsec / 1000000;
}
static void shut(int *fd) { if (*fd >= 0) { close(*fd); *fd = -1; } }
static int nonblock(int fd) { int flags = fcntl(fd, F_GETFL); return flags < 0 ? -1 : fcntl(fd, F_SETFL, flags | O_NONBLOCK); }
static bool cancelled(void) {
  struct pollfd control = {4, POLLIN, 0};
  return interrupted || poll(&control, 1, 0) < 0 || (control.revents & (POLLIN | POLLHUP | POLLERR | POLLNVAL));
}
static int transfer(int fd, void *buffer, size_t size, bool writing, double deadline) {
  size_t offset = 0;
  while (offset < size) {
    double now = milliseconds();
    if (now < 0 || now >= deadline || cancelled()) return -1;
    struct pollfd watched = {fd, writing ? POLLOUT : POLLIN, 0};
    int ready = poll(&watched, 1, 10);
    if (ready < 0) { if (errno == EINTR) continue; return -1; }
    if (!ready) continue;
    size_t remaining = size - offset;
    if (remaining > SSIZE_MAX) remaining = SSIZE_MAX;
    ssize_t count = writing ? write(fd, (char *)buffer + offset, remaining) : read(fd, (char *)buffer + offset, remaining);
    if (count > 0) offset += (size_t)count;
    else if (count == 0) return -1;
    else if (errno != EINTR && errno != EAGAIN && errno != EWOULDBLOCK) return -1;
  }
  return 0;
}
static void free_strings(char **values) { if (values) { for (size_t i = 0; values[i]; i++) free(values[i]); free(values); } }
static char **read_strings(uint64_t amount, double deadline) {
  size_t count;
  if (policy_git_size(amount, &count) || count >= SIZE_MAX / sizeof(char *)) return NULL;
  size_t items;
  if (policy_git_size(count, &items) || items > (size_t)PTRDIFF_MAX / sizeof(char *) - 1) return NULL;
  char **values = calloc(items + 1, sizeof(char *));
  if (!values) return NULL;
  for (size_t i = 0; i < count; i++) {
    uint64_t length; size_t size, allocation;
    if (transfer(0, &length, sizeof(length), false, deadline) || policy_git_size(length, &size)
      || policy_git_add(size, 1, &allocation) || !(values[i] = malloc(allocation))
      || transfer(0, values[i], size, false, deadline) || memchr(values[i], 0, size)) {
      free_strings(values); return NULL;
    }
    values[i][size] = 0;
  }
  return values;
}
static bool fixed_arguments(char **args, uint64_t count) {
  if (count < 5 || strcmp(args[0], "git") || strcmp(args[1], "--no-replace-objects")
    || strcmp(args[2], "-C") || args[3][0] != '/') return false;
  const char *command = args[4];
  /* The package-private TS boundary supplies these metadata-only shapes. No
   * executable, hook command, shell, credential or transport command is exposed. */
  return !strcmp(command, "cat-file") || !strcmp(command, "for-each-ref")
    || !strcmp(command, "rev-parse") || !strcmp(command, "rev-list") || !strcmp(command, "show");
}
static bool reap(pid_t git, int *git_status, bool *git_waited) {
  for (;;) {
    int status; pid_t child = waitpid(-1, &status, WNOHANG);
    if (child > 0) { if (child == git) { *git_status = status; *git_waited = true; } continue; }
    if (!child) return false;
    if (errno == EINTR) continue;
    return errno == ECHILD;
  }
}
static int signal_children(int signal_number, pid_t git, int *git_status, bool *git_waited) {
  char name[96];
  int length = snprintf(name, sizeof(name), "/proc/self/task/%ld/children", (long)getpid());
  if (length <= 0 || (size_t)length >= sizeof(name)) return -1;
  FILE *children = fopen(name, "re");
  if (!children) return -1;
  long candidate; int result = 0;
  while (fscanf(children, "%ld", &candidate) == 1) {
    if (candidate <= 0 || candidate > INT_MAX) { result = -1; break; }
    int status; pid_t child = (pid_t)candidate;
    /* One thread, one waiter: a live/unreaped own child reserves its PID.
     * Never signal a PID after a positive reap. No process-name census. */
    pid_t waited;
    do { waited = waitpid(child, &status, WNOHANG); } while (waited < 0 && errno == EINTR);
    if (!waited) { if (kill(child, signal_number) && errno != ESRCH) result = -1; }
    else if (waited == child) { if (child == git) { *git_status = status; *git_waited = true; } }
    else if (errno != ECHILD) result = -1;
  }
  if (ferror(children)) result = -1;
  fclose(children);
  return result;
}
static bool terminate_tree(pid_t git, int *status, bool *waited) {
  double began = milliseconds();
  if (began < 0) return false;
  for (;;) {
    if (reap(git, status, waited)) return true;
    double now = milliseconds();
    if (now < 0 || now - began >= 1250) return false;
    if (signal_children(now - began < 250 ? SIGTERM : SIGKILL, git, status, waited)) return false;
    struct timespec pause = {0, 2000000};
    nanosleep(&pause, NULL);
  }
}
struct output { unsigned char *bytes; size_t size, allocated; };
static int drain(int *fd, struct output *output, size_t *total, size_t cap) {
  unsigned char bytes[16384];
  /* Return to deadline/control sampling even when a writer keeps this pipe
   * continuously readable. This is a per-turn scheduling bound, not a cap. */
  for (unsigned reads = 0; reads < 4; reads++) {
    ssize_t count = read(*fd, bytes, sizeof(bytes));
    if (count > 0) {
      size_t next;
      if (policy_git_add(*total, (size_t)count, &next) || next > cap) return POLICY_GIT_LIMIT;
      if (output) {
        if (next > output->allocated) {
          size_t grown = output->allocated ? output->allocated : 16384;
          while (grown < next) { if (grown > PTRDIFF_MAX / 2) { grown = next; break; } grown *= 2; }
          if (grown > cap) grown = cap;
          void *replacement = realloc(output->bytes, grown);
          if (!replacement) return POLICY_GIT_PIPE;
          output->bytes = replacement; output->allocated = grown;
        }
        memcpy(output->bytes + *total, bytes, (size_t)count); output->size = next;
      }
      *total = next;
    } else if (!count) { shut(fd); return POLICY_GIT_OK; }
    else if (errno == EAGAIN || errno == EWOULDBLOCK) return POLICY_GIT_OK;
    else if (errno != EINTR) return POLICY_GIT_PIPE;
  }
  return POLICY_GIT_OK;
}
int main(int argc, char **argv) {
  struct policy_git_receipt receipt = {.magic = POLICY_GIT_MAGIC, .version = 1, .reason = POLICY_GIT_PROTOCOL};
  struct policy_git_request request;
  char **arguments = NULL, **environment = NULL;
  unsigned char *input = NULL; struct output output = {0};
  int in[2] = {-1,-1}, out[2] = {-1,-1}, err[2] = {-1,-1}, nullfd = -1, git_exitfd = -1;
  pid_t git = -1; int status = 0; bool waited = false, complete = false;
  size_t input_size = 0, cap = 0, sent = 0, stderr_size = 0, stdout_size = 0;
  double began = milliseconds(), deadline = began + 10000;
  struct sigaction action; memset(&action, 0, sizeof(action)); action.sa_handler = interrupt_handler; sigemptyset(&action.sa_mask);
  if (argc != 2 || began < 0 || sigaction(SIGTERM, &action, NULL) || sigaction(SIGINT, &action, NULL)
    || signal(SIGPIPE, SIG_IGN) == SIG_ERR || prctl(PR_SET_PDEATHSIG, SIGTERM)
    || getppid() != (pid_t)strtol(argv[1], NULL, 10) || prctl(PR_SET_CHILD_SUBREAPER, 1)
    || nonblock(0) || nonblock(1) || nonblock(3)) goto finish;
  if (transfer(0, &request, sizeof(request), false, deadline) || request.magic != POLICY_GIT_MAGIC || request.version != 1
    || request.timeout_ms < 1 || request.timeout_ms > 10000 || request.ignore_input > 1
    || policy_git_size(request.input_bytes, &input_size) || policy_git_size(request.max_buffer, &cap)
    || (request.ignore_input && input_size)) goto finish;
  deadline = (double)request.deadline_microseconds / 1000;
  if (!request.deadline_microseconds || deadline > began + (double)request.timeout_ms) goto finish;
  if (milliseconds() >= deadline) { receipt.reason = POLICY_GIT_TIMEOUT; goto finish; }
  arguments = read_strings(request.argc, deadline); environment = read_strings(request.envc, deadline);
  if (!arguments || !environment || !fixed_arguments(arguments, request.argc)) goto finish;
  input = malloc(input_size ? input_size : 1);
  if (!input || transfer(0, input, input_size, false, deadline)) goto finish;
  close(0);
  receipt.reason = POLICY_GIT_PIPE;
  if (pipe2(out, O_CLOEXEC) || pipe2(err, O_CLOEXEC) || (!request.ignore_input && pipe2(in, O_CLOEXEC))) goto finish;
  if (request.ignore_input && (nullfd = open("/dev/null", O_RDONLY | O_CLOEXEC)) < 0) goto finish;
  /* Decode, input transfer and pipe setup share the original admission
   * deadline. A late/cancelled prepared request must never dispatch Git. */
  if (cancelled()) { receipt.reason = POLICY_GIT_CANCELLED; goto finish; }
  double dispatch = milliseconds();
  if (dispatch < 0 || dispatch >= deadline) { receipt.reason = POLICY_GIT_TIMEOUT; goto finish; }
  receipt.reason = POLICY_GIT_SPAWN;
  git = fork();
  if (!git) {
    sigset_t empty; sigemptyset(&empty); sigprocmask(SIG_SETMASK, &empty, NULL);
    struct sigaction defaults; memset(&defaults, 0, sizeof(defaults)); defaults.sa_handler = SIG_DFL; sigemptyset(&defaults.sa_mask);
    for (int number = 1; number < NSIG; number++) if (number != SIGKILL && number != SIGSTOP) (void)sigaction(number, &defaults, NULL);
    if (dup2(request.ignore_input ? nullfd : in[0], 0) < 0 || dup2(out[1], 1) < 0 || dup2(err[1], 2) < 0 || dup2(5, 9) < 0) _exit(126);
    for (int fd = 3; fd < 9; fd++) close(fd);
    if (syscall(SYS_close_range, 10U, ~0U, 0)) _exit(126);
    execve("/proc/self/fd/9", arguments, environment); _exit(127);
  }
  if (git < 0) goto finish;
  /* Acquire the owned, still-unreaped Git child before the first waitpid.
   * This fd only wakes poll; reap remains the exit/tree authority. */
#ifdef SYS_pidfd_open
  git_exitfd = (int)syscall(SYS_pidfd_open, git, 0);
#endif
  if (git_exitfd < 0) { receipt.reason = POLICY_GIT_PIPE; goto cleanup; }
  shut(&in[0]); shut(&out[1]); shut(&err[1]); shut(&nullfd); close(5);
  if (nonblock(out[0]) || nonblock(err[0]) || (in[1] >= 0 && nonblock(in[1]))) { receipt.reason = POLICY_GIT_PIPE; goto cleanup; }
  if (!input_size) shut(&in[1]);
  receipt.reason = POLICY_GIT_OK;
  while (!complete || out[0] >= 0 || err[0] >= 0) {
    complete = reap(git, &status, &waited);
    /* An adopted child may outlive Git after closing its output pipes.
     * Retire the exited Git wake fd now; its permanent readiness must not spin. */
    if (waited) shut(&git_exitfd);
    if (complete && out[0] < 0 && err[0] < 0) break;
    double now = milliseconds();
    if (cancelled()) { receipt.reason = POLICY_GIT_CANCELLED; break; }
    if (now < 0 || now >= deadline) { receipt.reason = POLICY_GIT_TIMEOUT; break; }
    struct pollfd watched[] = {{out[0], POLLIN, 0}, {err[0], POLLIN, 0}, {in[1], POLLOUT, 0}, {4, POLLIN, 0}, {git_exitfd, POLLIN, 0}};
    if (poll(watched, 5, 2) < 0 && errno != EINTR) { receipt.reason = POLICY_GIT_PIPE; break; }
    if (watched[4].revents & (POLLERR | POLLNVAL)) { receipt.reason = POLICY_GIT_PIPE; break; }
    int failure = out[0] >= 0 ? drain(&out[0], &output, &stdout_size, cap) : 0;
    if (!failure && err[0] >= 0) failure = drain(&err[0], NULL, &stderr_size, cap);
    if (failure) { receipt.reason = (uint64_t)failure; break; }
    if (in[1] >= 0 && watched[2].revents) {
      size_t remaining = input_size - sent; if (remaining > SSIZE_MAX) remaining = SSIZE_MAX;
      ssize_t count = write(in[1], input + sent, remaining);
      if (count > 0) { sent += (size_t)count; if (sent == input_size) shut(&in[1]); }
      else if (count < 0 && errno != EINTR && errno != EAGAIN && errno != EWOULDBLOCK) { receipt.reason = POLICY_GIT_INPUT; break; }
    }
  }
cleanup:
  shut(&git_exitfd);
  shut(&in[1]); shut(&out[0]); shut(&err[0]);
  if (!complete) complete = terminate_tree(git, &status, &waited);
  if (!complete || !waited) receipt.reason = POLICY_GIT_WAIT;
  else if (!receipt.reason) {
    if (WIFSIGNALED(status)) receipt.reason = POLICY_GIT_SIGNAL;
    else if (!WIFEXITED(status) || WEXITSTATUS(status)) receipt.reason = POLICY_GIT_EXIT;
  }
finish:
  shut(&git_exitfd);
  shut(&in[0]); shut(&in[1]); shut(&out[0]); shut(&out[1]); shut(&err[0]); shut(&err[1]); shut(&nullfd);
  if (git < 0) complete = reap(git, &status, &waited);
  receipt.tree_complete = complete && (git < 0 || waited);
  receipt.status = waited && WIFEXITED(status) ? (uint64_t)WEXITSTATUS(status) : UINT64_MAX;
  receipt.signal_number = waited && WIFSIGNALED(status) ? (uint64_t)WTERMSIG(status) : 0;
  receipt.stdout_bytes = output.size; receipt.stderr_bytes = stderr_size;
  /* Payload delivery and final epilogue remain in the helper's wait4 charge. */
  double final_deadline = milliseconds() + 1250;
  int delivered = transfer(1, output.bytes, output.size, true, final_deadline) == 0
    && transfer(3, &receipt, sizeof(receipt), true, final_deadline) == 0;
  free_strings(arguments); free_strings(environment); free(input); free(output.bytes);
  close(1); close(3); close(4); close(5); close(6);
  return delivered && receipt.tree_complete ? 0 : 1;
}
