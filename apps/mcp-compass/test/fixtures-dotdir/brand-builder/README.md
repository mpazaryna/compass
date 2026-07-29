# Fixture: a real (unfinished) home beside a dot-directory

This root holds `.cache/` and this home, which has no `bearing.yaml`. Because
`.cache` sorts BEFORE `brand-builder`, the bake's complaint names whichever it
scanned first — so the error message reveals whether dot-directories are being
skipped. It must name this home, never `.cache`.
