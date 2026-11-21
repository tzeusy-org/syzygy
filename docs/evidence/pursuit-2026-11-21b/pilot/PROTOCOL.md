# Pilot of R1 slice 3: the stored Redis dossier against a plain session

Written 2026-11-21 before any arm ran. A pilot, not a benchmark pass: one repository, one
stored dossier run, model readers and a model grader, no human. By the plan's own rule its
result reads "uncalibrated" and cannot carry a claim that Polaris wins. It can show a loss.

## Inputs

- `tree/`: redis/redis at the commit the stored runs pinned, restricted to files the dossier's
  screen admits whole (equal reach: the plain arm reads no more than the dossier's author
  could). `manifest.json` gives the counts.
- `dossier/`: the newest stored site (run 658f2f90, site 1) as plain text.

## Sessions (each fresh; none sees another's output except as stated)

1. **Key.** Reads `tree/` only. Writes `key.json`: 24 questions a new engineer would need
   answered, four in each of six kinds (what it is and is for; how the parts fit; how one
   mechanism works step by step; why it is built this way and what it costs; where to change
   something; limits and failure). Each has a model answer, the facts an answer must contain
   (2 to 4 each) and the file and lines that support it. Never sees the dossier.
2. **Plain author.** Reads `tree/` only. Prompt: "Explain this repository to an engineer who is
   new to it. Write the most useful synthesis you can." One session, no follow-up. Writes
   `plain.md`. Never sees the key or the dossier.
3. **Reader D** answers the 24 questions from `dossier/` only. **Reader P** answers from
   `plain.md` only. Neither may open `tree/`. An answer the artifact does not support is
   written "not stated".
4. **Reader T** (the hardest opponent: a plain session asked the questions directly) answers
   the 24 questions with `tree/` open and no artifact.
5. **Grader.** Gets the key and the three answer sets under shuffled labels A, B, C. Scores
   each required fact present and correct (1), partly (0.5), absent or wrong (0); a wrong
   statement is also counted as an error. Never told which arm is which.
6. **Claim checker.** Takes every tenth sentence that states a fact about the code from
   `dossier/` and from `plain.md` (to 30 each), and checks each against `tree/`: supported,
   contradicted, not found. Labels are shuffled.

## Fixed before the results

- Reported per arm: share of required facts given, wrong statements, "not stated" count, per
  question kind; claim checks per artifact; words in each artifact.
- The dossier "holds its own" only if its fact share is at least 0.9 of the plain synthesis's
  and its contradicted-or-not-found claim rate is at most half the plain synthesis's. Anything
  else is reported as a loss on the named dimension.
- Reader T is reported beside both; an artifact that scores below T by more than 0.1 has not
  justified being read in place of asking.
- Known limits, stated with the result: questions come from a session that read the code, so
  they favour what the code shows; grader and readers are the same model family; n is one.
