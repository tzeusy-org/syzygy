#define _GNU_SOURCE
#include <linux/magic.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/un.h>
#include <sys/vfs.h>
#include <sys/wait.h>
#include <unistd.h>

/* Linux x86-64 UAPI values for toolchains with older userspace headers. */
#if !defined(__linux__) || !defined(__x86_64__)
#error "session peer lifetime control requires Linux x86-64"
#endif
#ifndef SO_PASSPIDFD
#define SO_PASSPIDFD 76
#endif
#ifndef SO_PEERPIDFD
#define SO_PEERPIDFD 77
#endif
#ifndef SCM_PIDFD
#define SCM_PIDFD 0x04
#endif
#ifndef PID_FS_MAGIC
#define PID_FS_MAGIC 0x50494446
#endif

/* Own-fixture control. A known fork is held behind a private start barrier
 * while the controller obtains its pidfd. This has no product transport,
 * upstream channel, pinned executable, or namespace attestation. */
enum scenario { LIVE, INHERITED, FORGED, EXITED };

static void require(int satisfied, const char *step) {
  if (!satisfied) {
    fprintf(stderr, "session peer lifetime control failed: %s\n", step);
    exit(1);
  }
}

static void signal_step(int fd, char value) {
  require(write(fd, &value, 1) == 1, "write barrier");
}

static void await_step(int fd, char expected) {
  char value = 0;
  require(read(fd, &value, 1) == 1 && value == expected, "read barrier");
}

static void await_exit(pid_t pid) {
  int status;
  require(waitpid(pid, &status, 0) == pid && WIFEXITED(status)
      && WEXITSTATUS(status) == 0, "reap fixture sender");
}

static int connect_sender(const struct sockaddr_un *address) {
  int fd = socket(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0);
  require(fd >= 0 && connect(fd, (const struct sockaddr *)address,
      sizeof(*address)) == 0, "connect fixture sender");
  return fd;
}

static void format_claim(char *buffer, size_t capacity, pid_t pid) {
  int length = snprintf(buffer, capacity, "author pid=%ld uid=%lu gid=%lu",
      (long)pid, (unsigned long)geteuid(), (unsigned long)getegid());
  require(length > 0 && (size_t)length < capacity, "format claimed identity");
}

static void run_sender(enum scenario scenario, int barrier, const struct sockaddr_un *address) {
  alarm(3);
  await_step(barrier, 'g');
  pid_t claimed_pid = getpid();
  int fd = scenario == FORGED ? -1 : connect_sender(address);
  if (scenario == INHERITED || scenario == FORGED) {
    /* The second sender has the same UID, GID and executable. It inherits
     * the connected socket in INHERITED and opens its own socket in FORGED. */
    pid_t other = fork();
    require(other >= 0, "fork unrelated sender");
    if (other > 0) {
      if (fd >= 0) close(fd);
      close(barrier);
      await_exit(other);
      return;
    }
    alarm(3);
    if (fd < 0) fd = connect_sender(address);
  }

  await_step(barrier, 'w');
  char claim[96];
  format_claim(claim, sizeof(claim), claimed_pid);
  size_t length = strlen(claim);
  require(send(fd, claim, length, 0) == (ssize_t)length, "send fixture request");
  signal_step(barrier, 's');
  if (scenario != EXITED) await_step(barrier, 'd');
  close(fd);
}

static struct stat pidfd_identity(int fd) {
  struct statfs filesystem;
  struct stat identity;
  require(fstatfs(fd, &filesystem) == 0 && filesystem.f_type == PID_FS_MAGIC
      && fstat(fd, &identity) == 0, "pidfd identity on pidfs");
  return identity;
}

static int same_pidfd(const struct stat *left, const struct stat *right) {
  return left->st_dev == right->st_dev && left->st_ino == right->st_ino;
}

static int exited(int fd) {
  struct pollfd watched = { .fd = fd, .events = POLLIN };
  int count = poll(&watched, 1, 0);
  require(count == 0 || (count == 1 && (watched.revents & POLLIN)), "poll sender lifetime");
  return count == 1;
}

struct delivery {
  struct ucred credentials;
  int pidfd;
};

