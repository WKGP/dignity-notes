import test from "node:test";
import assert from "node:assert/strict";
import { bump, CAP, parse } from "./bump.mjs";

test("carry table", () => {
  assert.deepEqual(bump([1, 2, 23], "patch"), [1, 2, 24]);
  assert.deepEqual(bump([1, 2, 24], "patch"), [1, 3, 0]);
  assert.deepEqual(bump([1, 24, 24], "patch"), [2, 0, 0]);
  assert.deepEqual(bump([1, 24, 7], "minor"), [2, 0, 0]);
  assert.deepEqual(bump([24, 24, 24], "patch"), [25, 0, 0]);
  assert.deepEqual(bump([1, 2, 3], "minor"), [1, 3, 0]);
  assert.deepEqual(bump([1, 2, 3], "major"), [2, 0, 0]);
});

test("no digit below the first ever exceeds the cap", () => {
  for (const kind of ["patch", "minor", "major"])
    for (let minor = 0; minor <= CAP; minor++)
      for (let patch = 0; patch <= CAP; patch++) {
        const [, m, p] = bump([1, minor, patch], kind);
        assert.ok(m >= 0 && m <= CAP, `${kind} 1.${minor}.${patch} -> minor ${m}`);
        assert.ok(p >= 0 && p <= CAP, `${kind} 1.${minor}.${patch} -> patch ${p}`);
      }
});

test("parse and unknown kind", () => {
  assert.deepEqual(parse("1.2.3"), [1, 2, 3]);
  assert.throws(() => parse("1.2"));
  assert.throws(() => bump([1, 0, 0], "tiny"));
});
