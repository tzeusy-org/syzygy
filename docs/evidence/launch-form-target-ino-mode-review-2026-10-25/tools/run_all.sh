#!/bin/sh
# rev-526: run the mutant groups for one file system in one clone. Usage: run_all.sh <clone> <tmp root> <label>
set -u
R=/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-526
C=$1; T=$2; L=$3; H=74dc0eb9f3b912b9a89e8db456edd687edbda6ff
X3C=X3c-target-replaced-by-identical-copy-no-realpath; X3D=X3d-target-replaced-by-copy-mode-0644-no-realpath; X5=X5-target-unlinked-then-rewritten
O1=O1-same-bytes-rewrite; O8=O8-link-target-chmod-cycle-rewrite
Y1=Y1-target-copyfile-renamed-over; Y2=Y2-target-chmod-to-current-mode; Y3=Y3-target-unlinked-rewritten-0644; Y4=Y4-target-hard-link-left; Y5=Y5-target-link-rename-unlink-same-inode
python3 -I $R/tools/rev526_mutants.py $C $H $T/g1 $R/mutants-g1-$L.json 10 "unmutated@fix,$X3C@base,$X3C@fix,$X3D@base,$X3D@fix,$X5@base,$X5@fix,$X3C@fix-noIno"
echo "g1 exit=$?"
python3 -I $R/tools/rev526_mutants.py $C $H $T/g2 $R/mutants-g2-$L.json 5 "$X3D@fix-noIno,$X3D@fix-noMode,$Y3@fix-noMode,$Y3@fix-noIno,$Y1@fix-noIno,$O1@fix,$O8@fix,$Y1@fix,$Y2@fix,$Y3@fix,$Y4@fix,$Y5@fix"
echo "g2 exit=$?"
python3 -I $R/tools/rev526_mutants.py $C $H $T/g3 $R/mutants-g3-$L.json 3 "$X3C@pre,$X3D@pre,$X5@pre,$Y1@base,$Y2@base,$Y3@base,$Y4@base,$Y5@base"
echo "g3 exit=$?"
echo ALLDONE
