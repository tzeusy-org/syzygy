# Repository scripts

The Python governance tools use the standard library and support Python 3.10
and later. This lets operators check the same records and generated views from
a clean checkout without installing Python packages. PyYAML is used only by
test fixtures. Shared mechanisms live in `syzygy_gov/`; commands keep their
existing paths under `scripts/`.
