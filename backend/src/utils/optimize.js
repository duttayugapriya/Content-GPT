// src/utils/optimizer.js
// Deterministic, dependency-free optimizer for generated social posts.
// It normalizes length/hashtags/emojis/CTAs by platform, rewrites copy,
// and re-scores using transparent heuristics. Designed to be swappable later
// with a data-driven model when you have real engagement metrics.

const PLATFORM_RULES = {
  Twitter: { // X
    key: "Twitter",
    maxChars: 280,
    minChars: 60,
    hashtagsMin: 0,
    hashtagsMax: 2,
    emojisMax: 1,
    allowLineBreaks: false,
    defaultCTA: "Learn more",
  },
  X: { // alias
    key: "Twitter",
    maxChars: 280,
    minChars: 60,
    hashtagsMin: 0,
    hashtagsMax: 2,
    emojisMax: 1,
    allowLineBreaks: false,
    defaultCTA: "Learn more",
  },
  LinkedIn: {
    key: "LinkedIn",
    maxChars: 300,
    minChars: 120,
    hashtagsMin: 0,
    hashtagsMax: 3,
    emojisMax: 1,
    allowLineBreaks: true,
    defaultCTA: "Learn more",
  },
  Instagram: {
    key: "Instagram",
    maxChars: 220,
    minChars: 80,
    hashtagsMin: 1,
    hashtagsMax: 3,
    emojisMax: 3,
    allowLineBreaks: true,
    defaultCTA: "Tap to explore",
  },
  TikTok: {
    key: "TikTok",
    maxChars: 150,
    minChars: 50,
    hashtagsMin: 1,
    hashtagsMax: 3,
    emojisMax: 3,
    allowLineBreaks: true,
    defaultCTA: "Watch now",
  },
  YouTube: { // Community post
    key: "YouTube",
    maxChars: 150,
    minChars: 60,
    hashtagsMin: 0,
    hashtagsMax: 2,
    emojisMax: 2,
    allowLineBreaks: true,
    defaultCTA: "Subscribe for more",
  },
  General: {
    key: "General",
    maxChars: 160,
    minChars: 60,
    hashtagsMin: 0,
    hashtagsMax: 3,
    emojisMax: 2,
    allowLineBreaks: true,
    defaultCTA: "Learn more",
  },
};

const POWER_WORDS = [
  "free", "save", "new", "limited", "boost", "proven",
  "effortless", "premium", "exclusive", "guarantee",
];

const CTA_VARIANTS = {
  LinkedIn: ["Learn more", "Get the full story", "See how it works"],
  Twitter: ["Learn more", "Read more", "Try now"],
  Instagram: ["Tap to explore", "Shop now", "Try it today"],
  TikTok: ["Watch now", "Try it now", "See the results"],
  YouTube: ["Subscribe for more", "Watch now", "Learn more"],
  General: ["Learn more", "Try now", "Get started"],
};

