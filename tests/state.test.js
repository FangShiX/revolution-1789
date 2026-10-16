import test from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  newSave,
  validateSave,
  validateCampaign,
  choiceAvailable,
  rewind,
} from "../src/engine.js";

const fixture = {
  id: "state-fixture",
  rules: { start_section: 1 },
  sections: [
    {
      id: 1,
      text: "Start",
      choices: [{ id: "a", label: "First clue", target: 2 }],
    },
    {
      id: 2,
      text: "First clue",
      choices: [
        { id: "b", label: "Second clue", target: 3 },
        { id: "early", label: "Solve", target: 4, requiresVisited: [2, 3] },
      ],
    },
    {
      id: 3,
      text: "Second clue",
      choices: [{ id: "back", label: "Return", target: 2 }],
    },
    { id: 4, text: "Solved", choices: [], terminal_type: "ending" },
  ],
};
test("puzzle exits require clues on this actual path, including after rewind", () => {
  validateCampaign(fixture);
  const first = advance(newSave(fixture), fixture, "a");
  assert.equal(choiceAvailable(first, fixture.sections[1].choices[1]), false);
  assert.throws(() => advance(first, fixture, "early"));
  const second = advance(advance(first, fixture, "b"), fixture, "back");
  const solved = advance(second, fixture, "early");
  assert.deepEqual(solved.endings, [4]);
  assert.deepEqual(validateSave(solved, fixture), solved);
  const undone = rewind(solved, 1);
  assert.equal(choiceAvailable(undone, fixture.sections[1].choices[1]), false);
  assert.deepEqual(undone.endings, [4]);
});
test("a forged history cannot claim a guarded puzzle transition", () => {
  assert.throws(() =>
    validateSave(
      { ...newSave(fixture), path: [1, 2, 4], decisions: ["a", "early"] },
      fixture,
    ),
  );
});
test("null, missing fields, excessive histories and unexpected metadata reject safely", () => {
  for (const raw of [
    null,
    {},
    [],
    { ...newSave(fixture), path: Array(10001).fill(1) },
  ])
    assert.throws(() => validateSave(raw, fixture));
  for (const field of ["title", "date", "historicalNote"]) {
    const c = structuredClone(fixture);
    c.sections[0][field] = { unexpected: true };
    assert.throws(() => validateCampaign(c));
  }
});
test("unfulfillable prerequisites reject before play", () => {
  const impossible = structuredClone(fixture);
  impossible.sections[0].choices[0].requiresVisited = [2];
  assert.throws(() => validateCampaign(impossible), /死锁/);
});
test("runtime refuses records exceeding the reload-safe maximum", () => {
  const save = { ...newSave(fixture), path: Array(10000).fill(1) };
  assert.throws(() => advance(save, fixture, "a"), /已满/);
});
