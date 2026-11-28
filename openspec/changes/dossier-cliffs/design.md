# Design

## Reading

[Inferred] The cliffs reuse what the rough-edge markers (v2.44) already trust: the test-name lexer blanks every comment and string interior, so a definition form runs over code text only and a constant written in a comment or inside a string yields no row; the line rule (CR, LF and CRLF, the byte-order mark dropped) and the top-level unit rule are the same functions. Each definition form is anchored to the start of its line and captures a `name` and a `value`; a name pattern decides the row's kind (timeout, threshold, limit, max, default, in that precedence). A value is kept exactly as the line writes it and typed by published value forms only (integer, decimal, boolean, string, expression of literal numbers and arithmetic, and in configuration also null and text). A value no form takes is Unknown `value-not-literal`: Syzygy never evaluates or resolves a name.

Configuration is read by two line grammars, never a parser: an ini form (`.conf`, `.cfg`, `.ini`) and a yaml subset (`values.yaml`, `values.yml`, and `config.example.*` with a yaml extension). A line outside the grammar makes the whole file Unknown `unparsed` with its fault, never read past; anchors, aliases, tags, tabs, unclosed quotes and unclosed flow collections are faults, and a sequence item is counted, not read.

## Reads

[Observed] Every candidate passes the render's screen in the rough-edge markers' disposition order (secret path, vendored or generated path, class gate, read refusal, oversize, secret-detector match, active content), so withheld configuration is Unknown with its reason and its value never reaches the page. Reads are batched 64 paths to a reader call; a refused call is re-read one path at a time, so one refusal touches only its own path. On Syzygy's own tree this read 1,000 candidates in 16 calls rather than 1,000, and the two members were byte-identical (`docs/evidence/syzygy-5dhm-116/`).

## Limitations recorded at this version

- [Observed] Names must be upper snake case; Go's exported `MaxRetries` and Java's camel-case fields yield no row. `DEFAULT_` must begin the name, so `CONFIG_DEFAULT_HZ` yields none.
- [Observed] Under declared-source policy 2.0.0, `.conf`, `.cfg` and `.ini` have no extraction class, so those files are always Unknown `unknown-extraction-class`; the ini grammar is exercised at recognizer level only until a policy successor classes them.
- [Observed] A yaml configuration file is code content: a run with no per-project statement reads it, and a run whose statement does not list code content shows it withheld; `.env.example` is a denied path and is never read.
- [Unknown] JSON, TOML and environment-file configuration, command-line flag defaults and values assembled at run time are not read at this version; the page's note says so, so their absence from the page is not a claim that none exist.
