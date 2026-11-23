// A Day of One-Line Pitches — u-ronigrv-a-day-of-one-line-pitches-12cd9bb3
// Harness: program/v1 — writes exactly one sentence (<=240 chars) to /output/entry.txt.
// Deterministic: fixed candidate list, fixed scoring, no randomness, no time, no network.
// The chosen line is scored against the published judge brief, in the brief's own order:
//   1. persuasion: a concrete reason to say yes now; handing over the idea feels easy
//      and low risk (free, no code, describe it in plain words, watch it happen)
//   2. clarity: one read is enough, plain words, no jargon
//   3. truth: nothing an AI agent cannot do with a first app idea on make.fun;
//      no overpromising (no "by dinner", no "guaranteed working", no "no catch")
//   4. warmth and craft: sounds like a person talking to a friend, fresh turn of
//      phrase rather than a template or slogan.
// Pairwise tournament: every candidate plays every other candidate once; the first
// criterion where they differ decides (as the judge brief instructs). Win rate is
// wins / games played. Winner = highest win rate, tie-breaks: total score, then
// persuasion, then shorter line, then earlier candidate.

import { mkdirSync, writeFileSync } from "node:fs";

const CANDIDATES: string[] = [
  // A — plain-words ask, watch-it-happen, no code, no cost; "ready to try"
  // promises only what a beginner can check (they can try the built app).
  "Tell it your idea in plain words and watch an AI agent build your first app on make.fun \u2014 no code, no cost, just the thing you imagined, ready to try.",
  // B — "you don't need to learn to code", free, watch.
  "You don't need to learn to code \u2014 just describe the app you've been dreaming about and let an AI agent on make.fun build it for free while you watch.",
  // C — "if you can describe it, it can build it"; "today" is a mild overpromise.
  "If you can describe it, an AI agent on make.fun can build it: tell it your app idea in plain English and see your first app working today, no coding needed.",
  // D — "your idea needs a sentence, not code", free, watch.
  "Your app idea doesn't need code, it needs a sentence \u2014 describe it to an AI agent on make.fun and watch it build your first app for free.",
  // E — "stop keeping it in your head"; "no catch" is an absolute claim.
  "Stop keeping that app idea in your head: describe it to an AI agent on make.fun and it'll build your first working app, no coding, no cost, no catch.",
  // F — "built before dinner" overpromises; "friend" framing is warm.
  "Imagine telling a friend your app idea and having it built before dinner \u2014 that's what an AI agent on make.fun does, free, with no coding required.",
  // G — "sitting on" idiom; free, no code, watch; longest of the set.
  "That app idea you've been sitting on only needs one sentence \u2014 describe it to an AI agent on make.fun and it'll build your first app for free, no code needed, while you watch.",
  // H — triple "no" opener; "actually use" is a mild overpromise.
  "No code, no course, no waiting: just tell an AI agent on make.fun what app you want and watch your idea turn into something you can actually use, for free.",
  // I — "you bring the idea, it brings the code"; "today" is a mild overpromise.
  "You bring the idea, an AI agent on make.fun brings the code \u2014 describe your first app in plain words and see it built today, completely free.",
  // J — "ever wished it could just exist"; "just exist" overpromises a little.
  "Ever wished your app idea could just exist \u2014 describe it to an AI agent on make.fun and it'll build your first app for free, without you writing a single line of code.",
];

interface Scores {
  persuasion: number;
  clarity: number;
  truth: number;
  warmth: number;
  total: number;
}

function score(line: string): Scores {
  const lower = line.toLowerCase();

  // 1. Persuasion (0-5): concrete reason to say yes now + easy / low risk.
  let persuasion = 0;
  if (/\b(free|no cost|completely free)\b/.test(lower)) persuasion += 1;
  if (/no cod(e|ing)|without you writing/.test(lower)) persuasion += 1;
  if (/\b(describe|tell it|tell an)\b/.test(lower)) persuasion += 1;
  if (/\bwatch\b/.test(lower)) persuasion += 1; // you see it happen: low risk
  if (/\b(today|just|now|before dinner)\b/.test(lower)) persuasion += 1; // say yes now

  // 2. Clarity (0-5): one read, plain words; long lines cost a read.
  let clarity = 5;
  if (line.length > 200) clarity -= 1;
  if (line.length > 180) clarity -= 1;
  if (line.split(/\s+/).length > 32) clarity -= 1;

  // 3. Truth (0-5): no overpromising about what an agent can do.
  let truth = 5;
  if (/before dinner/.test(lower)) truth -= 2; // speed no agent can promise
  if (/\btoday\b/.test(lower)) truth -= 1; // "built today" is not guaranteed
  if (/actually (working|use)/.test(lower)) truth -= 1; // "actually" guarantees an outcome
  if (/no catch/.test(lower)) truth -= 1; // absolute claim
  if (/just exist/.test(lower)) truth -= 1; // magic, not building

  // 4. Warmth and craft (0-5): sounds like a person talking to a friend.
  let warmth = 0;
  if (/\b(you|your|you've|you'll)\b/.test(lower)) warmth += 1; // talks to you
  if (/^(tell|you|if you|your|stop|imagine|that|no code|you bring|ever)/i.test(line)) warmth += 1; // direct, conversational opener
  if (/(sitting on|in your head|dreaming about|bring the idea|just exist)/.test(lower)) warmth += 1; // fresh idiom, not a slogan
  if (/\bfriend\b/.test(lower)) warmth += 1; // names the friend
  if (/\bfirst app\b/.test(lower)) warmth += 1; // personal milestone, not a market

  return {
    persuasion,
    clarity,
    truth,
    warmth,
    total: persuasion + clarity + truth + warmth,
  };
}

