# Terminal f043 evidence

[Observed] Both hosted workflows and the local eligible recovery are terminal failures for `f043a10aab6bf3baee0b1acd24c72b78d3654ded`. This packet preserves their raw evidence; it makes no completion claim.

The [payload](payload.tar.gz) retains the original 68 evidence members byte for byte. [Packaging metadata](PACKAGING.json) binds every member and the original manifest. Extract into a scratch directory outside the repository, then read its README and run `sha256sum -c SHA256SUMS` there. Source copies inside the archive are evidence for the historical subject, never live implementation or test inputs.
