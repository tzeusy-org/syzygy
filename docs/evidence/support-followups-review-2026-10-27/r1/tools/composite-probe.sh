#!/usr/bin/env bash
# Reviewer probe for PR #538: the user-facing commands that run the install preflight (npm run poc:dossier, poc:generator-demo),
# in one clone with node_modules/@syzygy/support removed, then restored. The build fails before any generator code runs when the
# preflight passes, so nothing is generated. Usage: composite-probe.sh <clone> <label> <private tmpdir>
set -u
clone=$1; label=$2; tmp=$3
mkdir -p "$tmp"
link="$clone/node_modules/@syzygy/support"
target=$(readlink "$link")
rm "$link"
for script in poc:dossier poc:generator-demo; do
  ( cd "$clone" && TMPDIR="$tmp" npm run --silent "$script" > "$tmp/$script.out" 2> "$tmp/$script.err" ); code=$?
  printf '%s %s support-link-absent exit=%s stderr-first=%q stderr-lines=%s\n' "$label" "$script" "$code" "$(head -1 "$tmp/$script.err")" "$(wc -l < "$tmp/$script.err")"
done
ln -s "$target" "$link"
ls -la "$link" | sed 's/.* -> /restored -> /'
