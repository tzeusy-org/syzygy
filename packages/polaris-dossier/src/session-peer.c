#define _GNU_SOURCE
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdio.h>

/* Host-only primitive: query the borrowed connected Unix socket on fd 3.
 * This attests kernel peer numbers, never authorization or process liveness. */
int main(int argc, char **argv) {
  (void)argv;
  if (argc != 1) return 64;
  struct sockaddr_un address;
  socklen_t address_size = sizeof(address);
  int type;
  socklen_t type_size = sizeof(type);
  struct ucred peer;
  socklen_t peer_size = sizeof(peer);
  if (getpeername(3, (struct sockaddr *)&address, &address_size) != 0
      || address.sun_family != AF_UNIX
      || getsockopt(3, SOL_SOCKET, SO_TYPE, &type, &type_size) != 0
      || type != SOCK_STREAM
      || getsockopt(3, SOL_SOCKET, SO_PEERCRED, &peer, &peer_size) != 0
      || peer_size != sizeof(peer) || peer.pid <= 0
      || peer.uid == (uid_t)-1 || peer.gid == (gid_t)-1) return 65;
  if (printf("%ld %lu %lu\n", (long)peer.pid,
      (unsigned long)peer.uid, (unsigned long)peer.gid) < 0) return 66;
  return 0;
}
