/** What a dossier step returns: its report, or the refusal that stopped it (syzygy-bpyt.8.2). */
export type Outcome<R, F> = { readonly ok: true; readonly report: R } | { readonly ok: false; readonly refusal: F };
