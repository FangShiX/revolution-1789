export const SAVE_VERSION = 1;
export const MAX_PATH_LENGTH = 10000;
export function validateCampaign(input) {
  if (
    !input ||
    !Array.isArray(input.sections) ||
    !input.sections.length ||
    input.sections.length > 2000
  )
    throw new Error("剧情必须包含 1–2000 个节点。");
  if (typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(input.id))
    throw new Error("剧本标识必须是字母、数字、下划线或短横线。");
  if (input.title !== undefined && typeof input.title !== "string")
    throw new Error("剧本标题必须为文字。");
  const ids = new Set();
  for (const n of input.sections) {
    if (!n || typeof n !== "object") throw new Error("节点格式无效。");
    if (!Number.isSafeInteger(n.id) || ids.has(n.id))
      throw new Error("节点编号无效或重复。");
    ids.add(n.id);
    if (
      typeof n.text !== "string" ||
      n.text.length > 60000 ||
      !Array.isArray(n.choices)
    )
      throw new Error(`节点 ${n.id} 格式无效。`);
    for (const field of ["title", "date", "historicalNote"]) {
      if (n[field] !== undefined && typeof n[field] !== "string")
        throw new Error(`节点 ${n.id} 的 ${field} 必须为文字。`);
    }
    if (
      n.sourceIds !== undefined &&
      (!Array.isArray(n.sourceIds) ||
        n.sourceIds.some((id) => typeof id !== "string"))
    )
      throw new Error(`节点 ${n.id} 的来源格式无效。`);
    if (n.terminal_type != null && typeof n.terminal_type !== "string")
      throw new Error(`节点 ${n.id} 的结局标记无效。`);
  }
  for (const n of input.sections) {
    const cs = new Set();
    for (const c of n.choices) {
      if (
        !c ||
        typeof c.id !== "string" ||
        cs.has(c.id) ||
        typeof c.label !== "string" ||
        !c.label.trim() ||
        !ids.has(c.target)
      )
        throw new Error(`节点 ${n.id} 存在无效选项。`);
      cs.add(c.id);
    }
    if (!n.choices.length && !n.terminal_type)
      throw new Error(`节点 ${n.id} 没有出口或结局标记。`);
  }
  if (!ids.has(input.rules?.start_section)) throw new Error("剧情起点不存在。");
  if (
    input.sources &&
    (!Array.isArray(input.sources) ||
      input.sources.some(
        (s) =>
          !s ||
          typeof s.id !== "string" ||
          typeof s.title !== "string" ||
          typeof s.url !== "string" ||
          !s.url.startsWith("https://"),
      ))
  )
    throw new Error("资料链接必须使用 HTTPS。");
  for (const n of input.sections)
    for (const c of n.choices)
      if (
        c.requiresVisited &&
        (!Array.isArray(c.requiresVisited) ||
          c.requiresVisited.some((id) => !ids.has(id)))
      )
        throw new Error("选择的前置节点无效。");
  if (
    input.sections.some((n) => n.choices.some((c) => c.requiresVisited?.length))
  ) {
    const audit = guardedReachability(input);
    if (audit.truncated)
      throw new Error("剧本前置关系过于复杂，无法可靠验证。");
    if (audit.deadlocks.length)
      throw new Error(`节点 ${audit.deadlocks[0]} 存在线索前置死锁。`);
  }
  return input;
}
export function choiceAvailable(s, ch) {
  return (
    !ch.requiresVisited || ch.requiresVisited.every((id) => s.path.includes(id))
  );
}
export function newSave(c) {
  return {
    version: SAVE_VERSION,
    campaignId: c.id,
    path: [c.rules.start_section],
    decisions: [],
    bookmarks: [],
    endings: [],
  };
}
export function validateSave(raw, c) {
  if (
    !raw ||
    raw.version !== SAVE_VERSION ||
    raw.campaignId !== c.id ||
    !Array.isArray(raw.path) ||
    !Array.isArray(raw.decisions) ||
    raw.path.length < 1 ||
    raw.path.length > MAX_PATH_LENGTH ||
    raw.path[0] !== c.rules.start_section ||
    raw.decisions.length !== raw.path.length - 1
  )
    throw new Error("存档格式无效或不属于当前剧本。");
  const nodes = new Map(c.sections.map((n) => [n.id, n]));
  if (raw.path.some((id) => !Number.isSafeInteger(id) || !nodes.has(id)))
    throw new Error("存档节点无效。");
  for (let i = 0; i < raw.decisions.length; i++) {
    const from = nodes.get(raw.path[i]);
    if (
      from.terminal_type ||
      !from.choices.some(
        (ch) =>
          ch.id === raw.decisions[i] &&
          ch.target === raw.path[i + 1] &&
          choiceAvailable({ path: raw.path.slice(0, i + 1) }, ch),
      )
    )
      throw new Error("存档包含非法跳转。");
  }
  const list = (a) =>
    Array.isArray(a)
      ? [...new Set(a.filter((id) => nodes.has(id)))].slice(0, 2000)
      : [];
  return {
    ...newSave(c),
    path: [...raw.path],
    decisions: [...raw.decisions],
    bookmarks: list(raw.bookmarks),
    endings: list(raw.endings).filter((id) => nodes.get(id).terminal_type),
  };
}
export function advance(s, c, choiceId) {
  if (s.path.length >= MAX_PATH_LENGTH)
    throw new Error("旅程记录已满，请先导出存档，再回退或重新开始。");
  const n = c.sections.find((n) => n.id === s.path.at(-1));
  const ch = n?.choices.find((ch) => ch.id === choiceId);
  if (!ch || n.terminal_type || !choiceAvailable(s, ch))
    throw new Error("当前选择无效。");
  const target = c.sections.find((n) => n.id === ch.target);
  return {
    ...s,
    path: [...s.path, ch.target],
    decisions: [...s.decisions, ch.id],
    endings: target.terminal_type
      ? [...new Set([...s.endings, target.id])]
      : s.endings,
  };
}
export function rewind(s, i) {
  if (!Number.isInteger(i) || i < 0 || i >= s.path.length) return s;
  return {
    ...s,
    path: s.path.slice(0, i + 1),
    decisions: s.decisions.slice(0, i),
  };
}
export function graphAudit(c) {
  const walk = (starts, edges) => {
    const seen = new Set(),
      todo = [...starts];
    while (todo.length) {
      const id = todo.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      todo.push(...(edges.get(id) || []));
    }
    return seen;
  };
  const forward = new Map(
    c.sections.map((n) => [
      n.id,
      n.terminal_type ? [] : n.choices.map((ch) => ch.target),
    ]),
  );
  const reverse = new Map(c.sections.map((n) => [n.id, []]));
  for (const [id, ts] of forward) for (const t of ts) reverse.get(t)?.push(id);
  const reach = walk([c.rules.start_section], forward),
    ends = c.sections.filter((n) => n.terminal_type).map((n) => n.id),
    canEnd = walk(ends, reverse);
  return {
    nodes: c.sections.length,
    edges: [...forward.values()].reduce((s, t) => s + t.length, 0),
    endings: ends.length,
    unreachable: c.sections.filter((n) => !reach.has(n.id)).map((n) => n.id),
    cannotEnd: c.sections.filter((n) => !canEnd.has(n.id)).map((n) => n.id),
    prerequisites: guardedReachability(c),
  };
}

