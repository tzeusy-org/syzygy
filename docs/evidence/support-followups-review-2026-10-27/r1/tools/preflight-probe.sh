#!/usr/bin/env bash
# Reviewer probe for PR #538 item 3: run the install preflight as it stands at three commits
# (f7477f52^1 before #530, f7477f52 the base, 663061c4 the head) against install states of one clone,
# and show whether each state can build the generator (npm run build:poc). Restores the support link after.
# Usage: preflight-probe.sh <clone with node_modules, checked out at the head> <private tmpdir>
set -u
clone=$1; tmp=$2
mkdir -p "$tmp"
for c in f7477f52^1 f7477f52 663061c4; do
  git -C "$clone" show "$c:scripts/check_generator_install.mjs" > "$tmp/preflight-${c/^1/-parent}.mjs"
done
link="$clone/node_modules/@syzygy/support"
target=$(readlink "$link")
run_all() {
  local state=$1
  for c in f7477f52-parent f7477f52 663061c4; do
    err=$( cd "$clone" && node "$tmp/preflight-$c.mjs" 2>&1 >/dev/null ); code=$?
    printf 'state=%s preflight@%s exit=%s stderr=%q\n' "$state" "$c" "$code" "$err"
  done
}
build() {
  local state=$1
  ( cd "$clone" && TMPDIR="$tmp" npm run build:poc --silent > "$tmp/build-$state.log" 2>&1 ); code=$?
  printf 'state=%s build:poc exit=%s first-error=%q\n' "$state" "$code" "$(grep -m1 -E 'error|Error' "$tmp/build-$state.log")"
}
run_all linked
build linked
rm "$link"
run_all absent
build absent
ln -s "$target" "$link.dangling-target-check" && rm "$link.dangling-target-check"
ln -s ../../packages/does-not-exist "$link"
run_all dangling-link
rm "$link"
mkdir "$link"
run_all empty-directory
build empty-directory
rmdir "$link"
ln -s "$target" "$link"
run_all restored
ls -la "$link"