function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function splitHashtags(text) {
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return { without: text.replace(/#[\p{L}\p{N}_]+/gu, "").trim(), tags };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function approximateReadingGrade(text) {
  // Very rough: sentences, words, syllables heuristic-less; just word-length proxy
  const words = (text.match(/\b[\p{L}\p{N}'-]+\b/gu) || []);
  const avgLen = words.length ? words.join("").length / words.length : 0;
  if (avgLen <= 4.5) return 6;
  if (avgLen <= 5.0) return 7;
  if (avgLen <= 5.5) return 8;
  if (avgLen <= 6.0) return 9;
  if (avgLen <= 6.5) return 10;
  return 11;
}

function hasCTA(text) {
  const ctas = /(learn more|try now|get started|shop now|watch now|subscribe|sign up|join now|read more)/i;
  return ctas.test(text);
}

function insertCTA(text, platformKey) {
  const variants = CTA_VARIANTS[platformKey] || CTA_VARIANTS.General;
  const chosen = variants[0];
  // add CTA on a new line if platform allows
  return text + (PLATFORM_RULES[platformKey].allowLineBreaks ? `\n${chosen}` : ` — ${chosen}`);
}

function normalizeTone(text, tone, platformKey) {
  const t = (tone || "").toLowerCase();
  let result = text;

  // Professional: remove extra emojis/exclamations/slang
  if (t.includes("professional") || t.includes("formal")) {
    result = result
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // remove emojis
      .replace(/!{2,}/g, "!")
      .replace(/\b(gonna|wanna|lit|dope|omg|lol)\b/gi, "");
  }

  // Energetic/Playful: ensure at least one exclamation or emoji (within limits)
  if (t.includes("energetic") || t.includes("playful") || t.includes("friendly")) {
    if (!/[!]|[\u{1F300}-\u{1FAFF}]/u.test(result)) {
      result += platformKey === "LinkedIn" ? "!" : " ✨";
    }
  }

  return result;
}

function applyLengthPolicy(text, rules) {
  const { minChars, maxChars } = rules;
  const trimmed = text.trim();
  if (trimmed.length > maxChars) {
    // compress: remove filler, shorten clauses, drop trailing fluff
    let s = trimmed
      .replace(/\s+/g, " ")
      .replace(/\([^)]*\)/g, "") // remove parentheticals
      .replace(/(\.|!|\?)\s+\w{1,3}\b/g, "$1"); // drop very short trailing words after punctuation
    while (s.length > maxChars) {
      s = s.replace(/[,;:]-?\s*\w+$/,""); // shave tail phrases
      if (s.length <= maxChars) break;
      s = s.slice(0, maxChars);
    }
    return s.trim();
  }
  if (trimmed.length < minChars) {
    // extend: add a benefit + CTA seed
    let s = trimmed;
    const add = " • Benefit: faster results with less effort.";
    if (!s.includes("•")) s += " • Why it matters: real impact in days.";
    if (!hasCTA(s)) s = insertCTA(s, rules.key);
    // ensure within max
    return s.slice(0, maxChars).trim();
  }
  return trimmed;
}

function enforceHashtags(text, rules, keepTags) {
  const { hashtagsMin, hashtagsMax, key } = rules;
  const finalTags = keepTags.slice(0, hashtagsMax);
  while (finalTags.length < hashtagsMin) {
    // add neutral tag by platform
    const fallback = key === "LinkedIn" ? "#Insights" :
                     key === "Twitter" ? "#Trending" :
                     key === "Instagram" ? "#InstaDaily" :
                     key === "TikTok" ? "#ForYou" :
                     key === "YouTube" ? "#YouTube" : "#Updates";
    if (!finalTags.includes(fallback)) finalTags.push(fallback);
    else break;
  }
  const body = text.trim();
  const tags = finalTags.length ? " " + finalTags.join(" ") : "";
  return (body + tags).trim();
}

function limitEmojis(text, max) {
  const chars = Array.from(text);
  let count = 0;
  return chars.filter(ch => {
    const isEmoji = /\p{Extended_Pictographic}/u.test(ch);
    if (isEmoji) {
      if (count < max) { count++; return true; }
      return false;
    }
    return true;
  }).join("");
}

function questionHook(text) {
  // Add a question at the start if none exists; helps engagement modestly
  if (/[?]/.test(text)) return text;
  const firstSentence = "Looking for a smarter way to get results?";
  return `${firstSentence} ${text}`;
}

function featureExtract(text) {
  const emojis = countMatches(text, /\p{Extended_Pictographic}/gu);
  const hashtags = countMatches(text, /#[\p{L}\p{N}_]+/gu);
  const ctas = hasCTA(text) ? 1 : 0;
  const questions = countMatches(text, /\?/g);
  const numerals = countMatches(text, /\b\d+(\.\d+)?\b/g);
  const power = countMatches(text.toLowerCase(), new RegExp(`\\b(${POWER_WORDS.join("|")})\\b`, "g"));
  const reading_grade = approximateReadingGrade(text);
  return {
    length: text.length,
    emojis, hashtags, ctas, questions, numerals, power_words: power, reading_grade
  };
}

function scorePost(text, baseScore, rules) {
  let score = Number.isFinite(baseScore) ? baseScore : 5.0;

  const f = featureExtract(text);

  if (hasCTA(text)) score += 0.4;
  if (f.numerals > 0) score += 0.3;
  if (f.hashtags >= rules.hashtagsMin && f.hashtags <= rules.hashtagsMax) score += 0.3;

  if (f.emojis > 0 && f.emojis <= rules.emojisMax) score += 0.2;
  if (/^\s*[^.?!]{0,100}\?/m.test(text)) score += 0.2; // question near start

  if (f.power_words > 0) score += 0.3;

  if (text.length < rules.minChars || text.length > rules.maxChars) score -= 0.5;

  if (f.hashtags > rules.hashtagsMax) score -= 0.3;
  if (f.emojis > rules.emojisMax) score -= 0.3;

  // crude wall-of-text penalty
  const longRun = (text.split(/\n/).length === 1) && text.split(/[.!?]/).filter(Boolean)[0]?.length > 160;
  if (longRun) score -= 0.2;

  return Number(clamp(Math.round(score * 10) / 10, 1, 10).toFixed(1));
}

export async function optimizePosts(posts, { platform = "General", tone = "Neutral", target_audience = "", length = "auto" } = {}) {
  const pKey = PLATFORM_RULES[platform]?.key || "General";
  const rules = PLATFORM_RULES[pKey];

  const items = posts.map((p) => {
    const original_post = String(p.post || "").trim();
    const original_score = Number.isFinite(p.score) ? Number(p.score) : undefined;

    const reasons = [];
    const adjustments = [];
    const warnings = [];

    // 1) Split hashtags & normalize tone
    const { without, tags } = splitHashtags(original_post);
    let working = normalizeTone(without, tone, pKey);

    // 2) Ensure question hook for attention
    if (!/\?/.test(working)) {
      working = questionHook(working);
      reasons.push("Added a question hook to increase curiosity/engagement.");
      adjustments.push("Prepended a short question.");
    }

    // 3) Ensure CTA
    if (!hasCTA(working)) {
      working = insertCTA(working, pKey);
      reasons.push("Inserted a clear call-to-action.");
      adjustments.push("Appended platform-appropriate CTA.");
    }

    // 4) Limit emojis to platform policy
    const emojisBefore = countMatches(working, /\p{Extended_Pictographic}/gu);
    working = limitEmojis(working, rules.emojisMax);
    const emojisAfter = countMatches(working, /\p{Extended_Pictographic}/gu);
    if (emojisAfter < emojisBefore) {
      reasons.push("Reduced emojis to platform-appropriate limit.");
      adjustments.push(`Emojis limited to ${rules.emojisMax}.`);
    }

    // 5) Length policy
    const beforeLen = working.length;
    working = applyLengthPolicy(working, rules);
    const afterLen = working.length;
    if (afterLen !== beforeLen) {
      if (afterLen < beforeLen) {
        reasons.push("Compressed copy to fit platform length window.");
        adjustments.push(`Trimmed from ${beforeLen} to ${afterLen} chars.`);
      } else {
        reasons.push("Expanded copy to meet minimum platform length.");
        adjustments.push(`Extended from ${beforeLen} to ${afterLen} chars.`);
      }
    }

    // 6) Hashtag enforcement
    const beforeTags = tags.length;
    working = enforceHashtags(working, rules, tags);
    const afterTags = (working.match(/#[\p{L}\p{N}_]+/gu) || []).length;
    if (afterTags !== beforeTags) {
      reasons.push("Normalized hashtags to platform range.");
      adjustments.push(`Hashtags: ${beforeTags} → ${afterTags} (allowed ${rules.hashtagsMin}–${rules.hashtagsMax}).`);
    }

    // 7) Score
    const optimized_score = scorePost(working, original_score, rules);
    const optimized_post = working;

    // Warnings
    if (optimized_post.length > rules.maxChars) {
      warnings.push(`Post still exceeds max length (${optimized_post.length}/${rules.maxChars}).`);
    }
    if (optimized_post.length < rules.minChars) {
      warnings.push(`Post is under min length (${optimized_post.length}/${rules.minChars}).`);
    }

    const features = featureExtract(optimized_post);

    return {
      original_post,
      optimized_post,
      original_score: Number.isFinite(original_score) ? Number(original_score.toFixed?.(1) || original_score) : null,
      optimized_score,
      features,
      reasons,
      adjustments,
      warnings,
    };
  });

  // Summary
  
  const deltas = items.map(it => (Number.isFinite(it.original_score) ? (it.optimized_score - it.original_score) : 0));
  const avg_score_delta = items.length ? Number((deltas.reduce((a,b)=>a+b,0) / items.length).toFixed(2)) : 0;

  // Pick winners (top optimized_score)
  const maxScore = Math.max(...items.map(it => it.optimized_score));
  const winners = items.reduce((acc, it, idx) => {
    if (it.optimized_score === maxScore) acc.push(idx);
    return acc;
  }, []);

  const guidance = [
    "Keep hashtags within platform norms; excess hurts reach.",
    "Lead with a question or benefit hook to increase dwell time.",
    "Always include a single, specific CTA.",
    "Use 1 number or proof point to increase credibility.",
    "Avoid walls of text; add a line break before the CTA on platforms that allow it.",
  ];

  return {
    platform: pKey,
    tone,
    target_audience,
    length,
    items,
    summary: {
      avg_score_delta,
      winners,
      guidance,
    },
  };
}
