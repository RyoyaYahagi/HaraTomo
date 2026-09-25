import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type EvalCase = {
  id: string;
  smoke: boolean;
  today: string;
  input: string;
  expected: Array<{
    type: string;
    date?: string;
    time?: string;
    normalizedLabel?: string;
    severity?: number | null;
    labelIncludesAny?: string[];
    needsClarification?: boolean;
  }>;
};

const cases = JSON.parse(
  readFileSync(new URL("../eval/cases.json", import.meta.url), "utf8"),
) as EvalCase[];

test("AI eval dataset has 20 unique cases and exactly 5 smoke cases", () => {
  assert.equal(cases.length, 20);
  assert.equal(cases.filter((item) => item.smoke).length, 5);
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);
});

test("AI eval cases have valid fixed dates and supported event types", () => {
  const eventTypes = new Set(["meal", "symptom", "context", "other"]);

  for (const item of cases) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.match(item.today, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.input.trim().length > 0);

    for (const expected of item.expected) {
      assert.ok(eventTypes.has(expected.type), `${item.id}: unsupported type`);
      if (expected.date !== undefined) assert.match(expected.date, /^\d{4}-\d{2}-\d{2}$/);
      if (expected.time !== undefined && expected.time !== "") {
        assert.match(expected.time, /^\d{2}:\d{2}$/);
      }
      if (expected.labelIncludesAny !== undefined) {
        assert.ok(expected.labelIncludesAny.length > 0);
      }
    }
  }
});