static struct delivery receive_frame(int fd, const char *claim) {
  union {
    struct cmsghdr alignment;
    char bytes[CMSG_SPACE(sizeof(struct ucred)) + CMSG_SPACE(sizeof(int))];
  } ancillary;
  char frame[96];
  struct iovec data = { .iov_base = frame, .iov_len = sizeof(frame) };
  struct msghdr message = { .msg_iov = &data, .msg_iovlen = 1,
    .msg_control = ancillary.bytes, .msg_controllen = sizeof(ancillary.bytes) };
  ssize_t length = recvmsg(fd, &message, MSG_CMSG_CLOEXEC);
  require(length == (ssize_t)strlen(claim) && !(message.msg_flags & (MSG_TRUNC | MSG_CTRUNC))
      && memcmp(frame, claim, strlen(claim)) == 0, "receive exact fixture request");
  struct delivery delivery = { .pidfd = -1 };
  for (struct cmsghdr *header = CMSG_FIRSTHDR(&message); header; header = CMSG_NXTHDR(&message, header)) {
    if (header->cmsg_level == SOL_SOCKET && header->cmsg_type == SCM_CREDENTIALS
        && header->cmsg_len == CMSG_LEN(sizeof(delivery.credentials)) && delivery.credentials.pid == 0) {
      memcpy(&delivery.credentials, CMSG_DATA(header), sizeof(delivery.credentials));
    } else if (header->cmsg_level == SOL_SOCKET && header->cmsg_type == SCM_PIDFD
        && header->cmsg_len == CMSG_LEN(sizeof(delivery.pidfd)) && delivery.pidfd == -1) {
      memcpy(&delivery.pidfd, CMSG_DATA(header), sizeof(delivery.pidfd));
    } else require(0, "unexpected ancillary data");
  }
  require(delivery.pidfd >= 0 && delivery.credentials.pid > 0, "kernel sender credentials and pidfd");
  return delivery;
}

int main(int argc, char **argv) {
  require(argc == 3, "arguments");
  static const char *const scenarios[] = { "live", "inherited", "forged", "exited" };
  size_t choice = 0;
  while (choice < sizeof(scenarios) / sizeof(*scenarios) && strcmp(argv[1], scenarios[choice]) != 0) choice++;
  require(choice < sizeof(scenarios) / sizeof(*scenarios), "scenario");
  enum scenario scenario = (enum scenario)choice;
  alarm(3);

  struct sockaddr_un address = { .sun_family = AF_UNIX };
  require(strlen(argv[2]) < sizeof(address.sun_path), "fixture socket path length");
  memcpy(address.sun_path, argv[2], strlen(argv[2]) + 1);
  int listener = socket(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0);
  require(listener >= 0 && bind(listener, (const struct sockaddr *)&address, sizeof(address)) == 0
      && listen(listener, 1) == 0, "start fixture socket");
  int barrier[2];
  require(socketpair(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0, barrier) == 0, "make private barrier");
  pid_t launched = fork();
  require(launched >= 0, "launch fixture sender");
  if (launched == 0) {
    close(barrier[0]);
    close(listener);
    run_sender(scenario, barrier[1], &address);
    _exit(0);
  }

  close(barrier[1]);
  int held = (int)syscall(SYS_pidfd_open, launched, 0);
  require(held >= 0, "open launch-held pidfd");
  struct stat launch_identity = pidfd_identity(held);
  signal_step(barrier[0], 'g');
  int accepted = accept4(listener, NULL, NULL, SOCK_CLOEXEC);
  int enabled = 1, connector;
  socklen_t connector_size = sizeof(connector);
  require(accepted >= 0 && setsockopt(accepted, SOL_SOCKET, SO_PASSCRED, &enabled, sizeof(enabled)) == 0
      && setsockopt(accepted, SOL_SOCKET, SO_PASSPIDFD, &enabled, sizeof(enabled)) == 0
      && getsockopt(accepted, SOL_SOCKET, SO_PEERPIDFD, &connector, &connector_size) == 0
      && connector_size == sizeof(connector), "enable kernel sender metadata and get connector pidfd");
  struct stat connection_identity = pidfd_identity(connector);
  signal_step(barrier[0], 'w');
  await_step(barrier[0], 's');
  if (scenario == EXITED) await_exit(launched);

  char claim[96];
  format_claim(claim, sizeof(claim), launched);
  struct delivery delivery = receive_frame(accepted, claim);
  struct stat sender_identity = pidfd_identity(delivery.pidfd);
  require(delivery.credentials.uid == geteuid() && delivery.credentials.gid == getegid(), "same-user control");
  require((delivery.credentials.pid == launched) == (scenario == LIVE || scenario == EXITED), "fixture writer PID");
  require(exited(delivery.pidfd) == (scenario == EXITED), "fixture sender at requested lifetime");

  /* This output is the sole synthetic effect. All authorization operands
   * come from the private launch and kernel metadata, never the claim. */
  if (!same_pidfd(&launch_identity, &connection_identity)) puts("refused: connector");
  else if (!same_pidfd(&launch_identity, &sender_identity)) puts("refused: sender");
  else if (exited(held)) puts("refused: exited");
  else puts("effect");

  if (scenario != EXITED) {
    signal_step(barrier[0], 'd');
    await_exit(launched);
  }
  close(delivery.pidfd);
  close(connector);
  close(held);
  close(accepted);
  close(listener);
  close(barrier[0]);
  return 0;
}
