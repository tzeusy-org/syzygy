#define _GNU_SOURCE
/* Test-only link wrappers delay the final preparation operation, never the
 * dispatch syscall. The production sources contain no fixture switches. */
#include <fcntl.h>
#include <spawn.h>
#include <unistd.h>
#ifdef POLICY_DELAY_HOST
int __real_posix_spawn_file_actions_addclosefrom_np(posix_spawn_file_actions_t *, int);
int __wrap_posix_spawn_file_actions_addclosefrom_np(posix_spawn_file_actions_t *actions, int from) {
  int result = __real_posix_spawn_file_actions_addclosefrom_np(actions, from);
  usleep(200000);
  return result;
}
#endif
#ifdef POLICY_DELAY_GIT
pid_t __real_fork(void);
pid_t __wrap_fork(void) {
  int fd = open(POLICY_SETUP_WITNESS ".fork", O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0600);
  if (fd < 0 || write(fd, "fork\n", 5) != 5) _exit(78);
  close(fd);
  return __real_fork();
}
int __real_pipe2(int [2], int);
int __wrap_pipe2(int descriptors[2], int flags) {
  static unsigned calls;
  int result = __real_pipe2(descriptors, flags);
  if (++calls == 3) usleep(200000);
  return result;
}
#endif
#ifdef POLICY_SETUP_WITNESS
__attribute__((constructor)) static void started(void) {
  int fd = open(POLICY_SETUP_WITNESS, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0600);
  if (fd < 0 || write(fd, "started\n", 8) != 8) _exit(79);
  close(fd);
}
#endif
