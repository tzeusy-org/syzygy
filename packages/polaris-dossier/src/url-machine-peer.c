#define _GNU_SOURCE
#include <errno.h>
#include <linux/magic.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/vfs.h>
#include <unistd.h>

#if !defined(__linux__) || !defined(__x86_64__)
#error "URL machine peer requires the pinned Linux x86-64 pidfs profile"
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

/* Trusted host only. fd 3 is the actual paused accepted socket. The prepare
 * call must precede client writes. Node must never read this socket: only
 * these consumed recvmsg chunks retain their kernel sender provenance. */
static int live_identity(int fd, struct stat *identity) {
  struct statfs filesystem;
  struct pollfd watched = { .fd = fd, .events = POLLIN };
  return fstatfs(fd, &filesystem) == 0 && filesystem.f_type == PID_FS_MAGIC
      && fstat(fd, identity) == 0 && poll(&watched, 1, 0) == 0;
}
static int same(const struct stat *left, const struct stat *right) {
  return left->st_dev == right->st_dev && left->st_ino == right->st_ino;
}
int main(int argc, char **argv) {
  if (argc != 2 || (strcmp(argv[1], "prepare") != 0 && strcmp(argv[1], "read") != 0 && strcmp(argv[1], "listener") != 0)) return 64;
  alarm(1);
  int domain, type, enabled = 1, connector = -1;
  socklen_t size = sizeof(int);
  struct stat socket_identity;
  if (getsockopt(3, SOL_SOCKET, SO_DOMAIN, &domain, &size) != 0 || domain != AF_UNIX
      || getsockopt(3, SOL_SOCKET, SO_TYPE, &type, &size) != 0 || type != SOCK_STREAM
      || fstat(3, &socket_identity) != 0 || !S_ISSOCK(socket_identity.st_mode)
      || setsockopt(3, SOL_SOCKET, SO_PASSCRED, &enabled, sizeof(enabled)) != 0
      || setsockopt(3, SOL_SOCKET, SO_PASSPIDFD, &enabled, sizeof(enabled)) != 0) return 65;
  if (strcmp(argv[1], "listener") == 0) {
    int listening = 0;
    if (getsockopt(3, SOL_SOCKET, SO_ACCEPTCONN, &listening, &size) != 0 || !listening) return 65;
    return printf("L %llu %llu\n", (unsigned long long)socket_identity.st_dev,
      (unsigned long long)socket_identity.st_ino) < 0 ? 66 : 0;
  }
  struct ucred peer;
  socklen_t peer_size = sizeof(peer);
  struct stat connection_identity;
  if (getsockopt(3, SOL_SOCKET, SO_DOMAIN, &domain, &size) != 0 || domain != AF_UNIX
      || getsockopt(3, SOL_SOCKET, SO_TYPE, &type, &size) != 0 || type != SOCK_STREAM
      || getsockopt(3, SOL_SOCKET, SO_PEERCRED, &peer, &peer_size) != 0 || peer_size != sizeof(peer)
      || peer.pid <= 0 || peer.uid == (uid_t)-1 || peer.gid == (gid_t)-1
      || fstat(3, &socket_identity) != 0 || !S_ISSOCK(socket_identity.st_mode)
      || setsockopt(3, SOL_SOCKET, SO_PASSCRED, &enabled, sizeof(enabled)) != 0
      || setsockopt(3, SOL_SOCKET, SO_PASSPIDFD, &enabled, sizeof(enabled)) != 0
      || getsockopt(3, SOL_SOCKET, SO_PEERPIDFD, &connector, &size) != 0 || size != sizeof(int)
      || !live_identity(connector, &connection_identity)) return 65;
  if (strcmp(argv[1], "prepare") == 0) {
    return printf("P %ld %lu %lu %llu %llu %llu %llu\n", (long)peer.pid, (unsigned long)peer.uid,
      (unsigned long)peer.gid, (unsigned long long)connection_identity.st_dev,
      (unsigned long long)connection_identity.st_ino, (unsigned long long)socket_identity.st_dev,
      (unsigned long long)socket_identity.st_ino) < 0 ? 66 : 0;
  }

  union {
    struct cmsghdr alignment;
    char bytes[CMSG_SPACE(sizeof(struct ucred)) + CMSG_SPACE(sizeof(int))];
  } ancillary;
  char bytes[65536];
  struct iovec data = { .iov_base = bytes, .iov_len = sizeof(bytes) };
  struct msghdr message = { .msg_iov = &data, .msg_iovlen = 1,
    .msg_control = ancillary.bytes, .msg_controllen = sizeof(ancillary.bytes) };
  ssize_t count = recvmsg(3, &message, MSG_DONTWAIT | MSG_CMSG_CLOEXEC);
  if (count < 0) return errno == EAGAIN || errno == EWOULDBLOCK ? 75 : 67;
  if (count == 0) return puts("E") == EOF ? 66 : 0;
  if (message.msg_flags & (MSG_TRUNC | MSG_CTRUNC)) return 68;
  struct ucred sender = { .pid = 0 };
  int sender_fd = -1;
  for (struct cmsghdr *header = CMSG_FIRSTHDR(&message); header; header = CMSG_NXTHDR(&message, header)) {
    if (header->cmsg_level == SOL_SOCKET && header->cmsg_type == SCM_CREDENTIALS
        && header->cmsg_len == CMSG_LEN(sizeof(sender)) && sender.pid == 0) {
      memcpy(&sender, CMSG_DATA(header), sizeof(sender));
    } else if (header->cmsg_level == SOL_SOCKET && header->cmsg_type == SCM_PIDFD
        && header->cmsg_len == CMSG_LEN(sizeof(sender_fd)) && sender_fd == -1) {
      memcpy(&sender_fd, CMSG_DATA(header), sizeof(sender_fd));
    } else return 68;
  }
  struct stat sender_identity, final_identity;
  if (sender.pid != peer.pid || sender.uid != peer.uid || sender.gid != peer.gid
      || sender_fd < 0 || !live_identity(sender_fd, &sender_identity)
      || !live_identity(connector, &final_identity) || !same(&sender_identity, &connection_identity)
      || !same(&final_identity, &connection_identity)) return 69;
  if (printf("D %ld %lu %lu %llu %llu %llu %llu %ld\n", (long)peer.pid, (unsigned long)peer.uid,
      (unsigned long)peer.gid, (unsigned long long)connection_identity.st_dev,
      (unsigned long long)connection_identity.st_ino, (unsigned long long)socket_identity.st_dev,
      (unsigned long long)socket_identity.st_ino, (long)count) < 0
      || fwrite(bytes, 1, (size_t)count, stdout) != (size_t)count || fflush(stdout) != 0) return 66;
  return 0;
}
