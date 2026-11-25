/** Package-private metadata Git boundary. Policy parsing, live-ref ordering,
 * working snapshots and final named-file checks stay with their callers. */
export interface PolicyGitOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly maxBuffer: number;
  readonly timeout: number;
  readonly input?: string | Buffer;
}
export interface PolicyGitExecutor {
  runSync(args: readonly string[], options: PolicyGitOptions): Buffer;
  runAsync(args: readonly string[], options: PolicyGitOptions): Promise<Buffer>;
}
export interface PolicyGitReceipt {
  readonly stdout: Buffer;
  readonly usageComplete: boolean;
  readonly reason: number;
  readonly status: number;
  readonly signal: number;
  readonly userMicroseconds: number;
  readonly systemMicroseconds: number;
}
export type PolicyGitUsage = Omit<PolicyGitReceipt, 'stdout'>;
export interface PendingPolicyGit {
  readonly completion: Promise<PolicyGitReceipt>;
  /** Joins native work, never its main-thread Promise callback. */
  settleSync(): PolicyGitUsage;
  /** Release held images only after the owning scope has accounted and removed
   * this call's unsettled receipt. Must be idempotent; failure poisons scope. */
  close(): void;
}
export interface PolicyGitScope extends PolicyGitExecutor {
  /** Known, completed helper-tree CPU only. Unknown usage permanently poisons
   * this scope. The host's own CPU is sampled independently by its run clock. */
  childCpuMicroseconds(): number;
  cpuClock(): number;
  /** No awaits between this idle check and creating the run pool baseline. */
  initialSpent(): number;
  healthy(): boolean;
  /** Join existing calls while terminal authority checks still own this scope. */
  drain(): Promise<boolean>;
  close(): Promise<boolean>;
}

/** Complete each child's charge before returning its output or failure. A
 * failing Git command still consumed CPU; an incomplete receipt is not zero. */
export function createPolicyGitScope(transport: {
  runSync(args: readonly string[], options: PolicyGitOptions): PolicyGitReceipt;
  runAsync(args: readonly string[], options: PolicyGitOptions): PendingPolicyGit;
  close(): void;
}, hostCpu: () => number = () => { const value = process.cpuUsage(); return value.user + value.system; }): PolicyGitScope {
  let total = 0, poisoned = false, closed = false, active = 0;
  const pending = new Set<Promise<unknown>>();
  const available = (): void => { if (poisoned || closed) throw new Error('policy-git-unavailable'); };
  const childCpuMicroseconds = (): number => {
    if (poisoned) throw new Error('policy-git-usage-unavailable');
    return total;
  };
  type Charge = { usage?: PolicyGitUsage; readonly settleSync?: () => PolicyGitUsage };
  const unsettled = new Set<Charge>();
  const account = (charge: Charge, receipt: PolicyGitUsage): void => {
    const { userMicroseconds: user, systemMicroseconds: system } = receipt;
    if (!receipt.usageComplete || !Number.isSafeInteger(user) || user < 0
      || !Number.isSafeInteger(system) || system < 0 || charge.usage !== undefined
        && (charge.usage.userMicroseconds !== user || charge.usage.systemMicroseconds !== system
          || charge.usage.reason !== receipt.reason || charge.usage.status !== receipt.status || charge.usage.signal !== receipt.signal)) {
      poisoned = true; throw new Error('policy-git-usage-unavailable');
    }
    if (charge.usage !== undefined) return;
    if (!Number.isSafeInteger(total + user + system)) { poisoned = true; throw new Error('policy-git-usage-unavailable'); }
    charge.usage = { usageComplete: true, userMicroseconds: user, systemMicroseconds: system,
      reason: receipt.reason, status: receipt.status, signal: receipt.signal };
    total += user + system;
  };
  const finish = (receipt: PolicyGitReceipt): Buffer => {
    if (receipt.reason !== 0 || receipt.status !== 0 || receipt.signal !== 0) throw new Error('policy-git-failed');
    return receipt.stdout;
  };
  const failedTransport = (error: unknown): never => { poisoned = true; throw error; };
  const drain = async (): Promise<boolean> => {
    while (pending.size > 0) await Promise.allSettled([...pending]);
    return !poisoned && active === 0;
  };
  return Object.freeze({
    runSync(args: readonly string[], options: PolicyGitOptions): Buffer {
      available(); active++;
      try {
        let receipt: PolicyGitReceipt;
        try { receipt = transport.runSync(args, options); } catch (error) { return failedTransport(error); }
        account({}, receipt);
        return finish(receipt);
      } finally { active--; }
    },
    runAsync(args: readonly string[], options: PolicyGitOptions): Promise<Buffer> {
      available(); active++;
      let call: PendingPolicyGit;
      try { call = transport.runAsync(args, options); }
      catch (error) { active--; poisoned = true; return Promise.reject(error); }
      const charge: Charge = { settleSync: () => call.settleSync() };
      unsettled.add(charge);
      const release = (): void => {
        unsettled.delete(charge);
        try { call.close(); } catch (error) { failedTransport(error); }
      };
      const result = call.completion.then(receipt => {
        try { account(charge, receipt); return finish(receipt); }
        finally { release(); }
      }, error => { try { return failedTransport(error); } finally { release(); } });
      pending.add(result);
      void result.then(() => { active--; pending.delete(result); }, () => { active--; pending.delete(result); });
      return result;
    },
    childCpuMicroseconds,
    cpuClock(): number {
      // No JS admission can interleave this turn. Native workers finish and
      // signal independently of their main-thread Promise callbacks, including
      // already admitted queued jobs. A clock query can block for their fixed
      // lifetime/drain; it never guesses live CPU or grants another allowance.
      try { for (const charge of unsettled) if (charge.usage === undefined) account(charge, charge.settleSync!()); }
      catch (error) { return failedTransport(error); }
      // Sample host CPU after joining: native worker and join overhead belong
      // to the host; helper-tree wait4 usage is the separate completed charge.
      const value = hostCpu() + childCpuMicroseconds();
      if (!Number.isSafeInteger(value) || value < 0) { poisoned = true; throw new Error('policy-git-clock-unavailable'); }
      return value;
    },
    initialSpent(): number { if (active !== 0 || closed) throw new Error('policy-git-not-idle'); return childCpuMicroseconds(); },
    healthy: () => !poisoned && !closed,
    drain,
    async close(): Promise<boolean> {
      closed = true;
      const settled = await drain();
      transport.close();
      return settled;
    },
  });
}