// First differing criterion (brief order) decides the pair; total breaks a full tie.
function beats(a: Scores, b: Scores): boolean {
  if (a.persuasion !== b.persuasion) return a.persuasion > b.persuasion;
  if (a.clarity !== b.clarity) return a.clarity > b.clarity;
  if (a.truth !== b.truth) return a.truth > b.truth;
  if (a.warmth !== b.warmth) return a.warmth > b.warmth;
  return a.total > b.total;
}

function isOneSentence(line: string): boolean {
  // "make.fun" carries a dot that is not sentence punctuation.
  const cleaned = line.replace(/make\.fun/gi, "makefun");
  const marks = cleaned.match(/[.!?]/g) ?? [];
  return marks.length === 1 && /[.!?]$/.test(cleaned.trim());
}

function main(): void {
  const scored = CANDIDATES.map((line, i) => ({ i, line, s: score(line) }));

  // Gate every candidate the way the sealed scorer gates the entry.
  for (const c of scored) {
    if (c.line.length > 240) throw new Error(`candidate ${c.i} over 240 chars: ${c.line.length}`);
    if (!isOneSentence(c.line)) throw new Error(`candidate ${c.i} is not exactly one sentence`);
    if (c.line.trim().length === 0) throw new Error(`candidate ${c.i} is blank`);
  }

  // Round-robin tournament: every pair plays once, 45 games for 10 candidates.
  const wins = new Array<number>(CANDIDATES.length).fill(0);
  for (let i = 0; i < CANDIDATES.length; i++) {
    for (let j = i + 1; j < CANDIDATES.length; j++) {
      if (beats(scored[i].s, scored[j].s)) wins[i]++;
      else wins[j]++;
    }
  }

  console.log("candidate | chars | P C T W | total | wins | win%");
  for (const c of scored) {
    const w = wins[c.i];
    const pct = ((w / (CANDIDATES.length - 1)) * 100).toFixed(1);
    console.log(
      `${String.fromCharCode(65 + c.i)} | ${c.line.length} | ${c.s.persuasion} ${c.s.clarity} ${c.s.truth} ${c.s.warmth} | ${c.s.total} | ${w} | ${pct}%`,
    );
    console.log(`  "${c.line}"`);
  }

  let best = 0;
  for (let i = 1; i < CANDIDATES.length; i++) {
    const better =
      wins[i] > wins[best] ||
      (wins[i] === wins[best] && scored[i].s.total > scored[best].s.total) ||
      (wins[i] === wins[best] &&
        scored[i].s.total === scored[best].s.total &&
        scored[i].s.persuasion > scored[best].s.persuasion) ||
      (wins[i] === wins[best] &&
        scored[i].s.total === scored[best].s.total &&
        scored[i].s.persuasion === scored[best].s.persuasion &&
        scored[i].line.length < scored[best].line.length);
    if (better) best = i;
  }

  const winner = scored[best];
  const winRate = wins[best] / (CANDIDATES.length - 1);
  console.log(
    `WINNER ${String.fromCharCode(65 + best)} win rate ${(winRate * 100).toFixed(1)}% (${wins[best]}/${CANDIDATES.length - 1})`,
  );

  // Gate the entry itself before writing it out.
  if (winner.line.length > 240) throw new Error("winner over 240 chars");
  if (!isOneSentence(winner.line)) throw new Error("winner is not exactly one sentence");

  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.txt", winner.line, "utf8");
  console.log(`wrote /output/entry.txt (${winner.line.length} chars)`);
}

main();
