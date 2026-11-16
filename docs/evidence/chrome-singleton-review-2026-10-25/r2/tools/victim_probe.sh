#!/bin/bash
# Round-2 reviewer's F1 probe for PR 515. Runs INSIDE a bwrap sandbox whose /tmp is a private tmpfs,
# so the shared /tmp is never touched:
#   bwrap --dev-bind / / --tmpfs /tmp --bind <rev-515b> <rev-515b> bash victim_probe.sh <tree> <mode> <racer.mjs> <out>
# It makes a same-user Chrome-named directory directly under the sandbox's /tmp (the victim, standing
# for another Chrome's singleton directory), plants links to its socket, runs the four
# "browser profile cleanup" cases and then the whole unit file with TMPDIR, TMP and TEMP unset
# (os.tmpdir() is /tmp, as in a default npm test or hosted run), and reports whether the victim survived.
#   mode none : plant nothing (control)
#   mode old  : plant /tmp/syzygy-browser-profile/SingletonSocket and /tmp/syzygy-browser-profile-{0..127}/SingletonSocket,
#               the literal paths the four cases passed at 490332aa
#   mode race : run racer.mjs, which watches /tmp and, as soon as a syzygy-profile-* root appears, plants
#               <root>/profile/SingletonSocket and <root>/profile-{0..127}/SingletonSocket (a same-user writer)
set -u
tree="$1"; mode="$2"; racer="$3"; out="$4"
case "$(stat -f -c %T /tmp)" in tmpfs) ;; *) echo "refusing: /tmp is not a private tmpfs"; exit 2;; esac
if [ -n "$(ls -A /tmp | grep -v '^claude-1000$')" ]; then echo "refusing: /tmp is not empty"; ls -A /tmp; exit 2; fi
victim=/tmp/.com.google.Chrome.Victim
reset_victim() {
  rm -rf "$victim"; mkdir -p "$victim" && : > "$victim/SingletonSocket" && echo keep > "$victim/sentinel"
}
plant_old() {
  for p in /tmp/syzygy-browser-profile $(seq -f '/tmp/syzygy-browser-profile-%g' 0 127); do
    rm -rf "$p"; mkdir -p "$p"; ln -s "$victim/SingletonSocket" "$p/SingletonSocket"
  done
}
state() { echo "victim=$( [ -d "$victim" ] && echo present || echo absent ) sentinel=$( [ -f "$victim/sentinel" ] && echo present || echo absent )"; }
cd "$tree" || exit 2
echo "tree $(git rev-parse HEAD) mode $mode"
for pass in four-cases whole-file; do
  reset_victim
  [ "$mode" = old ] && plant_old
  racer_pid=
  if [ "$mode" = race ]; then
    node "$racer" "$victim" "$out.$pass.json" & racer_pid=$!
    for _ in $(seq 1 50); do [ -f "$out.$pass.json.ready" ] && break; sleep 0.1; done
  fi
  echo "== $pass before: $(state) planted-old=$(ls -d /tmp/syzygy-browser-profile* 2>/dev/null | wc -l)"
  if [ "$pass" = four-cases ]; then filter=(-t 'browser profile cleanup'); else filter=(); fi
  env -u TMPDIR -u TMP -u TEMP npx vitest run --project @syzygy/three-surface-poc-app apps/three-surface-poc/src/cdp-browser.test.ts "${filter[@]}" 2>&1 \
    | grep -E 'Tests |Test Files|^ *×|^ *(FAIL|Error|AssertionError)' | sed 's/^/  vitest: /'
  echo "  vitest exit ${PIPESTATUS[0]}"
  if [ -n "$racer_pid" ]; then kill -TERM "$racer_pid"; wait "$racer_pid"; echo "  racer: $(cat "$out.$pass.json")"; fi
  echo "== $pass after: $(state)"
  rm -rf /tmp/syzygy-browser-profile*
done
