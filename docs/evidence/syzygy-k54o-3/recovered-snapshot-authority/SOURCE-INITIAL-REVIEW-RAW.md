REVISE `5feff39ce78537349ab77c315291b70fb46041e4` against `c7395ebde1cb2e065fffff9a8005355aab5591aa`.

[Observed] Both restore loops retain live authority checks before descriptor access and after the snapshot. Byte limits, exact size and digest checks, receipt screening, and failure poisoning remain intact. The withdrawal tests would detect loss of the pre-read check through an extra snapshot call.

[Observed] The poisoning assertion at `url-run-artifacts.test.ts:495` can pass even if poisoning is removed. Both withdrawals occur before initialization, and `latestStageChecks()` also refuses an uninitialized bridge. Use `bridge.metadata()` after restoring the current-authority callback to isolate the poisoning guard.

Source review only. No tests were executed.