function guardedReachability(c) {
  const relevant = [
    ...new Set(
      c.sections.flatMap((n) =>
        n.choices.flatMap((ch) => ch.requiresVisited || []),
      ),
    ),
  ];
  if (relevant.length > 12)
    return { truncated: true, deadlocks: [], unreachable: [] };
  const bits = new Map(relevant.map((id, i) => [id, 1 << i]));
  const nodes = new Map(c.sections.map((n) => [n.id, n]));
  const start = c.rules.start_section,
    queue = [[start, bits.get(start) || 0]],
    seen = new Set(),
    reachable = new Set(),
    deadlocks = new Set();
  for (let i = 0; i < queue.length; i++) {
    if (seen.size > 200000 || queue.length > 400000)
      return { truncated: true, deadlocks: [...deadlocks], unreachable: [] };
    const [id, mask] = queue[i],
      key = `${id}:${mask}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reachable.add(id);
    const node = nodes.get(id);
    if (node.terminal_type) continue;
    const available = node.choices.filter((ch) =>
      (ch.requiresVisited || []).every((required) => mask & bits.get(required)),
    );
    if (!available.length) deadlocks.add(id);
    for (const ch of available)
      queue.push([ch.target, mask | (bits.get(ch.target) || 0)]);
  }
  return {
    truncated: false,
    states: seen.size,
    deadlocks: [...deadlocks],
    unreachable: c.sections
      .filter((n) => !reachable.has(n.id))
      .map((n) => n.id),
  };
}
