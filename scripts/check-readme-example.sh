#!/usr/bin/env bash
# Checks that the "How to add a lesson" example in README.md really works:
# pastes the README's word and lesson into the content files, runs the content
# test and the type check, then always puts the files back.
# Exit code 0 = the example passes; anything else = it doesn't.
set -u
cd "$(dirname "$0")/.."

WORDS=src/content/words.ts
UNITS=src/content/g1/units.ts
LAB=src/content/lab.ts
BAK=$(mktemp -d)
cp "$WORDS" "$BAK/words.ts"
cp "$UNITS" "$BAK/units.ts"
cp "$LAB" "$BAK/lab.ts"
restore() {
  cp "$BAK/words.ts" "$WORDS"
  cp "$BAK/units.ts" "$UNITS"
  cp "$BAK/lab.ts" "$LAB"
  rm -rf "$BAK"
}
trap restore EXIT

python3 - <<'EOF' || exit 2
import re
readme = open('README.md').read()
blocks = re.findall(r"```ts\n(.*?)```", readme, re.S)
word, lesson = blocks[0].strip(), blocks[1].rstrip()
w = open('src/content/words.ts').read()
anchor = "export const words: Word[] = [\n"
assert anchor in w, 'word list anchor not found'
open('src/content/words.ts', 'w').write(w.replace(anchor, anchor + "  " + word + "\n", 1))
u = open('src/content/g1/units.ts').read()
i = u.index("  lessons: [\n") + len("  lessons: [\n")
u = u[:i] + "\n".join("    " + l for l in lesson.splitlines()) + "\n" + u[i:]
open('src/content/g1/units.ts', 'w').write(u)
lab_line = blocks[2].strip()
l = open('src/content/lab.ts').read()
anchor = "export const LAB_OBJECTS: LabObject[] = [\n"
assert anchor in l, 'LAB_OBJECTS anchor not found'
open('src/content/lab.ts', 'w').write(l.replace(anchor, anchor + "  " + lab_line + "\n", 1))
print('README example pasted in:', word, '+', lab_line)
EOF

grep -q "g1-kite-1" "$UNITS" || { echo "FAIL: example lesson was not inserted"; exit 3; }

npx vitest run src/content || { echo "FAIL: content test rejects the README example"; exit 4; }
npx tsc -p tsconfig.app.json --noEmit || { echo "FAIL: README example does not type-check"; exit 5; }

restore
trap - EXIT
if grep -q "kite" "$WORDS" "$UNITS" "$LAB"; then
  echo "FAIL: files were not restored"
  exit 6
fi
echo "OK: the README lesson example passes the content test and the type check (files restored)."
