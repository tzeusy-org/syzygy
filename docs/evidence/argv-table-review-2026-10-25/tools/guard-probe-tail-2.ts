
// rev-521 probe 2: the exact message for a form only the preprocessor reports (the reverse of the committed export-* row).
describe('rev-521 guard probe 2', () => {
  it('records the disagreement message for a concatenated specifier', () => {
    let message = 'no throw';
    try { edgesOf("await import('@syzygy/' + 'polaris-dossier');\n"); } catch (error) { message = (error as Error).message; }
    fs.writeFileSync(process.env.PROBE_OUT!, JSON.stringify({ message }));
  });
});
