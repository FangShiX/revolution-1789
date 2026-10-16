import test from "node:test";
import assert from "node:assert/strict";
import { campaign } from "../src/data/publicCampaign.js";
import {
  validateCampaign,
  newSave,
  advance,
  rewind,
  validateSave,
  graphAudit,
} from "../src/engine.js";
test("every public chapter is reachable and can reach an ending", () => {
  validateCampaign(campaign);
  const report = graphAudit(campaign);
  assert.deepEqual(report.unreachable, []);
  assert.deepEqual(report.cannotEnd, []);
  assert(report.nodes >= 40);
  assert(report.endings >= 6);
  console.log(report);
});
test("every edge is playable and each ending refuses further moves", () => {
  for (const node of campaign.sections) {
    const s = { ...newSave(campaign), path: [node.id] };
    for (const ch of node.choices) {
      const next = advance(s, campaign, ch.id);
      assert.equal(next.path.at(-1), ch.target);
    }
    if (node.terminal_type)
      assert.throws(() => advance(s, campaign, "invalid"));
  }
});
test("saves replay valid decisions and reject forged paths", () => {
  const initial = newSave(campaign),
    ch = campaign.sections.find((n) => n.id === initial.path[0]).choices[0];
  const next = advance(initial, campaign, ch.id);
  assert.deepEqual(
    validateSave(JSON.parse(JSON.stringify(next)), campaign),
    next,
  );
  assert.deepEqual(rewind(next, 0).path, initial.path);
  assert.throws(() =>
    validateSave({ ...next, path: [{}, ch.target] }, campaign),
  );
  assert.throws(() =>
    validateSave({ ...next, decisions: ["forged"] }, campaign),
  );
  assert.throws(() => validateSave({ ...next, campaignId: "other" }, campaign));
});
test("imported campaigns reject duplicate IDs, dangling targets and dead ends", () => {
  const clone = () => JSON.parse(JSON.stringify(campaign));
  const duplicate = clone();
  duplicate.sections.push(duplicate.sections[0]);
  assert.throws(() => validateCampaign(duplicate));
  const bad = clone();
  bad.sections[0].choices[0].target = -100;
  assert.throws(() => validateCampaign(bad));
  const dead = clone();
  dead.sections[0].choices = [];
  assert.throws(() => validateCampaign(dead));
  const metadata = clone();
  metadata.sections[0].title = { invalid: true };
  assert.throws(() => validateCampaign(metadata));
  const unsafeSource = clone();
  unsafeSource.sources = [
    { id: "bad", title: "bad", url: "javascript:alert(1)" },
  ];
  assert.throws(() => validateCampaign(unsafeSource));
});

test("1000 seeded playthroughs terminate without invalid transitions", () => {
  let seed = 1789;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let run = 0; run < 1000; run++) {
    let save = newSave(campaign),
      node = campaign.sections.find((n) => n.id === save.path.at(-1)),
      steps = 0;
    while (!node.terminal_type && steps < 200) {
      const choice = node.choices[Math.floor(random() * node.choices.length)];
      save = advance(save, campaign, choice.id);
      node = campaign.sections.find((n) => n.id === save.path.at(-1));
      steps++;
    }
    assert(node.terminal_type, `Run ${run} failed to end`);
    validateSave(save, campaign);
  }
});
