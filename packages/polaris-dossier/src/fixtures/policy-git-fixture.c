#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>
static void burn(void) {
  struct timespec start, now; if (clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &start)) _exit(98);
  do { if (clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &now)) _exit(98); }
  while ((now.tv_sec-start.tv_sec)*1000000000L + now.tv_nsec-start.tv_nsec < 20000000L);
}
static void emit(char byte, size_t count, int fd) { for (size_t i=0; i<count; i++) if (write(fd,&byte,1)!=1) _exit(97); }
extern char **environ;
int main(int argc, char **argv) {
  const char *mode = getenv("POLICY_FIXTURE_MODE"); if (!mode) return 96;
  const char *started=getenv("POLICY_FIXTURE_STARTED");
  if(started) { int file=open(started,O_WRONLY|O_CREAT|O_APPEND,0600); if(file<0)return 81; if(write(file,"started\n",8)!=8){close(file);return 80;} close(file); }
  if (!strcmp(mode,"oracle")) {
    const char *root=getenv("POLICY_FIXTURE_ROOT");
    if(argc!=6||!root||strcmp(argv[0],"git")||strcmp(argv[1],"--no-replace-objects")||strcmp(argv[2],"-C")
      ||strcmp(argv[3],root)||strcmp(argv[4],"cat-file")||strcmp(argv[5],"--batch-command"))return 41;
    const char *expected[]={"PATH=/usr/bin:/bin","LANG=C","GIT_CONFIG_NOSYSTEM=1","GIT_CONFIG_GLOBAL=/dev/null",
      "GIT_OPTIONAL_LOCKS=0","GIT_NO_LAZY_FETCH=1","POLICY_FIXTURE_MODE=oracle"};
    size_t count=0;for(char **entry=environ;*entry;entry++) {
      int matched=0;for(size_t i=0;i<sizeof(expected)/sizeof(expected[0]);i++)if(!strcmp(*entry,expected[i]))matched++;
      if(!strncmp(*entry,"POLICY_FIXTURE_ROOT=",20)&&!strcmp(*entry+20,root))matched++;
      if(matched!=1)return 42;
      count++;
    }
    if(count!=8)return 43;
    char bytes[32];ssize_t size=read(0,bytes,sizeof(bytes));
    if(size!=17||memcmp(bytes,"exact own request",17))return 44;
    if(read(0,bytes,sizeof(bytes))!=0)return 45;
    if(write(1,"oracle",6)!=6)return 46;
    return 0;
  }
  if (!strcmp(mode,"echo")) {
    char bytes[8192]; ssize_t count;
    while ((count=read(0,bytes,sizeof(bytes)))>0) { ssize_t sent=0; while(sent<count) { ssize_t part=write(1,bytes+sent,(size_t)(count-sent)); if(part<1)return 95; sent+=part; } }
    return count < 0 ? 94 : 0;
  }
  if (!strcmp(mode,"separate")) { emit('o',1024,1); emit('e',1024,2); return 0; }
  if (!strcmp(mode,"overflow")) { emit('o',1025,1); return 0; }
  if (!strcmp(mode,"stderr-overflow")) { emit('e',1025,2); return 0; }
  if (!strcmp(mode,"exit")) return 23;
  if (!strcmp(mode,"signal")) { raise(SIGTERM); return 93; }
  if (!strcmp(mode,"identity")) {
    sigset_t mask; sigprocmask(SIG_SETMASK,NULL,&mask);
    for(int s=1;s<NSIG;s++) if(sigismember(&mask,s)==1)return 92;
    struct sigaction action; if(sigaction(SIGPIPE,NULL,&action)||action.sa_handler!=SIG_DFL)return 91;
    for(int fd=3;fd<1024;fd++) if(fd!=9&&fcntl(fd,F_GETFD)>=0)return 90;
    return 0;
  }
  if (!strcmp(mode,"nested-cpu")) {
    burn(); pid_t child=fork(); if(child<0)return 89;
    if(!child){ burn(); pid_t nested=fork(); if(nested<0)_exit(88); if(!nested){burn();_exit(0);} int status; if(waitpid(nested,&status,0)!=nested||status)_exit(87);_exit(0); }
    int status; return waitpid(child,&status,0)==child&&status==0?0:86;
  }
  if (!strcmp(mode,"continuous-stderr")) {
    const char *file=getenv("POLICY_FIXTURE_PID"); FILE *out=file?fopen(file,"wx"):NULL;
    if(!out)return 79;
    fprintf(out,"%ld\n",(long)getpid()); fclose(out);
    /* Multiple real writers keep the diagnostic stream busy; stderr bytes
     * are counted but never retained. The supervisor owns/reaps each one. */
    char block[16384]; memset(block,'e',sizeof(block));
    for(int i=0;i<4;i++) { pid_t child=fork(); if(child<0)return 78; if(!child) {
      for(;;) { ssize_t n=write(2,block,sizeof(block)); if(n<0&&errno!=EINTR)_exit(77); }
    } }
    for(;;) { ssize_t n=write(2,block,sizeof(block)); if(n<0&&errno!=EINTR)return 76; }
  }
  if (!strcmp(mode,"orphan")) {
    pid_t child=fork(); if(child<0)return 85;
    if(!child) {
      if(setsid()<0)_exit(84);
      signal(SIGTERM,SIG_IGN);
      const char *file=getenv("POLICY_FIXTURE_PID"); FILE *out=file?fopen(file,"wx"):NULL;
      if(!out)_exit(83);
      fprintf(out,"%ld\n",(long)getpid()); fclose(out);
      close(0);close(1);close(2);
      for(;;)pause();
    }
    return 0;
  }
  return 82;
}
