#!/bin/bash
# Reviewer's probe for F1 (PR 515). Runs INSIDE a bwrap sandbox whose /tmp is a private tmpfs,
# so the shared /tmp is never touched. Usage (inside the sandbox):
#   fixed_path_probe.sh <clone> <plant: yes|no> <test name>
# It makes a same-user Chrome-named directory directly under the sandbox's /tmp (the victim,
# standing for another Chrome's singleton directory), optionally plants
# /tmp/syzygy-browser-profile/SingletonSocket -> the victim's socket, runs ONE unchanged
# pre-existing test with TMPDIR unset (so os.tmpdir() is /tmp, as in a default npm test run),
# and reports whether the victim survived.
set -u
clone="$1"; plant="$2"; name="$3"
case "$(stat -f -c %T /tmp)" in tmpfs) ;; *) echo "refusing: /tmp is not a private tmpfs"; exit 2;; esac
if [ -n "$(ls -A /tmp | grep -v '^claude-1000$')" ]; then echo "refusing: /tmp is not empty"; ls -A /tmp; exit 2; fi
victim=/tmp/.com.google.Chrome.Victim
mkdir -p "$victim" && : > "$victim/SingletonSocket" && echo keep > "$victim/sentinel"
if [ "$plant" = yes ]; then
  mkdir -p /tmp/syzygy-browser-profile
  ln -s "$victim/SingletonSocket" /tmp/syzygy-browser-profile/SingletonSocket
fi
echo "before: victim=$( [ -d "$victim" ] && echo present || echo absent ) link=$(readlink /tmp/syzygy-browser-profile/SingletonSocket 2>/dev/null || echo none)"
cd "$clone" || exit 2
env -u TMPDIR -u TMP -u TEMP npx vitest run --project @syzygy/three-surface-poc-app apps/three-surface-poc/src/cdp-browser.test.ts -t "$name" 2>&1 | grep -E 'Tests |Test Files|✓|×' | sed 's/^/  vitest: /'
echo "vitest exit ${PIPESTATUS[0]}"
echo "after: victim=$( [ -d "$victim" ] && echo present || echo absent ) sentinel=$( [ -f "$victim/sentinel" ] && echo present || echo absent )"
