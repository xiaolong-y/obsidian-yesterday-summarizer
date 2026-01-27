var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => YesterdaySummarizerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "gemma3:12b",
  // Best quality/speed balance (benchmark v2: 82/100 in 60s)
  dailyNotesFolder: "10_daily",
  outputMode: "cursor",
  autoSummarize: true,
  targetSection: "## Yesterday's Highlights",
  weekStartDay: "monday",
  weeklyTargetSection: "## Week Summary",
  detailLevel: "standard",
  summaryCache: {},
  stats: {
    totalSummaries: 0,
    dailySummaries: 0,
    weeklySummaries: 0,
    monthlySummaries: 0,
    lastSummaryDate: null
  }
};
var DETAIL_MODIFIERS = {
  concise: `
BREVITY MODE:
- Maximum 3 bullets per section
- Each bullet under 60 characters
- Skip sections with nothing notable
- No explanations, just facts`,
  standard: "",
  // No modifier for standard
  detailed: `
DETAILED MODE:
- Include all completed tasks (up to 10)
- Expand insights with supporting observations
- Include timestamps if mentioned
- Add context for blockers (what caused them, potential solutions)
- Include subtle mood/energy signals`
};
var SUMMARIZE_PROMPT = `You are a journal analyst. Extract meaning, don't copy text.

=== EXAMPLE ===
INPUT:
"- [x] Sent proposal to client
- [ ] Write blog post
- [ ] Fix login bug
Spent 2 hours on the proposal, way longer than expected. Still haven't started the blog post\u2014fourth day now. Not sure what angle to take."

OUTPUT:
**Completed**:
- Delivered client proposal (took 2hrs)

**Incomplete**:
- Blog post (4 days stalled)
- Login bug fix

**Blockers**:
- Blog post: unclear direction causing avoidance

**Energy & Mood**:
- Frustrated by time sink on proposal

**Insights**:
- Repeated avoidance on blog post = needs clearer scope first

**Today's Focus**:
1. Define blog post angle (5 min brainstorm)
2. Fix login bug
3. Start blog draft

**Quick Wins**:
- Outline 3 possible blog angles

**Mentioned**:
[[client]]
=== END EXAMPLE ===

CRITICAL RULES:
1. NEVER copy task text verbatim\u2014always rephrase:
   - BAD: "Applied to Meta via referral from Sarah"
   - GOOD: "Submitted Meta application (referral)"
2. BLOCKERS include hidden obstacles:
   - Task repeated across days without progress = avoidance blocker
   - "not sure", "unclear", "don't know" = clarity blocker
   - "waiting on", "need X first" = dependency blocker
   - Energy crashes preventing work = energy blocker
3. INSIGHTS must synthesize patterns, not list facts.
4. Each bullet \u226460 characters.
5. Use [[wikilinks]] for projects/people/tools.

**Completed**:
- [rephrased achievement]

**Incomplete**:
- [rephrased pending task]

**Blockers**:
- [task]: [blocker type] or "None"

**Energy & Mood**:
- [observation with evidence]

**Insights**:
- [pattern or realization]

**Today's Focus**:
1. [highest-impact action]
2. [action]
3. [action]

**Quick Wins**:
- [<15 min task] or "None"

**Mentioned**:
[[project]], [[person]]

---
`;
var WEEKLY_PROMPT = `You are a reflective coach synthesizing a week of journal entries.

=== EXAMPLE OUTPUT ===
**Key Accomplishments**:
- Shipped [[ProjectX]] MVP
- Completed 3 job applications

**Open Threads**:
- [[BlogRedesign]] \u2014 60% done, blocked on images
- [[TaxPrep]] \u2014 not started

**Blockers & Friction**:
- [[BlogRedesign]]: waiting on designer (3 days)
- Tax prep: avoidance pattern (mentioned 4x, 0 action)

**Energy Arc**:
- Mon-Tue high (shipped MVP), Wed crashed (meetings), Thu-Fri recovering

**Themes & Patterns**:
- TIME: 60% on [[ProjectX]], only 10% on stated priority [[JobSearch]]
- GAPS: Tax prep mentioned daily but never touched\u2014resistance
- MOMENTUM: MVP shipped fast; blog stalled on external dependency

**Questions to Carry Forward**:
- Why avoiding tax prep? Fear of complexity?

**Trajectory**:
- Productivity: \u2191 (shipped something)
- Focus: scattered (too many threads)
- Energy: depleting

**Next Week's Intention**:
Close one thread completely before starting anything new.
=== END EXAMPLE ===

CRITICAL: Follow the exact format above. Use **Section**: headers with bullet points.

**Key Accomplishments**:
- [rephrased achievement]

**Open Threads**:
- [[project]] \u2014 [current state]

**Blockers & Friction**:
- [project]: [blocker type] (duration/frequency)

**Energy Arc**:
- [day-by-day energy narrative in one line]

**Themes & Patterns**:
Answer 3+ of: TIME, ATTENTION, MOMENTUM, GAPS, ALIGNMENT
- [specific observation with evidence]

**Questions to Carry Forward**:
- [unresolved tension]

**Trajectory**:
- Productivity: [\u2191/\u2192/\u2193]
- Focus: [scattered/concentrated]
- Energy: [building/depleting/recovering]

**Next Week's Intention**:
[Single actionable sentence]

RULES:
- Synthesize across days, don't summarize each day separately
- Surface patterns the writer might not notice
- Use [[wikilinks]] for all projects/people/tools
- No generic observations ("productive week")
- If few entries: "Only N days captured\u2014limited data"

---
`;
var MONTHLY_PROMPT = `You are a strategic advisor synthesizing a month of journal entries. Focus on BIG PICTURE trends.

**Month of [month/year]**

**Major Milestones**:
What was actually accomplished this month? List concrete outcomes, not activities.
- [shipped/completed/achieved X]

**Projects Status**:
- [project]: [started/progressing/stalled/completed]

**Recurring Blockers**:
What kept appearing as obstacles across weeks?
- [pattern that blocked progress]

**Time Investment Analysis**:
Where did the month actually go? Estimate percentages:
- [category]: ~X% (e.g., "Job search: ~40%, Side projects: ~30%, Learning: ~20%")

**Energy & Wellbeing**:
- Overall energy trend: [improving/declining/stable]
- Burnout signals: [none/mild/concerning]
- Recovery patterns: [what helped restore energy]

**Strategic Observations**:
Step back and assess:
1. What's working well that should continue?
2. What's not working that needs to change?
3. Is current trajectory aligned with longer-term goals?
4. What would past-you from 3 months ago think of this month?

**Next Month's Theme**:
[One word or phrase capturing the focus]

**Top 3 Priorities**:
Based on patterns observed, what should next month prioritize?
1. [priority with rationale]
2. [priority]
3. [priority]

RULES:
- This is executive-level summary\u2014zoom out from daily details
- Look for multi-week patterns, not individual incidents
- Be honest about misalignment between intentions and actions
- Use [[wikilinks]] for projects, people, and recurring themes
- If data is sparse, say so: "Limited entries (X days captured)"
- No fluff\u2014every sentence should contain insight

---
`;
var COMPARE_PROMPT = `Compare these two journal entries and highlight meaningful differences.

**Productivity Shift**:
- Day 1 vs Day 2: [more/less productive, why?]

**Task Momentum**:
- Completed in both: [if any]
- New in Day 2: [tasks that appeared]
- Dropped from Day 1: [tasks that disappeared]

**Energy Comparison**:
- Day 1 energy: [observation]
- Day 2 energy: [observation]
- Trend: [improving/declining/volatile]

**Focus Changes**:
What shifted between the days?
- [observation about priority changes]

**Key Insight**:
[One sentence: What's the most important thing this comparison reveals?]

RULES:
- Be specific about what changed
- Note any concerning patterns (e.g., same blocker appearing)
- Keep it brief\u2014this is a quick comparison
- Use [[wikilinks]] for projects/people mentioned

---
`;
function stripThinkTags(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
function calculateTokenLimit(content, baseTokens = 600) {
  const words = content.split(/\s+/).length;
  if (words < 200)
    return baseTokens;
  if (words < 500)
    return Math.min(baseTokens + 200, 800);
  if (words < 1e3)
    return Math.min(baseTokens + 400, 1e3);
  return 1200;
}
function extractWikilinks(content) {
  const matches = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/, "$1")))];
}
function extractTags(content) {
  const matches = content.match(/#[a-zA-Z][a-zA-Z0-9_/-]*/g) || [];
  return [...new Set(matches)];
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const yamlContent = match[1];
  const body = match[2];
  const frontmatter = {};
  const lines = yamlContent.split("\n");
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if (value === "true")
        value = true;
      else if (value === "false")
        value = false;
      else if (/^\d+$/.test(value))
        value = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value))
        value = parseFloat(value);
      frontmatter[key] = value;
    }
  }
  return { frontmatter, body };
}
function buildContextHints(content) {
  const { frontmatter } = extractFrontmatter(content);
  const wikilinks = extractWikilinks(content);
  const tags = extractTags(content);
  let hints = "";
  const metadataKeys = ["mood", "energy", "productivity", "sleep", "exercise", "focus"];
  const foundMeta = [];
  for (const key of metadataKeys) {
    if (frontmatter[key] !== void 0 && frontmatter[key] !== "") {
      foundMeta.push(`${key}: ${frontmatter[key]}`);
    }
  }
  if (foundMeta.length > 0) {
    hints += `
FRONTMATTER METADATA: ${foundMeta.join(", ")}`;
    hints += "\n(Use this metadata to inform your energy/mood observations)";
  }
  if (wikilinks.length > 0) {
    hints += `
EXISTING LINKS in entry: ${wikilinks.slice(0, 10).map((w) => `[[${w}]]`).join(", ")}`;
    hints += "\n(Preserve these links in your output when referencing these items)";
  }
  if (tags.length > 0) {
    hints += `
TAGS used: ${tags.slice(0, 10).join(", ")}`;
  }
  return hints;
}
function postProcessOutput(text) {
  let result = text;
  result = stripThinkTags(result);
  result = result.replace(/^(Here'?s?|Below is|The following|I've|Let me|Based on|This week|Overall)[^*\n]*\n+/gi, "");
  result = result.replace(/^#{1,4}\s+(Week of|Summary of)[^\n]*\n+/gim, "");
  result = result.replace(/^#{1,4}\s*\*{0,2}([^*\n#]+)\*{0,2}\s*$/gm, "**$1**:");
  result = result.replace(/^-{3,}\s*$/gm, "");
  result = result.replace(/^\d+\.\s+\*{0,2}([^*:\n]+)\*{0,2}:\s*/gm, "- [[$1]] \u2014 ");
  const lastSection = result.lastIndexOf("**");
  if (lastSection > 0) {
    const afterLastHeader = result.indexOf("\n\n", lastSection + 50);
    if (afterLastHeader > 0) {
      const trailing = result.slice(afterLastHeader);
      if (!trailing.includes("**") && trailing.length > 100) {
        result = result.slice(0, afterLastHeader).trim();
      }
    }
  }
  result = result.replace(/^\* /gm, "- ");
  result = result.replace(/\*{4,}([^*]+)\*{4,}/g, "**$1**");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/(\*\*[^*]+\*\*:?)\n([^-\n1-9])/g, "$1\n\n$2");
  result = result.replace(/\*\*\s*\*\*/g, "");
  return result.trim();
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function callOllama(endpoint, model, prompt, maxTokens = 600, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await (0, import_obsidian.requestUrl)({
        url: `${endpoint}/api/generate`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.5,
            top_p: 0.9,
            num_predict: maxTokens
          }
        }),
        throw: false
        // Don't throw on non-200, handle manually
      });
      if (response.status === 200) {
        const data = response.json;
        const rawResponse = data.response || "";
        return postProcessOutput(rawResponse);
      }
      if (response.status === 404) {
        throw new Error(`Model "${model}" not found. Run: ollama pull ${model}`);
      }
      if (response.status === 503) {
        throw new Error("Ollama service unavailable. Is it running?");
      }
      lastError = new Error(`Ollama returned status ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.message.includes("not found") || lastError.message.includes("unavailable")) {
        throw lastError;
      }
    }
    if (attempt < maxRetries) {
      await sleep(1e3 * Math.pow(2, attempt - 1));
    }
  }
  throw new Error(`Ollama failed after ${maxRetries} attempts: ${lastError == null ? void 0 : lastError.message}`);
}
var YesterdaySummarizerPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "summarize-yesterday",
      name: "Summarize yesterday",
      editorCallback: async (editor, view) => {
        await this.summarizeYesterday(editor, view);
      }
    });
    this.addCommand({
      id: "summarize-week",
      name: "Summarize this week",
      editorCallback: async (editor, view) => {
        await this.summarizeWeek(editor, view);
      }
    });
    this.addCommand({
      id: "summarize-month",
      name: "Summarize this month",
      editorCallback: async (editor, view) => {
        await this.summarizeMonth(editor, view);
      }
    });
    this.addCommand({
      id: "compare-days",
      name: "Compare yesterday vs today",
      editorCallback: async (editor, view) => {
        await this.compareDays(editor, view);
      }
    });
    this.addCommand({
      id: "summarize-today",
      name: "Summarize today (current note)",
      editorCallback: async (editor, view) => {
        await this.summarizeToday(editor, view);
      }
    });
    this.addCommand({
      id: "force-resummarize",
      name: "Force re-summarize yesterday (bypass cache)",
      editorCallback: async (editor, view) => {
        await this.forceSummarizeYesterday(editor, view);
      }
    });
    this.addCommand({
      id: "clear-cache",
      name: "Clear summary cache",
      callback: async () => {
        const count = Object.keys(this.settings.summaryCache).length;
        this.settings.summaryCache = {};
        await this.saveSettings();
        new import_obsidian.Notice(`Cleared ${count} cached summaries`);
      }
    });
    this.addCommand({
      id: "summarize-last-3-days",
      name: "Summarize last 3 days",
      editorCallback: async (editor, view) => {
        await this.summarizeDateRange(editor, view, 3);
      }
    });
    this.addCommand({
      id: "summarize-last-5-days",
      name: "Summarize last 5 days",
      editorCallback: async (editor, view) => {
        await this.summarizeDateRange(editor, view, 5);
      }
    });
    this.addCommand({
      id: "summarize-last-14-days",
      name: "Summarize last 14 days (2 weeks)",
      editorCallback: async (editor, view) => {
        await this.summarizeDateRange(editor, view, 14);
      }
    });
    this.addCommand({
      id: "export-summaries",
      name: "Export all summaries to file",
      callback: async () => {
        await this.exportSummaries();
      }
    });
    this.addCommand({
      id: "batch-summarize",
      name: "Batch summarize (catch up on missing)",
      callback: async () => {
        await this.batchSummarize();
      }
    });
    this.addCommand({
      id: "test-connection",
      name: "Test Ollama connection",
      callback: async () => {
        await this.testConnection();
      }
    });
    this.addSettingTab(new YesterdaySummarizerSettingTab(this.app, this));
    if (this.settings.autoSummarize) {
      this.registerEvent(
        this.app.workspace.on("file-open", (file) => {
          if (file) {
            this.handleFileOpen(file).catch(() => {
            });
          }
        })
      );
    }
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // Increment summary statistics
  async incrementStats(type) {
    if (!this.settings.stats) {
      this.settings.stats = { ...DEFAULT_SETTINGS.stats };
    }
    this.settings.stats.totalSummaries++;
    if (type === "daily")
      this.settings.stats.dailySummaries++;
    else if (type === "weekly")
      this.settings.stats.weeklySummaries++;
    else if (type === "monthly")
      this.settings.stats.monthlySummaries++;
    this.settings.stats.lastSummaryDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await this.saveSettings();
  }
  // Extract date from filename (e.g., "2026-01-15.md" -> "2026-01-15")
  extractDateFromFilename(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  // Calculate the day before a given date
  getDayBefore(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Calculate the start of the week (Monday or Sunday) containing a given date
  getWeekStart(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    let daysToSubtract;
    if (this.settings.weekStartDay === "monday") {
      daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    } else {
      daysToSubtract = dayOfWeek;
    }
    date.setDate(date.getDate() - daysToSubtract);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Get array of 7 date strings for the week starting from startDate
  getWeekDates(startDate) {
    const [year, month, day] = startDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }
  // Get all dates in a month
  getMonthDates(year, month) {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const m = String(month).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      dates.push(`${year}-${m}-${d}`);
    }
    return dates;
  }
  // Get month name
  getMonthName(month) {
    const names = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    return names[month - 1];
  }
  // Calculate longest streak of consecutive days with entries
  calculateStreak(dates, found) {
    let maxStreak = 0;
    let currentStreak = 0;
    for (const date of dates) {
      if (found.has(date)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    return maxStreak;
  }
  // Strip existing summary sections to prevent stale content from being re-summarized
  stripSummarySections(content) {
    const lines = content.split("\n");
    const result = [];
    let inSummarySection = false;
    for (const line of lines) {
      if (line.match(/^## (Yesterday's Highlights|Summary of \d{4}-\d{2}-\d{2})/)) {
        inSummarySection = true;
        continue;
      }
      if (inSummarySection && line.match(/^## /)) {
        inSummarySection = false;
      }
      if (!inSummarySection) {
        result.push(line);
      }
    }
    return result.join("\n").trim();
  }
  // Read a specific date's daily note - returns { date, content } or null
  async readDailyNote(targetDate) {
    const formats = [
      `${this.settings.dailyNotesFolder}/${targetDate} \u2013 Journal.md`,
      `${this.settings.dailyNotesFolder}/${targetDate}.md`
    ];
    let notePath = null;
    for (const path of formats) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file) {
        notePath = path;
        break;
      }
    }
    if (!notePath) {
      new import_obsidian.Notice(`Note not found for ${targetDate}`);
      return null;
    }
    try {
      const content = await this.app.vault.adapter.read(notePath);
      const frontmatterEnd = content.indexOf("---", 3);
      let bodyContent;
      if (frontmatterEnd !== -1) {
        bodyContent = content.substring(frontmatterEnd + 3).trim();
      } else {
        bodyContent = content;
      }
      bodyContent = this.stripSummarySections(bodyContent);
      return { date: targetDate, content: bodyContent };
    } catch (error) {
      new import_obsidian.Notice(`Error reading note: ${error}`);
      return null;
    }
  }
  // Read a daily note silently (no notice on missing) - for week aggregation
  async readDailyNoteSilent(targetDate) {
    const formats = [
      `${this.settings.dailyNotesFolder}/${targetDate} \u2013 Journal.md`,
      `${this.settings.dailyNotesFolder}/${targetDate}.md`
    ];
    let notePath = null;
    for (const path of formats) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file) {
        notePath = path;
        break;
      }
    }
    if (!notePath) {
      return null;
    }
    try {
      const content = await this.app.vault.adapter.read(notePath);
      const frontmatterEnd = content.indexOf("---", 3);
      let bodyContent;
      if (frontmatterEnd !== -1) {
        bodyContent = content.substring(frontmatterEnd + 3).trim();
      } else {
        bodyContent = content;
      }
      bodyContent = this.stripSummarySections(bodyContent);
      return { date: targetDate, content: bodyContent };
    } catch (e) {
      return null;
    }
  }
  // Read all daily notes for a week using Promise.allSettled for parallel reading
  async readWeekNotes(dates) {
    const results = await Promise.allSettled(
      dates.map((date) => this.readDailyNoteSilent(date))
    );
    const found = /* @__PURE__ */ new Map();
    const missing = [];
    results.forEach((result, index) => {
      const date = dates[index];
      if (result.status === "fulfilled" && result.value) {
        found.set(date, result.value.content);
      } else {
        missing.push(date);
      }
    });
    return { found, missing };
  }
  // Weekly summarization function
  async summarizeWeek(editor, view) {
    const currentFile = view.file;
    if (!currentFile) {
      new import_obsidian.Notice("No file is currently open");
      return;
    }
    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);
    if (!currentDate) {
      new import_obsidian.Notice(`Cannot extract date from filename: ${currentFilename}
Expected format: YYYY-MM-DD`);
      return;
    }
    const weekStart = this.getWeekStart(currentDate);
    const weekDates = this.getWeekDates(weekStart);
    const weekEnd = weekDates[6];
    const loadingNotice = new import_obsidian.Notice(`Reading week ${weekStart} to ${weekEnd}...`, 0);
    try {
      const { found, missing } = await this.readWeekNotes(weekDates);
      if (found.size === 0) {
        loadingNotice.hide();
        new import_obsidian.Notice(`No daily notes found for week ${weekStart} to ${weekEnd}`);
        return;
      }
      loadingNotice.setMessage(`Summarizing ${found.size} days (${missing.length} missing)...`);
      const consistencyPct = Math.round(found.size / 7 * 100);
      const streak = this.calculateStreak(weekDates, found);
      let aggregatedContent = "";
      for (const [date, content] of found) {
        aggregatedContent += `
--- ${date} ---
${content}
`;
      }
      const allContent = Array.from(found.values()).join("\n");
      const contextHints = buildContextHints(allContent);
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const dateRange = `${weekStart} to ${weekEnd}`;
      const consistencyInfo = `
CONSISTENCY: ${found.size}/7 days captured (${consistencyPct}%), longest streak: ${streak} days`;
      const fullPrompt = `Summarizing week of ${dateRange}:${consistencyInfo}${contextHints}

${WEEKLY_PROMPT}${detailMod}

${aggregatedContent}`;
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        1500
        // More tokens for week-long synthesis
      );
      loadingNotice.hide();
      if (this.settings.outputMode === "cursor") {
        const formatted = `
## Week Summary (${weekStart} to ${weekEnd})

${summary}
`;
        editor.replaceSelection(formatted);
        new import_obsidian.Notice(`Week summary inserted! (${found.size}/${7} days) - Try "Summarize month" for bigger picture`);
      } else {
        await navigator.clipboard.writeText(summary);
        new import_obsidian.Notice(`Week summary copied! (${found.size} days, ${missing.length} missing)`);
      }
      await this.incrementStats("weekly");
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Weekly error:", error);
    }
  }
  // Monthly summarization function
  async summarizeMonth(editor, view) {
    const currentFile = view.file;
    if (!currentFile) {
      new import_obsidian.Notice("No file is currently open");
      return;
    }
    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);
    if (!currentDate) {
      new import_obsidian.Notice(`Cannot extract date from filename: ${currentFilename}
Expected format: YYYY-MM-DD`);
      return;
    }
    const [year, month] = currentDate.split("-").map(Number);
    const monthName = this.getMonthName(month);
    const monthDates = this.getMonthDates(year, month);
    const loadingNotice = new import_obsidian.Notice(`Reading ${monthName} ${year}...`, 0);
    try {
      const { found, missing } = await this.readWeekNotes(monthDates);
      if (found.size === 0) {
        loadingNotice.hide();
        new import_obsidian.Notice(`No daily notes found for ${monthName} ${year}`);
        return;
      }
      loadingNotice.setMessage(`Summarizing ${found.size} days (${missing.length} missing)...`);
      let aggregatedContent = "";
      for (const [date, content] of found) {
        aggregatedContent += `
--- ${date} ---
${content}
`;
      }
      const fullPrompt = `Summarizing month of ${monthName} ${year}:

${MONTHLY_PROMPT}${aggregatedContent}`;
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        2e3
        // More tokens for month-long synthesis
      );
      loadingNotice.hide();
      if (this.settings.outputMode === "cursor") {
        const formatted = `
## Monthly Summary: ${monthName} ${year}

${summary}
`;
        editor.replaceSelection(formatted);
        new import_obsidian.Notice(`Monthly summary inserted! (${found.size} days captured)`);
      } else {
        await navigator.clipboard.writeText(summary);
        new import_obsidian.Notice(`Monthly summary copied! (${found.size} days captured)`);
      }
      await this.incrementStats("monthly");
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Monthly error:", error);
    }
  }
  // Custom date range summarization (last N days)
  async summarizeDateRange(editor, view, days) {
    const currentFile = view.file;
    if (!currentFile) {
      new import_obsidian.Notice("No file is currently open");
      return;
    }
    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);
    if (!currentDate) {
      new import_obsidian.Notice(`Cannot extract date from filename: ${currentFilename}
Expected format: YYYY-MM-DD`);
      return;
    }
    const dates = [];
    let datePtr = this.getDayBefore(currentDate);
    for (let i = 0; i < days; i++) {
      dates.unshift(datePtr);
      datePtr = this.getDayBefore(datePtr);
    }
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const loadingNotice = new import_obsidian.Notice(`Reading ${days} days (${startDate} to ${endDate})...`, 0);
    try {
      const { found, missing } = await this.readWeekNotes(dates);
      if (found.size === 0) {
        loadingNotice.hide();
        new import_obsidian.Notice(`No daily notes found for the last ${days} days`);
        return;
      }
      loadingNotice.setMessage(`Summarizing ${found.size}/${days} days...`);
      const consistencyPct = Math.round(found.size / days * 100);
      const streak = this.calculateStreak(dates, found);
      let aggregatedContent = "";
      for (const [date, content] of found) {
        aggregatedContent += `
--- ${date} ---
${content}
`;
      }
      const allContent = Array.from(found.values()).join("\n");
      const contextHints = buildContextHints(allContent);
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const dateRange = `${startDate} to ${endDate} (${days} days)`;
      const consistencyInfo = `
CONSISTENCY: ${found.size}/${days} days captured (${consistencyPct}%), longest streak: ${streak} days`;
      const fullPrompt = `Summarizing ${dateRange}:${consistencyInfo}${contextHints}

${WEEKLY_PROMPT}${detailMod}

${aggregatedContent}`;
      const tokenLimit = Math.min(800 + days * 50, 2e3);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );
      loadingNotice.hide();
      if (this.settings.outputMode === "cursor") {
        const formatted = `
## Summary: ${startDate} to ${endDate} (${days} days)

${summary}
`;
        editor.replaceSelection(formatted);
        new import_obsidian.Notice(`${days}-day summary inserted! (${found.size}/${days} days captured)`);
      } else {
        await navigator.clipboard.writeText(summary);
        new import_obsidian.Notice(`${days}-day summary copied! (${found.size}/${days} days captured)`);
      }
      await this.incrementStats("weekly");
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Date range error:", error);
    }
  }
  // Compare today vs yesterday
  async compareDays(editor, view) {
    const currentFile = view.file;
    if (!currentFile) {
      new import_obsidian.Notice("No file is currently open");
      return;
    }
    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);
    if (!currentDate) {
      new import_obsidian.Notice(`Cannot extract date from filename: ${currentFilename}
Expected format: YYYY-MM-DD`);
      return;
    }
    const yesterdayDate = this.getDayBefore(currentDate);
    const loadingNotice = new import_obsidian.Notice(`Comparing ${yesterdayDate} vs ${currentDate}...`, 0);
    try {
      const [day1Result, day2Result] = await Promise.all([
        this.readDailyNoteSilent(yesterdayDate),
        this.readDailyNoteSilent(currentDate)
      ]);
      if (!day1Result) {
        loadingNotice.hide();
        new import_obsidian.Notice(`Note not found for ${yesterdayDate}`);
        return;
      }
      if (!day2Result) {
        loadingNotice.hide();
        new import_obsidian.Notice(`Note not found for ${currentDate}`);
        return;
      }
      loadingNotice.setMessage("Analyzing differences...");
      const comparisonContent = `
--- Day 1: ${yesterdayDate} ---
${day1Result.content}

--- Day 2: ${currentDate} ---
${day2Result.content}
`;
      const fullPrompt = `Comparing ${yesterdayDate} vs ${currentDate}:

${COMPARE_PROMPT}${comparisonContent}`;
      const comparison = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        800
      );
      loadingNotice.hide();
      if (this.settings.outputMode === "cursor") {
        const formatted = `
## Comparison: ${yesterdayDate} \u2192 ${currentDate}

${comparison}
`;
        editor.replaceSelection(formatted);
        new import_obsidian.Notice("Day comparison inserted!");
      } else {
        await navigator.clipboard.writeText(comparison);
        new import_obsidian.Notice("Day comparison copied to clipboard!");
      }
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Compare error:", error);
    }
  }
  // Main summarization function
  async summarizeYesterday(editor, view) {
    const currentFile = view.file;
    if (!currentFile) {
      new import_obsidian.Notice("No file is currently open");
      return;
    }
    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);
    if (!currentDate) {
      new import_obsidian.Notice(`Cannot extract date from filename: ${currentFilename}
Expected format: YYYY-MM-DD`);
      return;
    }
    const yesterdayDate = this.getDayBefore(currentDate);
    const loadingNotice = new import_obsidian.Notice(`Reading ${yesterdayDate}...`, 0);
    try {
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        loadingNotice.hide();
        return;
      }
      const { date, content } = result;
      loadingNotice.setMessage(`Summarizing ${date} via Ollama...`);
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const contextHints = buildContextHints(content);
      const fullPrompt = `Summarizing daily note from ${date}:${contextHints}

${SUMMARIZE_PROMPT}${detailMod}

---
${content}`;
      const tokenLimit = calculateTokenLimit(content);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );
      loadingNotice.hide();
      if (this.settings.outputMode === "cursor") {
        const formatted = `
## Summary of ${date}

${summary}
`;
        editor.replaceSelection(formatted);
        new import_obsidian.Notice(`Summary of ${date} inserted! (Cmd/Ctrl+P > "Summarize week" for more)`);
      } else {
        await navigator.clipboard.writeText(summary);
        new import_obsidian.Notice(`Summary of ${date} copied to clipboard!`);
      }
      await this.incrementStats("daily");
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Error:", error);
    }
  }
  // Summarize today's note (current file)
  async summarizeToday(editor, view) {
    const currentFile = view.file;
    if (!currentFile) {
      new import_obsidian.Notice("No file is currently open");
      return;
    }
    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);
    if (!currentDate) {
      new import_obsidian.Notice(`Cannot extract date from filename: ${currentFilename}
Expected format: YYYY-MM-DD`);
      return;
    }
    const loadingNotice = new import_obsidian.Notice(`Summarizing ${currentDate}...`, 0);
    try {
      const content = await this.app.vault.read(currentFile);
      const { body } = extractFrontmatter(content);
      const cleanContent = this.stripSummarySections(body);
      if (!cleanContent.trim()) {
        loadingNotice.hide();
        new import_obsidian.Notice("Note is empty or contains only summary sections");
        return;
      }
      loadingNotice.setMessage(`Summarizing via Ollama...`);
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const contextHints = buildContextHints(cleanContent);
      const fullPrompt = `Summarizing today's note (${currentDate}) - note may be in-progress:${contextHints}

${SUMMARIZE_PROMPT}${detailMod}

---
${cleanContent}`;
      const tokenLimit = calculateTokenLimit(cleanContent);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );
      loadingNotice.hide();
      if (this.settings.outputMode === "cursor") {
        const formatted = `
## Today's Summary (${currentDate})

${summary}
`;
        editor.replaceSelection(formatted);
        new import_obsidian.Notice(`Today's summary inserted!`);
      } else {
        await navigator.clipboard.writeText(summary);
        new import_obsidian.Notice(`Today's summary copied!`);
      }
      await this.incrementStats("daily");
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Today error:", error);
    }
  }
  // Force re-summarize yesterday, bypassing cache
  async forceSummarizeYesterday(editor, view) {
    const currentFile = view.file;
    if (!currentFile) {
      new import_obsidian.Notice("No file is currently open");
      return;
    }
    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);
    if (!currentDate) {
      new import_obsidian.Notice(`Cannot extract date from filename: ${currentFilename}
Expected format: YYYY-MM-DD`);
      return;
    }
    const yesterdayDate = this.getDayBefore(currentDate);
    if (this.settings.summaryCache[yesterdayDate]) {
      delete this.settings.summaryCache[yesterdayDate];
      await this.saveSettings();
    }
    new import_obsidian.Notice(`Cache cleared for ${yesterdayDate}, re-summarizing...`);
    await this.summarizeYesterday(editor, view);
  }
  // Handle file open event for auto-summarization
  async handleFileOpen(file) {
    if (!file.path.startsWith(this.settings.dailyNotesFolder)) {
      return;
    }
    const dateMatch = this.extractDateFromFilename(file.basename);
    if (!dateMatch) {
      return;
    }
    const content = await this.app.vault.read(file);
    const targetSection = this.settings.targetSection;
    const sectionIndex = content.indexOf(targetSection);
    if (sectionIndex === -1) {
      return;
    }
    const afterSection = content.substring(sectionIndex + targetSection.length);
    const nextNewline = afterSection.indexOf("\n");
    if (nextNewline === -1) {
    } else {
      const contentAfterHeader = afterSection.substring(nextNewline + 1);
      const nextSectionMatch = contentAfterHeader.match(/^(\s*)(##|\n##|$)/);
      if (!nextSectionMatch) {
        const firstNonWhitespace = contentAfterHeader.trim();
        if (firstNonWhitespace && !firstNonWhitespace.startsWith("##")) {
          return;
        }
      }
    }
    const yesterdayDate = this.getDayBefore(dateMatch);
    try {
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        return;
      }
      const { date, content: yesterdayContent } = result;
      const contentHash = simpleHash(yesterdayContent + this.settings.detailLevel);
      const cachedHash = this.settings.summaryCache[date];
      if (cachedHash === contentHash) {
        return;
      }
      const loadingNotice = new import_obsidian.Notice(`Auto-summarizing ${yesterdayDate}...`, 0);
      loadingNotice.setMessage(`Summarizing ${date} via Ollama...`);
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const contextHints = buildContextHints(yesterdayContent);
      const fullPrompt = `Summarizing daily note from ${date}:${contextHints}

${SUMMARIZE_PROMPT}${detailMod}

---
${yesterdayContent}`;
      const tokenLimit = calculateTokenLimit(yesterdayContent);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );
      loadingNotice.hide();
      await this.insertAtSection(file, targetSection, summary);
      this.settings.summaryCache[date] = contentHash;
      this.cleanSummaryCache();
      await this.saveSettings();
      await this.incrementStats("daily");
      new import_obsidian.Notice(`Auto-summarized ${date}! (Cmd/Ctrl+P > "Summarize" for week/month)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Auto-summarize error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Auto-summarize error:", error);
    }
  }
  // Clean old cache entries to prevent unbounded growth
  cleanSummaryCache() {
    const entries = Object.entries(this.settings.summaryCache);
    if (entries.length <= 30)
      return;
    entries.sort((a, b) => b[0].localeCompare(a[0]));
    this.settings.summaryCache = Object.fromEntries(entries.slice(0, 30));
  }
  // Test Ollama connection and model availability
  async testConnection() {
    const loadingNotice = new import_obsidian.Notice("Testing Ollama connection...", 0);
    try {
      const tagsResponse = await (0, import_obsidian.requestUrl)({
        url: `${this.settings.ollamaEndpoint}/api/tags`,
        method: "GET",
        throw: false
      });
      if (tagsResponse.status !== 200) {
        loadingNotice.hide();
        new import_obsidian.Notice(`Ollama not reachable at ${this.settings.ollamaEndpoint}
Status: ${tagsResponse.status}`, 1e4);
        return;
      }
      const models = (tagsResponse.json.models || []).map((m) => m.name);
      loadingNotice.setMessage("Testing model response...");
      const testStart = Date.now();
      const testResponse = await (0, import_obsidian.requestUrl)({
        url: `${this.settings.ollamaEndpoint}/api/generate`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.settings.ollamaModel,
          prompt: 'Say "OK" and nothing else.',
          stream: false,
          options: { num_predict: 10 }
        }),
        throw: false
      });
      const testDuration = Date.now() - testStart;
      loadingNotice.hide();
      if (testResponse.status === 200) {
        new import_obsidian.Notice(
          `\u2713 Connection OK
\u2713 Model: ${this.settings.ollamaModel}
\u2713 Response time: ${testDuration}ms
\u2713 Available models: ${models.length}`,
          5e3
        );
      } else if (testResponse.status === 404) {
        new import_obsidian.Notice(
          `\u2713 Ollama connected
\u2717 Model not found: ${this.settings.ollamaModel}
Available: ${models.slice(0, 5).join(", ")}${models.length > 5 ? "..." : ""}`,
          1e4
        );
      } else {
        new import_obsidian.Notice(`Ollama error: status ${testResponse.status}`, 1e4);
      }
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Connection test failed: ${errorMsg}`, 1e4);
    }
  }
  // Batch summarize notes that are missing summaries
  async batchSummarize() {
    const loadingNotice = new import_obsidian.Notice("Scanning for notes without summaries...", 0);
    try {
      const folder = this.app.vault.getAbstractFileByPath(this.settings.dailyNotesFolder);
      if (!folder || !("children" in folder)) {
        loadingNotice.hide();
        new import_obsidian.Notice(`Daily notes folder not found: ${this.settings.dailyNotesFolder}`);
        return;
      }
      const files = folder.children.filter((f) => f instanceof import_obsidian.TFile && f.extension === "md").sort((a, b) => b.basename.localeCompare(a.basename));
      const notesNeedingSummary = [];
      const targetSection = this.settings.targetSection;
      for (const file of files.slice(0, 30)) {
        const dateMatch = this.extractDateFromFilename(file.basename);
        if (!dateMatch)
          continue;
        const content = await this.app.vault.read(file);
        const sectionIndex = content.indexOf(targetSection);
        if (sectionIndex === -1)
          continue;
        const afterSection = content.substring(sectionIndex + targetSection.length);
        const nextNewline = afterSection.indexOf("\n");
        if (nextNewline === -1) {
          notesNeedingSummary.push(file);
          continue;
        }
        const contentAfterHeader = afterSection.substring(nextNewline + 1).trim();
        const nextSection = contentAfterHeader.match(/^##\s/);
        if (!contentAfterHeader || nextSection) {
          notesNeedingSummary.push(file);
        }
      }
      if (notesNeedingSummary.length === 0) {
        loadingNotice.hide();
        new import_obsidian.Notice("All recent notes have summaries!");
        return;
      }
      loadingNotice.setMessage(`Found ${notesNeedingSummary.length} notes without summaries. Starting batch...`);
      let processed = 0;
      let errors = 0;
      for (const file of notesNeedingSummary) {
        const dateMatch = this.extractDateFromFilename(file.basename);
        if (!dateMatch)
          continue;
        const yesterdayDate = this.getDayBefore(dateMatch);
        loadingNotice.setMessage(`[${processed + 1}/${notesNeedingSummary.length}] Summarizing ${yesterdayDate}...`);
        try {
          const result = await this.readDailyNote(yesterdayDate);
          if (!result) {
            errors++;
            continue;
          }
          const { date, content: yesterdayContent } = result;
          const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
          const contextHints = buildContextHints(yesterdayContent);
          const fullPrompt = `Summarizing daily note from ${date}:${contextHints}

${SUMMARIZE_PROMPT}${detailMod}

---
${yesterdayContent}`;
          const tokenLimit = calculateTokenLimit(yesterdayContent);
          const summary = await callOllama(
            this.settings.ollamaEndpoint,
            this.settings.ollamaModel,
            fullPrompt,
            tokenLimit
          );
          await this.insertAtSection(file, targetSection, summary);
          const contentHash = simpleHash(yesterdayContent + this.settings.detailLevel);
          this.settings.summaryCache[date] = contentHash;
          await this.incrementStats("daily");
          processed++;
        } catch (error) {
          console.error(`[Batch] Error processing ${file.basename}:`, error);
          errors++;
        }
      }
      this.cleanSummaryCache();
      await this.saveSettings();
      loadingNotice.hide();
      new import_obsidian.Notice(`Batch complete: ${processed} summarized, ${errors} errors`);
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Batch error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Batch error:", error);
    }
  }
  // Export all summaries to a single file
  async exportSummaries() {
    const loadingNotice = new import_obsidian.Notice("Scanning daily notes for summaries...", 0);
    try {
      const folder = this.app.vault.getAbstractFileByPath(this.settings.dailyNotesFolder);
      if (!folder || !("children" in folder)) {
        loadingNotice.hide();
        new import_obsidian.Notice(`Daily notes folder not found: ${this.settings.dailyNotesFolder}`);
        return;
      }
      const files = folder.children.filter((f) => f instanceof import_obsidian.TFile && f.extension === "md").sort((a, b) => b.basename.localeCompare(a.basename));
      loadingNotice.setMessage(`Scanning ${files.length} daily notes...`);
      const summaries = [];
      for (const file of files) {
        const dateMatch = this.extractDateFromFilename(file.basename);
        if (!dateMatch)
          continue;
        const content = await this.app.vault.read(file);
        const summaryPatterns = [
          /## Summary of \d{4}-\d{2}-\d{2}\n\n([\s\S]*?)(?=\n## |\n---|\Z)/g,
          /## Yesterday's Highlights\n\n([\s\S]*?)(?=\n## |\n---|\Z)/g,
          /## Week Summary[^\n]*\n\n([\s\S]*?)(?=\n## |\n---|\Z)/g,
          /## Monthly Summary[^\n]*\n\n([\s\S]*?)(?=\n## |\n---|\Z)/g,
          /## Today's Summary[^\n]*\n\n([\s\S]*?)(?=\n## |\n---|\Z)/g
        ];
        for (const pattern of summaryPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const summaryText = match[1].trim();
            if (summaryText) {
              summaries.push({ date: dateMatch, summary: summaryText });
            }
          }
        }
      }
      if (summaries.length === 0) {
        loadingNotice.hide();
        new import_obsidian.Notice("No summaries found in daily notes");
        return;
      }
      const seenDates = /* @__PURE__ */ new Set();
      const uniqueSummaries = summaries.sort((a, b) => b.date.localeCompare(a.date)).filter((s) => {
        if (seenDates.has(s.date))
          return false;
        seenDates.add(s.date);
        return true;
      });
      let exportContent = `# Journal Summaries Export

`;
      exportContent += `*Exported ${uniqueSummaries.length} summaries on ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}*

`;
      exportContent += `---

`;
      for (const { date, summary } of uniqueSummaries) {
        exportContent += `## ${date}

${summary}

---

`;
      }
      const exportPath = `${this.settings.dailyNotesFolder}/summaries-export.md`;
      const existingFile = this.app.vault.getAbstractFileByPath(exportPath);
      if (existingFile instanceof import_obsidian.TFile) {
        await this.app.vault.modify(existingFile, exportContent);
      } else {
        await this.app.vault.create(exportPath, exportContent);
      }
      loadingNotice.hide();
      new import_obsidian.Notice(`Exported ${uniqueSummaries.length} summaries to ${exportPath}`);
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Export error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Export error:", error);
    }
  }
  // Insert content after a section header
  async insertAtSection(file, sectionHeader, content) {
    const fileContent = await this.app.vault.read(file);
    const sectionIndex = fileContent.indexOf(sectionHeader);
    if (sectionIndex === -1) {
      throw new Error(`Section "${sectionHeader}" not found`);
    }
    const headerEnd = fileContent.indexOf("\n", sectionIndex);
    if (headerEnd === -1) {
      const newContent = fileContent + "\n\n" + content + "\n";
      await this.app.vault.modify(file, newContent);
    } else {
      const before = fileContent.substring(0, headerEnd + 1);
      const after = fileContent.substring(headerEnd + 1);
      const newContent = before + "\n" + content + "\n" + after;
      await this.app.vault.modify(file, newContent);
    }
  }
};
async function fetchAvailableModels(endpoint) {
  try {
    const response = await (0, import_obsidian.requestUrl)({
      url: `${endpoint}/api/tags`,
      method: "GET",
      throw: false
    });
    if (response.status === 200) {
      const data = response.json;
      const models = (data.models || []).map((m) => m.name).sort((a, b) => a.localeCompare(b));
      return models;
    }
    return [];
  } catch (e) {
    return [];
  }
}
var YesterdaySummarizerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.availableModels = [];
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    fetchAvailableModels(this.plugin.settings.ollamaEndpoint).then((models) => {
      this.availableModels = models;
    });
    new import_obsidian.Setting(containerEl).setName("Ollama endpoint").setDesc("Server address.").addText((text) => text.setValue(this.plugin.settings.ollamaEndpoint).onChange(async (value) => {
      this.plugin.settings.ollamaEndpoint = value;
      await this.plugin.saveSettings();
      this.availableModels = await fetchAvailableModels(value);
      this.display();
    }));
    const modelSetting = new import_obsidian.Setting(containerEl).setName("Ollama model").setDesc(this.availableModels.length > 0 ? `${this.availableModels.length} models detected. Recommended: gemma3:12b (best balance)` : "Could not detect models. Enter manually or check if Ollama is running.");
    if (this.availableModels.length > 0) {
      modelSetting.addDropdown((dropdown) => {
        const recommended = ["gemma3:12b", "deepseek-r1:latest", "deepseek-r1:8b", "qwen2.5-coder:7b"];
        const availableRecommended = recommended.filter((m) => this.availableModels.includes(m));
        const otherModels = this.availableModels.filter((m) => !recommended.includes(m));
        availableRecommended.forEach((model) => {
          const label = model === "gemma3:12b" ? `${model} (Recommended - best balance)` : model === "deepseek-r1:latest" ? `${model} (Best quality)` : model === "qwen2.5-coder:7b" ? `${model} (Fastest)` : model;
          dropdown.addOption(model, label);
        });
        if (availableRecommended.length > 0 && otherModels.length > 0) {
          dropdown.addOption("---", "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
        }
        otherModels.forEach((model) => {
          dropdown.addOption(model, model);
        });
        const currentModel = this.plugin.settings.ollamaModel;
        if (this.availableModels.includes(currentModel)) {
          dropdown.setValue(currentModel);
        } else if (this.availableModels.length > 0) {
          dropdown.setValue(this.availableModels[0]);
        }
        dropdown.onChange(async (value) => {
          if (value !== "---") {
            this.plugin.settings.ollamaModel = value;
            await this.plugin.saveSettings();
          }
        });
        return dropdown;
      });
    }
    modelSetting.addText((text) => text.setPlaceholder("Or enter custom model...").setValue(this.availableModels.includes(this.plugin.settings.ollamaModel) ? "" : this.plugin.settings.ollamaModel).onChange(async (value) => {
      if (value.trim()) {
        this.plugin.settings.ollamaModel = value.trim();
        await this.plugin.saveSettings();
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Daily notes folder").setDesc("Folder containing your daily notes.").addText((text) => text.setPlaceholder("10_daily").setValue(this.plugin.settings.dailyNotesFolder).onChange(async (value) => {
      this.plugin.settings.dailyNotesFolder = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Output mode").setDesc("Where to put the generated summary.").addDropdown((dropdown) => dropdown.addOption("cursor", "Insert at cursor").addOption("clipboard", "Copy to clipboard").setValue(this.plugin.settings.outputMode).onChange(async (value) => {
      this.plugin.settings.outputMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Detail level").setDesc("How much detail to include in summaries.").addDropdown((dropdown) => dropdown.addOption("concise", "Concise (minimal, fast)").addOption("standard", "Standard (balanced)").addOption("detailed", "Detailed (comprehensive)").setValue(this.plugin.settings.detailLevel).onChange(async (value) => {
      this.plugin.settings.detailLevel = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto-summarization").setHeading();
    new import_obsidian.Setting(containerEl).setName("Auto-summarize on file open").setDesc("Automatically summarize yesterday when opening a daily note.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSummarize).onChange(async (value) => {
      this.plugin.settings.autoSummarize = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Target section").setDesc("Section header where the auto-summary will be inserted.").addText((text) => text.setValue(this.plugin.settings.targetSection).onChange(async (value) => {
      this.plugin.settings.targetSection = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Weekly summarization").setHeading();
    new import_obsidian.Setting(containerEl).setName("Week starts on").setDesc("First day of the week for weekly summaries.").addDropdown((dropdown) => dropdown.addOption("monday", "Monday").addOption("sunday", "Sunday").setValue(this.plugin.settings.weekStartDay).onChange(async (value) => {
      this.plugin.settings.weekStartDay = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Weekly target section").setDesc("Section header for weekly summary output.").addText((text) => text.setValue(this.plugin.settings.weeklyTargetSection).onChange(async (value) => {
      this.plugin.settings.weeklyTargetSection = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Statistics").setHeading();
    const stats = this.plugin.settings.stats || DEFAULT_SETTINGS.stats;
    const cacheSize = Object.keys(this.plugin.settings.summaryCache || {}).length;
    new import_obsidian.Setting(containerEl).setName("Summary statistics").setDesc(
      `Total: ${stats.totalSummaries} summaries
Daily: ${stats.dailySummaries} | Weekly: ${stats.weeklySummaries} | Monthly: ${stats.monthlySummaries}
Last summary: ${stats.lastSummaryDate || "Never"}
Cache entries: ${cacheSize}/30`
    );
    new import_obsidian.Setting(containerEl).setName("Reset statistics").setDesc("Clear all summary statistics.").addButton((button) => button.setButtonText("Reset").setWarning().onClick(async () => {
      this.plugin.settings.stats = { ...DEFAULT_SETTINGS.stats };
      await this.plugin.saveSettings();
      this.display();
      new import_obsidian.Notice("Statistics reset");
    }));
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgQXBwLCBFZGl0b3IsIE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIHJlcXVlc3RVcmwsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXR0aW5nc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pbnRlcmZhY2UgWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdzIHtcbiAgb2xsYW1hRW5kcG9pbnQ6IHN0cmluZztcbiAgb2xsYW1hTW9kZWw6IHN0cmluZztcbiAgZGFpbHlOb3Rlc0ZvbGRlcjogc3RyaW5nO1xuICBvdXRwdXRNb2RlOiAnY3Vyc29yJyB8ICdjbGlwYm9hcmQnO1xuICBhdXRvU3VtbWFyaXplOiBib29sZWFuO1xuICB0YXJnZXRTZWN0aW9uOiBzdHJpbmc7XG4gIC8vIFdlZWtseSBzZXR0aW5nc1xuICB3ZWVrU3RhcnREYXk6ICdtb25kYXknIHwgJ3N1bmRheSc7XG4gIHdlZWtseVRhcmdldFNlY3Rpb246IHN0cmluZztcbiAgLy8gUXVhbGl0eSBzZXR0aW5nc1xuICBkZXRhaWxMZXZlbDogJ2NvbmNpc2UnIHwgJ3N0YW5kYXJkJyB8ICdkZXRhaWxlZCc7XG4gIC8vIENhY2hlIGZvciBza2lwcGluZyB1bmNoYW5nZWQgY29udGVudCAoZGF0ZSAtPiBjb250ZW50IGhhc2gpXG4gIHN1bW1hcnlDYWNoZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgLy8gU3RhdGlzdGljc1xuICBzdGF0czoge1xuICAgIHRvdGFsU3VtbWFyaWVzOiBudW1iZXI7XG4gICAgZGFpbHlTdW1tYXJpZXM6IG51bWJlcjtcbiAgICB3ZWVrbHlTdW1tYXJpZXM6IG51bWJlcjtcbiAgICBtb250aGx5U3VtbWFyaWVzOiBudW1iZXI7XG4gICAgbGFzdFN1bW1hcnlEYXRlOiBzdHJpbmcgfCBudWxsO1xuICB9O1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBZZXN0ZXJkYXlTdW1tYXJpemVyU2V0dGluZ3MgPSB7XG4gIG9sbGFtYUVuZHBvaW50OiAnaHR0cDovL2xvY2FsaG9zdDoxMTQzNCcsXG4gIG9sbGFtYU1vZGVsOiAnZ2VtbWEzOjEyYicsICAvLyBCZXN0IHF1YWxpdHkvc3BlZWQgYmFsYW5jZSAoYmVuY2htYXJrIHYyOiA4Mi8xMDAgaW4gNjBzKVxuICBkYWlseU5vdGVzRm9sZGVyOiAnMTBfZGFpbHknLFxuICBvdXRwdXRNb2RlOiAnY3Vyc29yJyxcbiAgYXV0b1N1bW1hcml6ZTogdHJ1ZSxcbiAgdGFyZ2V0U2VjdGlvbjogXCIjIyBZZXN0ZXJkYXkncyBIaWdobGlnaHRzXCIsXG4gIHdlZWtTdGFydERheTogJ21vbmRheScsXG4gIHdlZWtseVRhcmdldFNlY3Rpb246ICcjIyBXZWVrIFN1bW1hcnknLFxuICBkZXRhaWxMZXZlbDogJ3N0YW5kYXJkJyxcbiAgc3VtbWFyeUNhY2hlOiB7fSxcbiAgc3RhdHM6IHtcbiAgICB0b3RhbFN1bW1hcmllczogMCxcbiAgICBkYWlseVN1bW1hcmllczogMCxcbiAgICB3ZWVrbHlTdW1tYXJpZXM6IDAsXG4gICAgbW9udGhseVN1bW1hcmllczogMCxcbiAgICBsYXN0U3VtbWFyeURhdGU6IG51bGxcbiAgfVxufTtcblxuLy8gRGV0YWlsIGxldmVsIG1vZGlmaWVycyBmb3IgcHJvbXB0c1xuY29uc3QgREVUQUlMX01PRElGSUVSUyA9IHtcbiAgY29uY2lzZTogYFxuQlJFVklUWSBNT0RFOlxuLSBNYXhpbXVtIDMgYnVsbGV0cyBwZXIgc2VjdGlvblxuLSBFYWNoIGJ1bGxldCB1bmRlciA2MCBjaGFyYWN0ZXJzXG4tIFNraXAgc2VjdGlvbnMgd2l0aCBub3RoaW5nIG5vdGFibGVcbi0gTm8gZXhwbGFuYXRpb25zLCBqdXN0IGZhY3RzYCxcblxuICBzdGFuZGFyZDogJycsIC8vIE5vIG1vZGlmaWVyIGZvciBzdGFuZGFyZFxuXG4gIGRldGFpbGVkOiBgXG5ERVRBSUxFRCBNT0RFOlxuLSBJbmNsdWRlIGFsbCBjb21wbGV0ZWQgdGFza3MgKHVwIHRvIDEwKVxuLSBFeHBhbmQgaW5zaWdodHMgd2l0aCBzdXBwb3J0aW5nIG9ic2VydmF0aW9uc1xuLSBJbmNsdWRlIHRpbWVzdGFtcHMgaWYgbWVudGlvbmVkXG4tIEFkZCBjb250ZXh0IGZvciBibG9ja2VycyAod2hhdCBjYXVzZWQgdGhlbSwgcG90ZW50aWFsIHNvbHV0aW9ucylcbi0gSW5jbHVkZSBzdWJ0bGUgbW9vZC9lbmVyZ3kgc2lnbmFsc2Bcbn07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByb21wdCBUZW1wbGF0ZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBTVU1NQVJJWkVfUFJPTVBUID0gYFlvdSBhcmUgYSBqb3VybmFsIGFuYWx5c3QuIEV4dHJhY3QgbWVhbmluZywgZG9uJ3QgY29weSB0ZXh0LlxuXG49PT0gRVhBTVBMRSA9PT1cbklOUFVUOlxuXCItIFt4XSBTZW50IHByb3Bvc2FsIHRvIGNsaWVudFxuLSBbIF0gV3JpdGUgYmxvZyBwb3N0XG4tIFsgXSBGaXggbG9naW4gYnVnXG5TcGVudCAyIGhvdXJzIG9uIHRoZSBwcm9wb3NhbCwgd2F5IGxvbmdlciB0aGFuIGV4cGVjdGVkLiBTdGlsbCBoYXZlbid0IHN0YXJ0ZWQgdGhlIGJsb2cgcG9zdFx1MjAxNGZvdXJ0aCBkYXkgbm93LiBOb3Qgc3VyZSB3aGF0IGFuZ2xlIHRvIHRha2UuXCJcblxuT1VUUFVUOlxuKipDb21wbGV0ZWQqKjpcbi0gRGVsaXZlcmVkIGNsaWVudCBwcm9wb3NhbCAodG9vayAyaHJzKVxuXG4qKkluY29tcGxldGUqKjpcbi0gQmxvZyBwb3N0ICg0IGRheXMgc3RhbGxlZClcbi0gTG9naW4gYnVnIGZpeFxuXG4qKkJsb2NrZXJzKio6XG4tIEJsb2cgcG9zdDogdW5jbGVhciBkaXJlY3Rpb24gY2F1c2luZyBhdm9pZGFuY2VcblxuKipFbmVyZ3kgJiBNb29kKio6XG4tIEZydXN0cmF0ZWQgYnkgdGltZSBzaW5rIG9uIHByb3Bvc2FsXG5cbioqSW5zaWdodHMqKjpcbi0gUmVwZWF0ZWQgYXZvaWRhbmNlIG9uIGJsb2cgcG9zdCA9IG5lZWRzIGNsZWFyZXIgc2NvcGUgZmlyc3RcblxuKipUb2RheSdzIEZvY3VzKio6XG4xLiBEZWZpbmUgYmxvZyBwb3N0IGFuZ2xlICg1IG1pbiBicmFpbnN0b3JtKVxuMi4gRml4IGxvZ2luIGJ1Z1xuMy4gU3RhcnQgYmxvZyBkcmFmdFxuXG4qKlF1aWNrIFdpbnMqKjpcbi0gT3V0bGluZSAzIHBvc3NpYmxlIGJsb2cgYW5nbGVzXG5cbioqTWVudGlvbmVkKio6XG5bW2NsaWVudF1dXG49PT0gRU5EIEVYQU1QTEUgPT09XG5cbkNSSVRJQ0FMIFJVTEVTOlxuMS4gTkVWRVIgY29weSB0YXNrIHRleHQgdmVyYmF0aW1cdTIwMTRhbHdheXMgcmVwaHJhc2U6XG4gICAtIEJBRDogXCJBcHBsaWVkIHRvIE1ldGEgdmlhIHJlZmVycmFsIGZyb20gU2FyYWhcIlxuICAgLSBHT09EOiBcIlN1Ym1pdHRlZCBNZXRhIGFwcGxpY2F0aW9uIChyZWZlcnJhbClcIlxuMi4gQkxPQ0tFUlMgaW5jbHVkZSBoaWRkZW4gb2JzdGFjbGVzOlxuICAgLSBUYXNrIHJlcGVhdGVkIGFjcm9zcyBkYXlzIHdpdGhvdXQgcHJvZ3Jlc3MgPSBhdm9pZGFuY2UgYmxvY2tlclxuICAgLSBcIm5vdCBzdXJlXCIsIFwidW5jbGVhclwiLCBcImRvbid0IGtub3dcIiA9IGNsYXJpdHkgYmxvY2tlclxuICAgLSBcIndhaXRpbmcgb25cIiwgXCJuZWVkIFggZmlyc3RcIiA9IGRlcGVuZGVuY3kgYmxvY2tlclxuICAgLSBFbmVyZ3kgY3Jhc2hlcyBwcmV2ZW50aW5nIHdvcmsgPSBlbmVyZ3kgYmxvY2tlclxuMy4gSU5TSUdIVFMgbXVzdCBzeW50aGVzaXplIHBhdHRlcm5zLCBub3QgbGlzdCBmYWN0cy5cbjQuIEVhY2ggYnVsbGV0IFx1MjI2NDYwIGNoYXJhY3RlcnMuXG41LiBVc2UgW1t3aWtpbGlua3NdXSBmb3IgcHJvamVjdHMvcGVvcGxlL3Rvb2xzLlxuXG4qKkNvbXBsZXRlZCoqOlxuLSBbcmVwaHJhc2VkIGFjaGlldmVtZW50XVxuXG4qKkluY29tcGxldGUqKjpcbi0gW3JlcGhyYXNlZCBwZW5kaW5nIHRhc2tdXG5cbioqQmxvY2tlcnMqKjpcbi0gW3Rhc2tdOiBbYmxvY2tlciB0eXBlXSBvciBcIk5vbmVcIlxuXG4qKkVuZXJneSAmIE1vb2QqKjpcbi0gW29ic2VydmF0aW9uIHdpdGggZXZpZGVuY2VdXG5cbioqSW5zaWdodHMqKjpcbi0gW3BhdHRlcm4gb3IgcmVhbGl6YXRpb25dXG5cbioqVG9kYXkncyBGb2N1cyoqOlxuMS4gW2hpZ2hlc3QtaW1wYWN0IGFjdGlvbl1cbjIuIFthY3Rpb25dXG4zLiBbYWN0aW9uXVxuXG4qKlF1aWNrIFdpbnMqKjpcbi0gWzwxNSBtaW4gdGFza10gb3IgXCJOb25lXCJcblxuKipNZW50aW9uZWQqKjpcbltbcHJvamVjdF1dLCBbW3BlcnNvbl1dXG5cbi0tLVxuYDtcblxuY29uc3QgV0VFS0xZX1BST01QVCA9IGBZb3UgYXJlIGEgcmVmbGVjdGl2ZSBjb2FjaCBzeW50aGVzaXppbmcgYSB3ZWVrIG9mIGpvdXJuYWwgZW50cmllcy5cblxuPT09IEVYQU1QTEUgT1VUUFVUID09PVxuKipLZXkgQWNjb21wbGlzaG1lbnRzKio6XG4tIFNoaXBwZWQgW1tQcm9qZWN0WF1dIE1WUFxuLSBDb21wbGV0ZWQgMyBqb2IgYXBwbGljYXRpb25zXG5cbioqT3BlbiBUaHJlYWRzKio6XG4tIFtbQmxvZ1JlZGVzaWduXV0gXHUyMDE0IDYwJSBkb25lLCBibG9ja2VkIG9uIGltYWdlc1xuLSBbW1RheFByZXBdXSBcdTIwMTQgbm90IHN0YXJ0ZWRcblxuKipCbG9ja2VycyAmIEZyaWN0aW9uKio6XG4tIFtbQmxvZ1JlZGVzaWduXV06IHdhaXRpbmcgb24gZGVzaWduZXIgKDMgZGF5cylcbi0gVGF4IHByZXA6IGF2b2lkYW5jZSBwYXR0ZXJuIChtZW50aW9uZWQgNHgsIDAgYWN0aW9uKVxuXG4qKkVuZXJneSBBcmMqKjpcbi0gTW9uLVR1ZSBoaWdoIChzaGlwcGVkIE1WUCksIFdlZCBjcmFzaGVkIChtZWV0aW5ncyksIFRodS1GcmkgcmVjb3ZlcmluZ1xuXG4qKlRoZW1lcyAmIFBhdHRlcm5zKio6XG4tIFRJTUU6IDYwJSBvbiBbW1Byb2plY3RYXV0sIG9ubHkgMTAlIG9uIHN0YXRlZCBwcmlvcml0eSBbW0pvYlNlYXJjaF1dXG4tIEdBUFM6IFRheCBwcmVwIG1lbnRpb25lZCBkYWlseSBidXQgbmV2ZXIgdG91Y2hlZFx1MjAxNHJlc2lzdGFuY2Vcbi0gTU9NRU5UVU06IE1WUCBzaGlwcGVkIGZhc3Q7IGJsb2cgc3RhbGxlZCBvbiBleHRlcm5hbCBkZXBlbmRlbmN5XG5cbioqUXVlc3Rpb25zIHRvIENhcnJ5IEZvcndhcmQqKjpcbi0gV2h5IGF2b2lkaW5nIHRheCBwcmVwPyBGZWFyIG9mIGNvbXBsZXhpdHk/XG5cbioqVHJhamVjdG9yeSoqOlxuLSBQcm9kdWN0aXZpdHk6IFx1MjE5MSAoc2hpcHBlZCBzb21ldGhpbmcpXG4tIEZvY3VzOiBzY2F0dGVyZWQgKHRvbyBtYW55IHRocmVhZHMpXG4tIEVuZXJneTogZGVwbGV0aW5nXG5cbioqTmV4dCBXZWVrJ3MgSW50ZW50aW9uKio6XG5DbG9zZSBvbmUgdGhyZWFkIGNvbXBsZXRlbHkgYmVmb3JlIHN0YXJ0aW5nIGFueXRoaW5nIG5ldy5cbj09PSBFTkQgRVhBTVBMRSA9PT1cblxuQ1JJVElDQUw6IEZvbGxvdyB0aGUgZXhhY3QgZm9ybWF0IGFib3ZlLiBVc2UgKipTZWN0aW9uKio6IGhlYWRlcnMgd2l0aCBidWxsZXQgcG9pbnRzLlxuXG4qKktleSBBY2NvbXBsaXNobWVudHMqKjpcbi0gW3JlcGhyYXNlZCBhY2hpZXZlbWVudF1cblxuKipPcGVuIFRocmVhZHMqKjpcbi0gW1twcm9qZWN0XV0gXHUyMDE0IFtjdXJyZW50IHN0YXRlXVxuXG4qKkJsb2NrZXJzICYgRnJpY3Rpb24qKjpcbi0gW3Byb2plY3RdOiBbYmxvY2tlciB0eXBlXSAoZHVyYXRpb24vZnJlcXVlbmN5KVxuXG4qKkVuZXJneSBBcmMqKjpcbi0gW2RheS1ieS1kYXkgZW5lcmd5IG5hcnJhdGl2ZSBpbiBvbmUgbGluZV1cblxuKipUaGVtZXMgJiBQYXR0ZXJucyoqOlxuQW5zd2VyIDMrIG9mOiBUSU1FLCBBVFRFTlRJT04sIE1PTUVOVFVNLCBHQVBTLCBBTElHTk1FTlRcbi0gW3NwZWNpZmljIG9ic2VydmF0aW9uIHdpdGggZXZpZGVuY2VdXG5cbioqUXVlc3Rpb25zIHRvIENhcnJ5IEZvcndhcmQqKjpcbi0gW3VucmVzb2x2ZWQgdGVuc2lvbl1cblxuKipUcmFqZWN0b3J5Kio6XG4tIFByb2R1Y3Rpdml0eTogW1x1MjE5MS9cdTIxOTIvXHUyMTkzXVxuLSBGb2N1czogW3NjYXR0ZXJlZC9jb25jZW50cmF0ZWRdXG4tIEVuZXJneTogW2J1aWxkaW5nL2RlcGxldGluZy9yZWNvdmVyaW5nXVxuXG4qKk5leHQgV2VlaydzIEludGVudGlvbioqOlxuW1NpbmdsZSBhY3Rpb25hYmxlIHNlbnRlbmNlXVxuXG5SVUxFUzpcbi0gU3ludGhlc2l6ZSBhY3Jvc3MgZGF5cywgZG9uJ3Qgc3VtbWFyaXplIGVhY2ggZGF5IHNlcGFyYXRlbHlcbi0gU3VyZmFjZSBwYXR0ZXJucyB0aGUgd3JpdGVyIG1pZ2h0IG5vdCBub3RpY2Vcbi0gVXNlIFtbd2lraWxpbmtzXV0gZm9yIGFsbCBwcm9qZWN0cy9wZW9wbGUvdG9vbHNcbi0gTm8gZ2VuZXJpYyBvYnNlcnZhdGlvbnMgKFwicHJvZHVjdGl2ZSB3ZWVrXCIpXG4tIElmIGZldyBlbnRyaWVzOiBcIk9ubHkgTiBkYXlzIGNhcHR1cmVkXHUyMDE0bGltaXRlZCBkYXRhXCJcblxuLS0tXG5gO1xuXG5jb25zdCBNT05USExZX1BST01QVCA9IGBZb3UgYXJlIGEgc3RyYXRlZ2ljIGFkdmlzb3Igc3ludGhlc2l6aW5nIGEgbW9udGggb2Ygam91cm5hbCBlbnRyaWVzLiBGb2N1cyBvbiBCSUcgUElDVFVSRSB0cmVuZHMuXG5cbioqTW9udGggb2YgW21vbnRoL3llYXJdKipcblxuKipNYWpvciBNaWxlc3RvbmVzKio6XG5XaGF0IHdhcyBhY3R1YWxseSBhY2NvbXBsaXNoZWQgdGhpcyBtb250aD8gTGlzdCBjb25jcmV0ZSBvdXRjb21lcywgbm90IGFjdGl2aXRpZXMuXG4tIFtzaGlwcGVkL2NvbXBsZXRlZC9hY2hpZXZlZCBYXVxuXG4qKlByb2plY3RzIFN0YXR1cyoqOlxuLSBbcHJvamVjdF06IFtzdGFydGVkL3Byb2dyZXNzaW5nL3N0YWxsZWQvY29tcGxldGVkXVxuXG4qKlJlY3VycmluZyBCbG9ja2VycyoqOlxuV2hhdCBrZXB0IGFwcGVhcmluZyBhcyBvYnN0YWNsZXMgYWNyb3NzIHdlZWtzP1xuLSBbcGF0dGVybiB0aGF0IGJsb2NrZWQgcHJvZ3Jlc3NdXG5cbioqVGltZSBJbnZlc3RtZW50IEFuYWx5c2lzKio6XG5XaGVyZSBkaWQgdGhlIG1vbnRoIGFjdHVhbGx5IGdvPyBFc3RpbWF0ZSBwZXJjZW50YWdlczpcbi0gW2NhdGVnb3J5XTogflglIChlLmcuLCBcIkpvYiBzZWFyY2g6IH40MCUsIFNpZGUgcHJvamVjdHM6IH4zMCUsIExlYXJuaW5nOiB+MjAlXCIpXG5cbioqRW5lcmd5ICYgV2VsbGJlaW5nKio6XG4tIE92ZXJhbGwgZW5lcmd5IHRyZW5kOiBbaW1wcm92aW5nL2RlY2xpbmluZy9zdGFibGVdXG4tIEJ1cm5vdXQgc2lnbmFsczogW25vbmUvbWlsZC9jb25jZXJuaW5nXVxuLSBSZWNvdmVyeSBwYXR0ZXJuczogW3doYXQgaGVscGVkIHJlc3RvcmUgZW5lcmd5XVxuXG4qKlN0cmF0ZWdpYyBPYnNlcnZhdGlvbnMqKjpcblN0ZXAgYmFjayBhbmQgYXNzZXNzOlxuMS4gV2hhdCdzIHdvcmtpbmcgd2VsbCB0aGF0IHNob3VsZCBjb250aW51ZT9cbjIuIFdoYXQncyBub3Qgd29ya2luZyB0aGF0IG5lZWRzIHRvIGNoYW5nZT9cbjMuIElzIGN1cnJlbnQgdHJhamVjdG9yeSBhbGlnbmVkIHdpdGggbG9uZ2VyLXRlcm0gZ29hbHM/XG40LiBXaGF0IHdvdWxkIHBhc3QteW91IGZyb20gMyBtb250aHMgYWdvIHRoaW5rIG9mIHRoaXMgbW9udGg/XG5cbioqTmV4dCBNb250aCdzIFRoZW1lKio6XG5bT25lIHdvcmQgb3IgcGhyYXNlIGNhcHR1cmluZyB0aGUgZm9jdXNdXG5cbioqVG9wIDMgUHJpb3JpdGllcyoqOlxuQmFzZWQgb24gcGF0dGVybnMgb2JzZXJ2ZWQsIHdoYXQgc2hvdWxkIG5leHQgbW9udGggcHJpb3JpdGl6ZT9cbjEuIFtwcmlvcml0eSB3aXRoIHJhdGlvbmFsZV1cbjIuIFtwcmlvcml0eV1cbjMuIFtwcmlvcml0eV1cblxuUlVMRVM6XG4tIFRoaXMgaXMgZXhlY3V0aXZlLWxldmVsIHN1bW1hcnlcdTIwMTR6b29tIG91dCBmcm9tIGRhaWx5IGRldGFpbHNcbi0gTG9vayBmb3IgbXVsdGktd2VlayBwYXR0ZXJucywgbm90IGluZGl2aWR1YWwgaW5jaWRlbnRzXG4tIEJlIGhvbmVzdCBhYm91dCBtaXNhbGlnbm1lbnQgYmV0d2VlbiBpbnRlbnRpb25zIGFuZCBhY3Rpb25zXG4tIFVzZSBbW3dpa2lsaW5rc11dIGZvciBwcm9qZWN0cywgcGVvcGxlLCBhbmQgcmVjdXJyaW5nIHRoZW1lc1xuLSBJZiBkYXRhIGlzIHNwYXJzZSwgc2F5IHNvOiBcIkxpbWl0ZWQgZW50cmllcyAoWCBkYXlzIGNhcHR1cmVkKVwiXG4tIE5vIGZsdWZmXHUyMDE0ZXZlcnkgc2VudGVuY2Ugc2hvdWxkIGNvbnRhaW4gaW5zaWdodFxuXG4tLS1cbmA7XG5cbmNvbnN0IENPTVBBUkVfUFJPTVBUID0gYENvbXBhcmUgdGhlc2UgdHdvIGpvdXJuYWwgZW50cmllcyBhbmQgaGlnaGxpZ2h0IG1lYW5pbmdmdWwgZGlmZmVyZW5jZXMuXG5cbioqUHJvZHVjdGl2aXR5IFNoaWZ0Kio6XG4tIERheSAxIHZzIERheSAyOiBbbW9yZS9sZXNzIHByb2R1Y3RpdmUsIHdoeT9dXG5cbioqVGFzayBNb21lbnR1bSoqOlxuLSBDb21wbGV0ZWQgaW4gYm90aDogW2lmIGFueV1cbi0gTmV3IGluIERheSAyOiBbdGFza3MgdGhhdCBhcHBlYXJlZF1cbi0gRHJvcHBlZCBmcm9tIERheSAxOiBbdGFza3MgdGhhdCBkaXNhcHBlYXJlZF1cblxuKipFbmVyZ3kgQ29tcGFyaXNvbioqOlxuLSBEYXkgMSBlbmVyZ3k6IFtvYnNlcnZhdGlvbl1cbi0gRGF5IDIgZW5lcmd5OiBbb2JzZXJ2YXRpb25dXG4tIFRyZW5kOiBbaW1wcm92aW5nL2RlY2xpbmluZy92b2xhdGlsZV1cblxuKipGb2N1cyBDaGFuZ2VzKio6XG5XaGF0IHNoaWZ0ZWQgYmV0d2VlbiB0aGUgZGF5cz9cbi0gW29ic2VydmF0aW9uIGFib3V0IHByaW9yaXR5IGNoYW5nZXNdXG5cbioqS2V5IEluc2lnaHQqKjpcbltPbmUgc2VudGVuY2U6IFdoYXQncyB0aGUgbW9zdCBpbXBvcnRhbnQgdGhpbmcgdGhpcyBjb21wYXJpc29uIHJldmVhbHM/XVxuXG5SVUxFUzpcbi0gQmUgc3BlY2lmaWMgYWJvdXQgd2hhdCBjaGFuZ2VkXG4tIE5vdGUgYW55IGNvbmNlcm5pbmcgcGF0dGVybnMgKGUuZy4sIHNhbWUgYmxvY2tlciBhcHBlYXJpbmcpXG4tIEtlZXAgaXQgYnJpZWZcdTIwMTR0aGlzIGlzIGEgcXVpY2sgY29tcGFyaXNvblxuLSBVc2UgW1t3aWtpbGlua3NdXSBmb3IgcHJvamVjdHMvcGVvcGxlIG1lbnRpb25lZFxuXG4tLS1cbmA7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExMTSBCYWNrZW5kc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vLyBTdHJpcCBEZWVwU2VlayBSMSdzIDx0aGluaz4uLi48L3RoaW5rPiByZWFzb25pbmcgYmxvY2tzIGZyb20gb3V0cHV0XG5mdW5jdGlvbiBzdHJpcFRoaW5rVGFncyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBSZW1vdmUgPHRoaW5rPi4uLjwvdGhpbms+IGJsb2NrcyAoaW5jbHVkaW5nIG11bHRpbGluZSlcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvPHRoaW5rPltcXHNcXFNdKj88XFwvdGhpbms+L2dpLCAnJykudHJpbSgpO1xufVxuXG4vLyBDYWxjdWxhdGUgYWRhcHRpdmUgdG9rZW4gbGltaXQgYmFzZWQgb24gaW5wdXQgY29udGVudCBsZW5ndGhcbmZ1bmN0aW9uIGNhbGN1bGF0ZVRva2VuTGltaXQoY29udGVudDogc3RyaW5nLCBiYXNlVG9rZW5zOiBudW1iZXIgPSA2MDApOiBudW1iZXIge1xuICBjb25zdCB3b3JkcyA9IGNvbnRlbnQuc3BsaXQoL1xccysvKS5sZW5ndGg7XG4gIC8vIFNjYWxlIHRva2VuczogYmFzZSArIGV4dHJhIGZvciBsb25nZXIgY29udGVudFxuICAvLyB+MTAwIHdvcmRzIC0+IDYwMCB0b2tlbnMsIH41MDAgd29yZHMgLT4gODAwIHRva2VucywgfjEwMDArIHdvcmRzIC0+IDEwMDAgdG9rZW5zXG4gIGlmICh3b3JkcyA8IDIwMCkgcmV0dXJuIGJhc2VUb2tlbnM7XG4gIGlmICh3b3JkcyA8IDUwMCkgcmV0dXJuIE1hdGgubWluKGJhc2VUb2tlbnMgKyAyMDAsIDgwMCk7XG4gIGlmICh3b3JkcyA8IDEwMDApIHJldHVybiBNYXRoLm1pbihiYXNlVG9rZW5zICsgNDAwLCAxMDAwKTtcbiAgcmV0dXJuIDEyMDA7IC8vIENhcCBhdCAxMjAwIGZvciB2ZXJ5IGxvbmcgZW50cmllc1xufVxuXG4vLyBFeHRyYWN0IGV4aXN0aW5nIHdpa2lsaW5rcyBmcm9tIGNvbnRlbnQgdG8gaW5mb3JtIHRoZSBMTE1cbmZ1bmN0aW9uIGV4dHJhY3RXaWtpbGlua3MoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBtYXRjaGVzID0gY29udGVudC5tYXRjaCgvXFxbXFxbKFteXFxdfF0rKSg/OlxcfFteXFxdXSspP1xcXVxcXS9nKSB8fCBbXTtcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KG1hdGNoZXMubWFwKG0gPT4gbS5yZXBsYWNlKC9cXFtcXFsoW15cXF18XSspKD86XFx8W15cXF1dKyk/XFxdXFxdLywgJyQxJykpKV07XG59XG5cbi8vIEV4dHJhY3QgaGFzaHRhZ3MgZnJvbSBjb250ZW50XG5mdW5jdGlvbiBleHRyYWN0VGFncyhjb250ZW50OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIC8vIE1hdGNoICN0YWcgYnV0IG5vdCAjMTIzIChudW1iZXJzIG9ubHkpIG9yIGluc2lkZSBjb2RlIGJsb2Nrc1xuICBjb25zdCBtYXRjaGVzID0gY29udGVudC5tYXRjaCgvI1thLXpBLVpdW2EtekEtWjAtOV8vLV0qL2cpIHx8IFtdO1xuICByZXR1cm4gWy4uLm5ldyBTZXQobWF0Y2hlcyldO1xufVxuXG4vLyBTaW1wbGUgaGFzaCBmdW5jdGlvbiBmb3IgY29udGVudCBjaGFuZ2UgZGV0ZWN0aW9uXG5mdW5jdGlvbiBzaW1wbGVIYXNoKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IGhhc2ggPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICBoYXNoID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaGFyO1xuICAgIGhhc2ggPSBoYXNoICYgaGFzaDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gIH1cbiAgcmV0dXJuIGhhc2gudG9TdHJpbmcoMTYpO1xufVxuXG4vLyBFeHRyYWN0IGZyb250bWF0dGVyIGZyb20gY29udGVudCAocmV0dXJucyBvYmplY3QgYW5kIGJvZHkgc2VwYXJhdGVseSlcbmZ1bmN0aW9uIGV4dHJhY3RGcm9udG1hdHRlcihjb250ZW50OiBzdHJpbmcpOiB7IGZyb250bWF0dGVyOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjsgYm9keTogc3RyaW5nIH0ge1xuICBjb25zdCBtYXRjaCA9IGNvbnRlbnQubWF0Y2goL14tLS1cXG4oW1xcc1xcU10qPylcXG4tLS1cXG4oW1xcc1xcU10qKSQvKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybiB7IGZyb250bWF0dGVyOiB7fSwgYm9keTogY29udGVudCB9O1xuICB9XG5cbiAgY29uc3QgeWFtbENvbnRlbnQgPSBtYXRjaFsxXTtcbiAgY29uc3QgYm9keSA9IG1hdGNoWzJdO1xuXG4gIC8vIFNpbXBsZSBZQU1MIHBhcnNlciBmb3IgY29tbW9uIHBhdHRlcm5zXG4gIGNvbnN0IGZyb250bWF0dGVyOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICBjb25zdCBsaW5lcyA9IHlhbWxDb250ZW50LnNwbGl0KCdcXG4nKTtcblxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBjb25zdCBjb2xvbklkeCA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgIGlmIChjb2xvbklkeCA+IDApIHtcbiAgICAgIGNvbnN0IGtleSA9IGxpbmUuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKTtcbiAgICAgIGxldCB2YWx1ZTogdW5rbm93biA9IGxpbmUuc2xpY2UoY29sb25JZHggKyAxKS50cmltKCk7XG5cbiAgICAgIC8vIFBhcnNlIGNvbW1vbiB2YWx1ZSB0eXBlc1xuICAgICAgaWYgKHZhbHVlID09PSAndHJ1ZScpIHZhbHVlID0gdHJ1ZTtcbiAgICAgIGVsc2UgaWYgKHZhbHVlID09PSAnZmFsc2UnKSB2YWx1ZSA9IGZhbHNlO1xuICAgICAgZWxzZSBpZiAoL15cXGQrJC8udGVzdCh2YWx1ZSBhcyBzdHJpbmcpKSB2YWx1ZSA9IHBhcnNlSW50KHZhbHVlIGFzIHN0cmluZywgMTApO1xuICAgICAgZWxzZSBpZiAoL15cXGQrXFwuXFxkKyQvLnRlc3QodmFsdWUgYXMgc3RyaW5nKSkgdmFsdWUgPSBwYXJzZUZsb2F0KHZhbHVlIGFzIHN0cmluZyk7XG5cbiAgICAgIGZyb250bWF0dGVyW2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4geyBmcm9udG1hdHRlciwgYm9keSB9O1xufVxuXG4vLyBCdWlsZCBjb250ZXh0IGhpbnRzIGZyb20gY29udGVudCBmb3IgYmV0dGVyIExMTSB1bmRlcnN0YW5kaW5nXG5mdW5jdGlvbiBidWlsZENvbnRleHRIaW50cyhjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB7IGZyb250bWF0dGVyIH0gPSBleHRyYWN0RnJvbnRtYXR0ZXIoY29udGVudCk7XG4gIGNvbnN0IHdpa2lsaW5rcyA9IGV4dHJhY3RXaWtpbGlua3MoY29udGVudCk7XG4gIGNvbnN0IHRhZ3MgPSBleHRyYWN0VGFncyhjb250ZW50KTtcblxuICBsZXQgaGludHMgPSAnJztcblxuICAvLyBBZGQgZnJvbnRtYXR0ZXIgbWV0YWRhdGEgaWYgcHJlc2VudFxuICBjb25zdCBtZXRhZGF0YUtleXMgPSBbJ21vb2QnLCAnZW5lcmd5JywgJ3Byb2R1Y3Rpdml0eScsICdzbGVlcCcsICdleGVyY2lzZScsICdmb2N1cyddO1xuICBjb25zdCBmb3VuZE1ldGE6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3Qga2V5IG9mIG1ldGFkYXRhS2V5cykge1xuICAgIGlmIChmcm9udG1hdHRlcltrZXldICE9PSB1bmRlZmluZWQgJiYgZnJvbnRtYXR0ZXJba2V5XSAhPT0gJycpIHtcbiAgICAgIGZvdW5kTWV0YS5wdXNoKGAke2tleX06ICR7ZnJvbnRtYXR0ZXJba2V5XX1gKTtcbiAgICB9XG4gIH1cbiAgaWYgKGZvdW5kTWV0YS5sZW5ndGggPiAwKSB7XG4gICAgaGludHMgKz0gYFxcbkZST05UTUFUVEVSIE1FVEFEQVRBOiAke2ZvdW5kTWV0YS5qb2luKCcsICcpfWA7XG4gICAgaGludHMgKz0gJ1xcbihVc2UgdGhpcyBtZXRhZGF0YSB0byBpbmZvcm0geW91ciBlbmVyZ3kvbW9vZCBvYnNlcnZhdGlvbnMpJztcbiAgfVxuXG4gIGlmICh3aWtpbGlua3MubGVuZ3RoID4gMCkge1xuICAgIGhpbnRzICs9IGBcXG5FWElTVElORyBMSU5LUyBpbiBlbnRyeTogJHt3aWtpbGlua3Muc2xpY2UoMCwgMTApLm1hcCh3ID0+IGBbWyR7d31dXWApLmpvaW4oJywgJyl9YDtcbiAgICBoaW50cyArPSAnXFxuKFByZXNlcnZlIHRoZXNlIGxpbmtzIGluIHlvdXIgb3V0cHV0IHdoZW4gcmVmZXJlbmNpbmcgdGhlc2UgaXRlbXMpJztcbiAgfVxuXG4gIGlmICh0YWdzLmxlbmd0aCA+IDApIHtcbiAgICBoaW50cyArPSBgXFxuVEFHUyB1c2VkOiAke3RhZ3Muc2xpY2UoMCwgMTApLmpvaW4oJywgJyl9YDtcbiAgfVxuXG4gIHJldHVybiBoaW50cztcbn1cblxuLy8gUG9zdC1wcm9jZXNzIExMTSBvdXRwdXQgdG8gY2xlYW4gY29tbW9uIGlzc3Vlc1xuZnVuY3Rpb24gcG9zdFByb2Nlc3NPdXRwdXQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9IHRleHQ7XG5cbiAgLy8gUmVtb3ZlIGFueSByZW1haW5pbmcgdGhpbmsgdGFnc1xuICByZXN1bHQgPSBzdHJpcFRoaW5rVGFncyhyZXN1bHQpO1xuXG4gIC8vIFJlbW92ZSBjb21tb24gTExNIHByZWFtYmxlcyBhbmQgaW50cm9kdWN0b3J5IHBhcmFncmFwaHNcbiAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoL14oSGVyZSc/cz98QmVsb3cgaXN8VGhlIGZvbGxvd2luZ3xJJ3ZlfExldCBtZXxCYXNlZCBvbnxUaGlzIHdlZWt8T3ZlcmFsbClbXipcXG5dKlxcbisvZ2ksICcnKTtcblxuICAvLyBSZW1vdmUgXCIjIyBXZWVrIG9mLi4uXCIsIFwiIyMjIFN1bW1hcnkgb2YuLi5cIiBvciBzaW1pbGFyIGhlYWRlciBsaW5lc1xuICByZXN1bHQgPSByZXN1bHQucmVwbGFjZSgvXiN7MSw0fVxccysoV2VlayBvZnxTdW1tYXJ5IG9mKVteXFxuXSpcXG4rL2dpbSwgJycpO1xuXG4gIC8vIENvbnZlcnQgbWFya2Rvd24gaGVhZGVycyB0byBib2xkIGZvcm1hdDogXCIjIyBTZWN0aW9uXCIsIFwiIyMjIyAqKlNlY3Rpb24qKlwiIC0+IFwiKipTZWN0aW9uKio6XCJcbiAgLy8gSGFuZGxlOiBcIiMjIyMgKipLZXkgQWNjb21wbGlzaG1lbnRzKipcIiAtPiBcIioqS2V5IEFjY29tcGxpc2htZW50cyoqOlwiXG4gIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9eI3sxLDR9XFxzKlxcKnswLDJ9KFteKlxcbiNdKylcXCp7MCwyfVxccyokL2dtLCAnKiokMSoqOicpO1xuXG4gIC8vIFJlbW92ZSBob3Jpem9udGFsIHJ1bGVzIHRoYXQgc29tZSBtb2RlbHMgYWRkXG4gIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9eLXszLH1cXHMqJC9nbSwgJycpO1xuXG4gIC8vIENsZWFuIG51bWJlcmVkIGxpc3RzIGluIE9wZW4gVGhyZWFkczogXCIxLiAqKlByb2plY3QqKlwiIC0+IFwiLSBbW1Byb2plY3RdXVwiXG4gIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9eXFxkK1xcLlxccytcXCp7MCwyfShbXio6XFxuXSspXFwqezAsMn06XFxzKi9nbSwgJy0gW1skMV1dIFx1MjAxNCAnKTtcblxuICAvLyBSZW1vdmUgdHJhaWxpbmcgZXhwbGFuYXRpb25zL3N1bW1hcmllcyBhZnRlciB0aGUgc3RydWN0dXJlZCBjb250ZW50XG4gIGNvbnN0IGxhc3RTZWN0aW9uID0gcmVzdWx0Lmxhc3RJbmRleE9mKCcqKicpO1xuICBpZiAobGFzdFNlY3Rpb24gPiAwKSB7XG4gICAgY29uc3QgYWZ0ZXJMYXN0SGVhZGVyID0gcmVzdWx0LmluZGV4T2YoJ1xcblxcbicsIGxhc3RTZWN0aW9uICsgNTApO1xuICAgIGlmIChhZnRlckxhc3RIZWFkZXIgPiAwKSB7XG4gICAgICBjb25zdCB0cmFpbGluZyA9IHJlc3VsdC5zbGljZShhZnRlckxhc3RIZWFkZXIpO1xuICAgICAgLy8gSWYgdHJhaWxpbmcgY29udGVudCBkb2Vzbid0IGhhdmUgaGVhZGVycyBhbmQgaXMgZXhwbGFuYXRvcnksIHJlbW92ZSBpdFxuICAgICAgaWYgKCF0cmFpbGluZy5pbmNsdWRlcygnKionKSAmJiB0cmFpbGluZy5sZW5ndGggPiAxMDApIHtcbiAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnNsaWNlKDAsIGFmdGVyTGFzdEhlYWRlcikudHJpbSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBidWxsZXQgcG9pbnRzIChzb21lIG1vZGVscyB1c2UgKiwgc29tZSB1c2UgLSlcbiAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoL15cXCogL2dtLCAnLSAnKTtcblxuICAvLyBGaXggZG91YmxlIGFzdGVyaXNrcyB0aGF0IHNvbWUgbW9kZWxzIGFkZDogKioqKlNlY3Rpb24qKioqIC0+ICoqU2VjdGlvbioqXG4gIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9cXCp7NCx9KFteKl0rKVxcKns0LH0vZywgJyoqJDEqKicpO1xuXG4gIC8vIFJlbW92ZSBleGNlc3NpdmUgYmxhbmsgbGluZXNcbiAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoL1xcbnszLH0vZywgJ1xcblxcbicpO1xuXG4gIC8vIEVuc3VyZSBwcm9wZXIgc3BhY2luZyBhZnRlciBoZWFkZXJzXG4gIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC8oXFwqXFwqW14qXStcXCpcXCo6PylcXG4oW14tXFxuMS05XSkvZywgJyQxXFxuXFxuJDInKTtcblxuICAvLyBDbGVhbiB1cCBhbnkgcmVtYWluaW5nIGZvcm1hdHRpbmcgaXNzdWVzXG4gIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9cXCpcXCpcXHMqXFwqXFwqL2csICcnKTsgLy8gUmVtb3ZlIGVtcHR5IGJvbGQgbWFya2Vyc1xuXG4gIHJldHVybiByZXN1bHQudHJpbSgpO1xufVxuXG4vLyBTbGVlcCBoZWxwZXIgZm9yIHJldHJ5IGJhY2tvZmZcbmZ1bmN0aW9uIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjYWxsT2xsYW1hKFxuICBlbmRwb2ludDogc3RyaW5nLFxuICBtb2RlbDogc3RyaW5nLFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgbWF4VG9rZW5zOiBudW1iZXIgPSA2MDAsXG4gIG1heFJldHJpZXM6IG51bWJlciA9IDNcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGxldCBsYXN0RXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG5cbiAgZm9yIChsZXQgYXR0ZW1wdCA9IDE7IGF0dGVtcHQgPD0gbWF4UmV0cmllczsgYXR0ZW1wdCsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7ZW5kcG9pbnR9L2FwaS9nZW5lcmF0ZWAsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG1vZGVsOiBtb2RlbCxcbiAgICAgICAgICBwcm9tcHQ6IHByb21wdCxcbiAgICAgICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHRlbXBlcmF0dXJlOiAwLjUsXG4gICAgICAgICAgICB0b3BfcDogMC45LFxuICAgICAgICAgICAgbnVtX3ByZWRpY3Q6IG1heFRva2Vuc1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIHRocm93OiBmYWxzZSAvLyBEb24ndCB0aHJvdyBvbiBub24tMjAwLCBoYW5kbGUgbWFudWFsbHlcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICAgIGNvbnN0IHJhd1Jlc3BvbnNlID0gZGF0YS5yZXNwb25zZSB8fCAnJztcbiAgICAgICAgcmV0dXJuIHBvc3RQcm9jZXNzT3V0cHV0KHJhd1Jlc3BvbnNlKTtcbiAgICAgIH1cblxuICAgICAgLy8gSGFuZGxlIHNwZWNpZmljIGVycm9yIGNvZGVzXG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2RlbCBcIiR7bW9kZWx9XCIgbm90IGZvdW5kLiBSdW46IG9sbGFtYSBwdWxsICR7bW9kZWx9YCk7XG4gICAgICB9XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA1MDMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbGxhbWEgc2VydmljZSB1bmF2YWlsYWJsZS4gSXMgaXQgcnVubmluZz8nKTtcbiAgICAgIH1cblxuICAgICAgbGFzdEVycm9yID0gbmV3IEVycm9yKGBPbGxhbWEgcmV0dXJuZWQgc3RhdHVzICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxhc3RFcnJvciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcblxuICAgICAgLy8gRG9uJ3QgcmV0cnkgb24gbW9kZWwgbm90IGZvdW5kIG9yIHNlcnZpY2UgdW5hdmFpbGFibGVcbiAgICAgIGlmIChsYXN0RXJyb3IubWVzc2FnZS5pbmNsdWRlcygnbm90IGZvdW5kJykgfHwgbGFzdEVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ3VuYXZhaWxhYmxlJykpIHtcbiAgICAgICAgdGhyb3cgbGFzdEVycm9yO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEV4cG9uZW50aWFsIGJhY2tvZmY6IDFzLCAycywgNHNcbiAgICBpZiAoYXR0ZW1wdCA8IG1heFJldHJpZXMpIHtcbiAgICAgIGF3YWl0IHNsZWVwKDEwMDAgKiBNYXRoLnBvdygyLCBhdHRlbXB0IC0gMSkpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIGZhaWxlZCBhZnRlciAke21heFJldHJpZXN9IGF0dGVtcHRzOiAke2xhc3RFcnJvcj8ubWVzc2FnZX1gKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTWFpbiBQbHVnaW5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgWWVzdGVyZGF5U3VtbWFyaXplclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBZZXN0ZXJkYXlTdW1tYXJpemVyU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuXG4gIGFzeW5jIG9ubG9hZCgpIHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuXG4gICAgLy8gQ29tbWFuZDogU3VtbWFyaXplIFllc3RlcmRheSAodXNlcyBPbGxhbWEpXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3VtbWFyaXplLXllc3RlcmRheScsXG4gICAgICBuYW1lOiAnU3VtbWFyaXplIHllc3RlcmRheScsXG4gICAgICBlZGl0b3JDYWxsYmFjazogYXN5bmMgKGVkaXRvcjogRWRpdG9yLCB2aWV3OiBNYXJrZG93blZpZXcpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdW1tYXJpemVZZXN0ZXJkYXkoZWRpdG9yLCB2aWV3KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvbW1hbmQ6IFN1bW1hcml6ZSBXZWVrXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3VtbWFyaXplLXdlZWsnLFxuICAgICAgbmFtZTogJ1N1bW1hcml6ZSB0aGlzIHdlZWsnLFxuICAgICAgZWRpdG9yQ2FsbGJhY2s6IGFzeW5jIChlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VtbWFyaXplV2VlayhlZGl0b3IsIHZpZXcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29tbWFuZDogU3VtbWFyaXplIE1vbnRoXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3VtbWFyaXplLW1vbnRoJyxcbiAgICAgIG5hbWU6ICdTdW1tYXJpemUgdGhpcyBtb250aCcsXG4gICAgICBlZGl0b3JDYWxsYmFjazogYXN5bmMgKGVkaXRvcjogRWRpdG9yLCB2aWV3OiBNYXJrZG93blZpZXcpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdW1tYXJpemVNb250aChlZGl0b3IsIHZpZXcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29tbWFuZDogQ29tcGFyZSBEYXlzXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnY29tcGFyZS1kYXlzJyxcbiAgICAgIG5hbWU6ICdDb21wYXJlIHllc3RlcmRheSB2cyB0b2RheScsXG4gICAgICBlZGl0b3JDYWxsYmFjazogYXN5bmMgKGVkaXRvcjogRWRpdG9yLCB2aWV3OiBNYXJrZG93blZpZXcpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5jb21wYXJlRGF5cyhlZGl0b3IsIHZpZXcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29tbWFuZDogU3VtbWFyaXplIFRvZGF5IChjdXJyZW50IG5vdGUpXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3VtbWFyaXplLXRvZGF5JyxcbiAgICAgIG5hbWU6ICdTdW1tYXJpemUgdG9kYXkgKGN1cnJlbnQgbm90ZSknLFxuICAgICAgZWRpdG9yQ2FsbGJhY2s6IGFzeW5jIChlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VtbWFyaXplVG9kYXkoZWRpdG9yLCB2aWV3KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvbW1hbmQ6IEZvcmNlIFJlLXN1bW1hcml6ZSAoYnlwYXNzIGNhY2hlKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ2ZvcmNlLXJlc3VtbWFyaXplJyxcbiAgICAgIG5hbWU6ICdGb3JjZSByZS1zdW1tYXJpemUgeWVzdGVyZGF5IChieXBhc3MgY2FjaGUpJyxcbiAgICAgIGVkaXRvckNhbGxiYWNrOiBhc3luYyAoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLmZvcmNlU3VtbWFyaXplWWVzdGVyZGF5KGVkaXRvciwgdmlldyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDb21tYW5kOiBDbGVhciBTdW1tYXJ5IENhY2hlXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnY2xlYXItY2FjaGUnLFxuICAgICAgbmFtZTogJ0NsZWFyIHN1bW1hcnkgY2FjaGUnLFxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgY291bnQgPSBPYmplY3Qua2V5cyh0aGlzLnNldHRpbmdzLnN1bW1hcnlDYWNoZSkubGVuZ3RoO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnN1bW1hcnlDYWNoZSA9IHt9O1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICBuZXcgTm90aWNlKGBDbGVhcmVkICR7Y291bnR9IGNhY2hlZCBzdW1tYXJpZXNgKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvbW1hbmQ6IFN1bW1hcml6ZSBMYXN0IDMgRGF5c1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N1bW1hcml6ZS1sYXN0LTMtZGF5cycsXG4gICAgICBuYW1lOiAnU3VtbWFyaXplIGxhc3QgMyBkYXlzJyxcbiAgICAgIGVkaXRvckNhbGxiYWNrOiBhc3luYyAoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN1bW1hcml6ZURhdGVSYW5nZShlZGl0b3IsIHZpZXcsIDMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29tbWFuZDogU3VtbWFyaXplIExhc3QgNSBEYXlzXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3VtbWFyaXplLWxhc3QtNS1kYXlzJyxcbiAgICAgIG5hbWU6ICdTdW1tYXJpemUgbGFzdCA1IGRheXMnLFxuICAgICAgZWRpdG9yQ2FsbGJhY2s6IGFzeW5jIChlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VtbWFyaXplRGF0ZVJhbmdlKGVkaXRvciwgdmlldywgNSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDb21tYW5kOiBTdW1tYXJpemUgTGFzdCAxNCBEYXlzICgyIHdlZWtzKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N1bW1hcml6ZS1sYXN0LTE0LWRheXMnLFxuICAgICAgbmFtZTogJ1N1bW1hcml6ZSBsYXN0IDE0IGRheXMgKDIgd2Vla3MpJyxcbiAgICAgIGVkaXRvckNhbGxiYWNrOiBhc3luYyAoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN1bW1hcml6ZURhdGVSYW5nZShlZGl0b3IsIHZpZXcsIDE0KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvbW1hbmQ6IEV4cG9ydCBzdW1tYXJpZXMgdG8gZmlsZVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ2V4cG9ydC1zdW1tYXJpZXMnLFxuICAgICAgbmFtZTogJ0V4cG9ydCBhbGwgc3VtbWFyaWVzIHRvIGZpbGUnLFxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5leHBvcnRTdW1tYXJpZXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvbW1hbmQ6IEJhdGNoIHN1bW1hcml6ZSBtaXNzaW5nIG5vdGVzXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnYmF0Y2gtc3VtbWFyaXplJyxcbiAgICAgIG5hbWU6ICdCYXRjaCBzdW1tYXJpemUgKGNhdGNoIHVwIG9uIG1pc3NpbmcpJyxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuYmF0Y2hTdW1tYXJpemUoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvbW1hbmQ6IFRlc3QgT2xsYW1hIGNvbm5lY3Rpb25cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICd0ZXN0LWNvbm5lY3Rpb24nLFxuICAgICAgbmFtZTogJ1Rlc3QgT2xsYW1hIGNvbm5lY3Rpb24nLFxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy50ZXN0Q29ubmVjdGlvbigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIHNldHRpbmdzIHRhYlxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcblxuICAgIC8vIEF1dG8tc3VtbWFyaXplIHdoZW4gZGFpbHkgbm90ZSBpcyBvcGVuZWRcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5hdXRvU3VtbWFyaXplKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbignZmlsZS1vcGVuJywgKGZpbGU6IFRGaWxlIHwgbnVsbCkgPT4ge1xuICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUZpbGVPcGVuKGZpbGUpLmNhdGNoKCgpID0+IHsgLyogaGFuZGxlZCAqLyB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIG9udW5sb2FkKCkge1xuICAgIC8vIFBsdWdpbiB1bmxvYWRlZFxuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICAvLyBJbmNyZW1lbnQgc3VtbWFyeSBzdGF0aXN0aWNzXG4gIGFzeW5jIGluY3JlbWVudFN0YXRzKHR5cGU6ICdkYWlseScgfCAnd2Vla2x5JyB8ICdtb250aGx5Jykge1xuICAgIC8vIEluaXRpYWxpemUgc3RhdHMgaWYgbWlzc2luZyAoZm9yIHVwZ3JhZGVzIGZyb20gb2xkZXIgdmVyc2lvbnMpXG4gICAgaWYgKCF0aGlzLnNldHRpbmdzLnN0YXRzKSB7XG4gICAgICB0aGlzLnNldHRpbmdzLnN0YXRzID0geyAuLi5ERUZBVUxUX1NFVFRJTkdTLnN0YXRzIH07XG4gICAgfVxuICAgIHRoaXMuc2V0dGluZ3Muc3RhdHMudG90YWxTdW1tYXJpZXMrKztcbiAgICBpZiAodHlwZSA9PT0gJ2RhaWx5JykgdGhpcy5zZXR0aW5ncy5zdGF0cy5kYWlseVN1bW1hcmllcysrO1xuICAgIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWVrbHknKSB0aGlzLnNldHRpbmdzLnN0YXRzLndlZWtseVN1bW1hcmllcysrO1xuICAgIGVsc2UgaWYgKHR5cGUgPT09ICdtb250aGx5JykgdGhpcy5zZXR0aW5ncy5zdGF0cy5tb250aGx5U3VtbWFyaWVzKys7XG4gICAgdGhpcy5zZXR0aW5ncy5zdGF0cy5sYXN0U3VtbWFyeURhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXTtcbiAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICB9XG5cbiAgLy8gRXh0cmFjdCBkYXRlIGZyb20gZmlsZW5hbWUgKGUuZy4sIFwiMjAyNi0wMS0xNS5tZFwiIC0+IFwiMjAyNi0wMS0xNVwiKVxuICBleHRyYWN0RGF0ZUZyb21GaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgLy8gTWF0Y2ggWVlZWS1NTS1ERCBwYXR0ZXJuXG4gICAgY29uc3QgbWF0Y2ggPSBmaWxlbmFtZS5tYXRjaCgvKFxcZHs0fS1cXGR7Mn0tXFxkezJ9KS8pO1xuICAgIHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogbnVsbDtcbiAgfVxuXG4gIC8vIENhbGN1bGF0ZSB0aGUgZGF5IGJlZm9yZSBhIGdpdmVuIGRhdGVcbiAgZ2V0RGF5QmVmb3JlKGRhdGVTdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgW3llYXIsIG1vbnRoLCBkYXldID0gZGF0ZVN0ci5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gMSk7XG5cbiAgICBjb25zdCB5ID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgIGNvbnN0IG0gPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICBjb25zdCBkID0gU3RyaW5nKGRhdGUuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuXG4gICAgcmV0dXJuIGAke3l9LSR7bX0tJHtkfWA7XG4gIH1cblxuICAvLyBDYWxjdWxhdGUgdGhlIHN0YXJ0IG9mIHRoZSB3ZWVrIChNb25kYXkgb3IgU3VuZGF5KSBjb250YWluaW5nIGEgZ2l2ZW4gZGF0ZVxuICBnZXRXZWVrU3RhcnQoZGF0ZVN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBbeWVhciwgbW9udGgsIGRheV0gPSBkYXRlU3RyLnNwbGl0KCctJykubWFwKE51bWJlcik7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoIC0gMSwgZGF5KTtcbiAgICBjb25zdCBkYXlPZldlZWsgPSBkYXRlLmdldERheSgpOyAvLyAwID0gU3VuZGF5LCAxID0gTW9uZGF5LCBldGMuXG5cbiAgICBsZXQgZGF5c1RvU3VidHJhY3Q6IG51bWJlcjtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy53ZWVrU3RhcnREYXkgPT09ICdtb25kYXknKSB7XG4gICAgICAvLyBNb25kYXkgaXMgZGF5IDEsIHNvIHN1YnRyYWN0IChkYXlPZldlZWsgLSAxKSwgaGFuZGxpbmcgU3VuZGF5ICgwKSBhcyA3XG4gICAgICBkYXlzVG9TdWJ0cmFjdCA9IGRheU9mV2VlayA9PT0gMCA/IDYgOiBkYXlPZldlZWsgLSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTdW5kYXkgaXMgZGF5IDBcbiAgICAgIGRheXNUb1N1YnRyYWN0ID0gZGF5T2ZXZWVrO1xuICAgIH1cblxuICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIGRheXNUb1N1YnRyYWN0KTtcblxuICAgIGNvbnN0IHkgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgY29uc3QgbSA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgIGNvbnN0IGQgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG5cbiAgICByZXR1cm4gYCR7eX0tJHttfS0ke2R9YDtcbiAgfVxuXG4gIC8vIEdldCBhcnJheSBvZiA3IGRhdGUgc3RyaW5ncyBmb3IgdGhlIHdlZWsgc3RhcnRpbmcgZnJvbSBzdGFydERhdGVcbiAgZ2V0V2Vla0RhdGVzKHN0YXJ0RGF0ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IFt5ZWFyLCBtb250aCwgZGF5XSA9IHN0YXJ0RGF0ZS5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XG4gICAgY29uc3QgZGF0ZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgY29uc3QgeSA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICAgIGNvbnN0IG0gPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgIGNvbnN0IGQgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICBkYXRlcy5wdXNoKGAke3l9LSR7bX0tJHtkfWApO1xuICAgICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGVzO1xuICB9XG5cbiAgLy8gR2V0IGFsbCBkYXRlcyBpbiBhIG1vbnRoXG4gIGdldE1vbnRoRGF0ZXMoeWVhcjogbnVtYmVyLCBtb250aDogbnVtYmVyKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGRhdGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGRheXNJbk1vbnRoID0gbmV3IERhdGUoeWVhciwgbW9udGgsIDApLmdldERhdGUoKTtcblxuICAgIGZvciAobGV0IGRheSA9IDE7IGRheSA8PSBkYXlzSW5Nb250aDsgZGF5KyspIHtcbiAgICAgIGNvbnN0IG0gPSBTdHJpbmcobW9udGgpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICBjb25zdCBkID0gU3RyaW5nKGRheSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgIGRhdGVzLnB1c2goYCR7eWVhcn0tJHttfS0ke2R9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGVzO1xuICB9XG5cbiAgLy8gR2V0IG1vbnRoIG5hbWVcbiAgZ2V0TW9udGhOYW1lKG1vbnRoOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5hbWVzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJyxcbiAgICAgICAgICAgICAgICAgICAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXTtcbiAgICByZXR1cm4gbmFtZXNbbW9udGggLSAxXTtcbiAgfVxuXG4gIC8vIENhbGN1bGF0ZSBsb25nZXN0IHN0cmVhayBvZiBjb25zZWN1dGl2ZSBkYXlzIHdpdGggZW50cmllc1xuICBjYWxjdWxhdGVTdHJlYWsoZGF0ZXM6IHN0cmluZ1tdLCBmb3VuZDogTWFwPHN0cmluZywgc3RyaW5nPik6IG51bWJlciB7XG4gICAgbGV0IG1heFN0cmVhayA9IDA7XG4gICAgbGV0IGN1cnJlbnRTdHJlYWsgPSAwO1xuXG4gICAgZm9yIChjb25zdCBkYXRlIG9mIGRhdGVzKSB7XG4gICAgICBpZiAoZm91bmQuaGFzKGRhdGUpKSB7XG4gICAgICAgIGN1cnJlbnRTdHJlYWsrKztcbiAgICAgICAgbWF4U3RyZWFrID0gTWF0aC5tYXgobWF4U3RyZWFrLCBjdXJyZW50U3RyZWFrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnJlbnRTdHJlYWsgPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYXhTdHJlYWs7XG4gIH1cblxuICAvLyBTdHJpcCBleGlzdGluZyBzdW1tYXJ5IHNlY3Rpb25zIHRvIHByZXZlbnQgc3RhbGUgY29udGVudCBmcm9tIGJlaW5nIHJlLXN1bW1hcml6ZWRcbiAgc3RyaXBTdW1tYXJ5U2VjdGlvbnMoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBSZW1vdmUgXCIjIyBZZXN0ZXJkYXkncyBIaWdobGlnaHRzXCIgYW5kIGV2ZXJ5dGhpbmcgYWZ0ZXIgdW50aWwgbmV4dCBoMiBvciBlbmRcbiAgICAvLyBSZW1vdmUgXCIjIyBTdW1tYXJ5IG9mIFlZWVktTU0tRERcIiBzZWN0aW9ucyBzaW1pbGFybHlcbiAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgaW5TdW1tYXJ5U2VjdGlvbiA9IGZhbHNlO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAvLyBDaGVjayBpZiBlbnRlcmluZyBhIHN1bW1hcnkgc2VjdGlvblxuICAgICAgaWYgKGxpbmUubWF0Y2goL14jIyAoWWVzdGVyZGF5J3MgSGlnaGxpZ2h0c3xTdW1tYXJ5IG9mIFxcZHs0fS1cXGR7Mn0tXFxkezJ9KS8pKSB7XG4gICAgICAgIGluU3VtbWFyeVNlY3Rpb24gPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIGlmIGV4aXRpbmcgc3VtbWFyeSBzZWN0aW9uIChoaXQgYW5vdGhlciBoMilcbiAgICAgIGlmIChpblN1bW1hcnlTZWN0aW9uICYmIGxpbmUubWF0Y2goL14jIyAvKSkge1xuICAgICAgICBpblN1bW1hcnlTZWN0aW9uID0gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBPbmx5IGluY2x1ZGUgbGluZXMgbm90IGluIHN1bW1hcnkgc2VjdGlvblxuICAgICAgaWYgKCFpblN1bW1hcnlTZWN0aW9uKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGxpbmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQuam9pbignXFxuJykudHJpbSgpO1xuICB9XG5cbiAgLy8gUmVhZCBhIHNwZWNpZmljIGRhdGUncyBkYWlseSBub3RlIC0gcmV0dXJucyB7IGRhdGUsIGNvbnRlbnQgfSBvciBudWxsXG4gIGFzeW5jIHJlYWREYWlseU5vdGUodGFyZ2V0RGF0ZTogc3RyaW5nKTogUHJvbWlzZTx7IGRhdGU6IHN0cmluZzsgY29udGVudDogc3RyaW5nIH0gfCBudWxsPiB7XG4gICAgLy8gVHJ5IGJvdGggZmlsZW5hbWUgZm9ybWF0czpcbiAgICAvLyAxLiBZWVlZLU1NLUREIFx1MjAxMyBKb3VybmFsLm1kIChvbGQgZm9ybWF0KVxuICAgIC8vIDIuIFlZWVktTU0tREQubWQgKG5ldyBmb3JtYXQpXG4gICAgY29uc3QgZm9ybWF0cyA9IFtcbiAgICAgIGAke3RoaXMuc2V0dGluZ3MuZGFpbHlOb3Rlc0ZvbGRlcn0vJHt0YXJnZXREYXRlfSBcdTIwMTMgSm91cm5hbC5tZGAsXG4gICAgICBgJHt0aGlzLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXJ9LyR7dGFyZ2V0RGF0ZX0ubWRgXG4gICAgXTtcblxuICAgIGxldCBub3RlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIGZvcm1hdHMpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICBpZiAoZmlsZSkge1xuICAgICAgICBub3RlUGF0aCA9IHBhdGg7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbm90ZVBhdGgpIHtcbiAgICAgIG5ldyBOb3RpY2UoYE5vdGUgbm90IGZvdW5kIGZvciAke3RhcmdldERhdGV9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChub3RlUGF0aCk7XG4gICAgICAvLyBTdHJpcCBmcm9udG1hdHRlciAoZXZlcnl0aGluZyBiZXR3ZWVuIGZpcnN0IHR3byAtLS0pXG4gICAgICBjb25zdCBmcm9udG1hdHRlckVuZCA9IGNvbnRlbnQuaW5kZXhPZignLS0tJywgMyk7XG4gICAgICBsZXQgYm9keUNvbnRlbnQ6IHN0cmluZztcbiAgICAgIGlmIChmcm9udG1hdHRlckVuZCAhPT0gLTEpIHtcbiAgICAgICAgYm9keUNvbnRlbnQgPSBjb250ZW50LnN1YnN0cmluZyhmcm9udG1hdHRlckVuZCArIDMpLnRyaW0oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJvZHlDb250ZW50ID0gY29udGVudDtcbiAgICAgIH1cblxuICAgICAgLy8gU3RyaXAgYW55IGV4aXN0aW5nIHN1bW1hcnkgc2VjdGlvbnMgdG8gcHJldmVudCBzdGFsZSBjb250ZW50IHByb3BhZ2F0aW9uXG4gICAgICBib2R5Q29udGVudCA9IHRoaXMuc3RyaXBTdW1tYXJ5U2VjdGlvbnMoYm9keUNvbnRlbnQpO1xuXG4gICAgICByZXR1cm4geyBkYXRlOiB0YXJnZXREYXRlLCBjb250ZW50OiBib2R5Q29udGVudCB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBuZXcgTm90aWNlKGBFcnJvciByZWFkaW5nIG5vdGU6ICR7ZXJyb3J9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvLyBSZWFkIGEgZGFpbHkgbm90ZSBzaWxlbnRseSAobm8gbm90aWNlIG9uIG1pc3NpbmcpIC0gZm9yIHdlZWsgYWdncmVnYXRpb25cbiAgYXN5bmMgcmVhZERhaWx5Tm90ZVNpbGVudCh0YXJnZXREYXRlOiBzdHJpbmcpOiBQcm9taXNlPHsgZGF0ZTogc3RyaW5nOyBjb250ZW50OiBzdHJpbmcgfSB8IG51bGw+IHtcbiAgICBjb25zdCBmb3JtYXRzID0gW1xuICAgICAgYCR7dGhpcy5zZXR0aW5ncy5kYWlseU5vdGVzRm9sZGVyfS8ke3RhcmdldERhdGV9IFx1MjAxMyBKb3VybmFsLm1kYCxcbiAgICAgIGAke3RoaXMuc2V0dGluZ3MuZGFpbHlOb3Rlc0ZvbGRlcn0vJHt0YXJnZXREYXRlfS5tZGBcbiAgICBdO1xuXG4gICAgbGV0IG5vdGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgZm9ybWF0cykge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgIG5vdGVQYXRoID0gcGF0aDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFub3RlUGF0aCkge1xuICAgICAgcmV0dXJuIG51bGw7IC8vIFNpbGVudGx5IHJldHVybiBudWxsIGZvciBtaXNzaW5nIGRheXNcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChub3RlUGF0aCk7XG4gICAgICBjb25zdCBmcm9udG1hdHRlckVuZCA9IGNvbnRlbnQuaW5kZXhPZignLS0tJywgMyk7XG4gICAgICBsZXQgYm9keUNvbnRlbnQ6IHN0cmluZztcbiAgICAgIGlmIChmcm9udG1hdHRlckVuZCAhPT0gLTEpIHtcbiAgICAgICAgYm9keUNvbnRlbnQgPSBjb250ZW50LnN1YnN0cmluZyhmcm9udG1hdHRlckVuZCArIDMpLnRyaW0oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJvZHlDb250ZW50ID0gY29udGVudDtcbiAgICAgIH1cbiAgICAgIGJvZHlDb250ZW50ID0gdGhpcy5zdHJpcFN1bW1hcnlTZWN0aW9ucyhib2R5Q29udGVudCk7XG4gICAgICByZXR1cm4geyBkYXRlOiB0YXJnZXREYXRlLCBjb250ZW50OiBib2R5Q29udGVudCB9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVhZCBhbGwgZGFpbHkgbm90ZXMgZm9yIGEgd2VlayB1c2luZyBQcm9taXNlLmFsbFNldHRsZWQgZm9yIHBhcmFsbGVsIHJlYWRpbmdcbiAgYXN5bmMgcmVhZFdlZWtOb3RlcyhkYXRlczogc3RyaW5nW10pOiBQcm9taXNlPHsgZm91bmQ6IE1hcDxzdHJpbmcsIHN0cmluZz47IG1pc3Npbmc6IHN0cmluZ1tdIH0+IHtcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKFxuICAgICAgZGF0ZXMubWFwKGRhdGUgPT4gdGhpcy5yZWFkRGFpbHlOb3RlU2lsZW50KGRhdGUpKVxuICAgICk7XG5cbiAgICBjb25zdCBmb3VuZCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgY29uc3QgbWlzc2luZzogc3RyaW5nW10gPSBbXTtcblxuICAgIHJlc3VsdHMuZm9yRWFjaCgocmVzdWx0LCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgZGF0ZSA9IGRhdGVzW2luZGV4XTtcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJyAmJiByZXN1bHQudmFsdWUpIHtcbiAgICAgICAgZm91bmQuc2V0KGRhdGUsIHJlc3VsdC52YWx1ZS5jb250ZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pc3NpbmcucHVzaChkYXRlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7IGZvdW5kLCBtaXNzaW5nIH07XG4gIH1cblxuICAvLyBXZWVrbHkgc3VtbWFyaXphdGlvbiBmdW5jdGlvblxuICBhc3luYyBzdW1tYXJpemVXZWVrKGVkaXRvcjogRWRpdG9yLCB2aWV3OiBNYXJrZG93blZpZXcpIHtcbiAgICBjb25zdCBjdXJyZW50RmlsZSA9IHZpZXcuZmlsZTtcbiAgICBpZiAoIWN1cnJlbnRGaWxlKSB7XG4gICAgICBuZXcgTm90aWNlKCdObyBmaWxlIGlzIGN1cnJlbnRseSBvcGVuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudEZpbGVuYW1lID0gY3VycmVudEZpbGUuYmFzZW5hbWU7XG4gICAgY29uc3QgY3VycmVudERhdGUgPSB0aGlzLmV4dHJhY3REYXRlRnJvbUZpbGVuYW1lKGN1cnJlbnRGaWxlbmFtZSk7XG5cbiAgICBpZiAoIWN1cnJlbnREYXRlKSB7XG4gICAgICBuZXcgTm90aWNlKGBDYW5ub3QgZXh0cmFjdCBkYXRlIGZyb20gZmlsZW5hbWU6ICR7Y3VycmVudEZpbGVuYW1lfVxcbkV4cGVjdGVkIGZvcm1hdDogWVlZWS1NTS1ERGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENhbGN1bGF0ZSB3ZWVrIHJhbmdlXG4gICAgY29uc3Qgd2Vla1N0YXJ0ID0gdGhpcy5nZXRXZWVrU3RhcnQoY3VycmVudERhdGUpO1xuICAgIGNvbnN0IHdlZWtEYXRlcyA9IHRoaXMuZ2V0V2Vla0RhdGVzKHdlZWtTdGFydCk7XG4gICAgY29uc3Qgd2Vla0VuZCA9IHdlZWtEYXRlc1s2XTtcblxuICAgIGNvbnN0IGxvYWRpbmdOb3RpY2UgPSBuZXcgTm90aWNlKGBSZWFkaW5nIHdlZWsgJHt3ZWVrU3RhcnR9IHRvICR7d2Vla0VuZH0uLi5gLCAwKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBSZWFkIGFsbCBkYWlseSBub3RlcyBmb3IgdGhlIHdlZWtcbiAgICAgIGNvbnN0IHsgZm91bmQsIG1pc3NpbmcgfSA9IGF3YWl0IHRoaXMucmVhZFdlZWtOb3Rlcyh3ZWVrRGF0ZXMpO1xuXG4gICAgICBpZiAoZm91bmQuc2l6ZSA9PT0gMCkge1xuICAgICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgICAgbmV3IE5vdGljZShgTm8gZGFpbHkgbm90ZXMgZm91bmQgZm9yIHdlZWsgJHt3ZWVrU3RhcnR9IHRvICR7d2Vla0VuZH1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2FkaW5nTm90aWNlLnNldE1lc3NhZ2UoYFN1bW1hcml6aW5nICR7Zm91bmQuc2l6ZX0gZGF5cyAoJHttaXNzaW5nLmxlbmd0aH0gbWlzc2luZykuLi5gKTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIGNvbnNpc3RlbmN5IG1ldHJpY3NcbiAgICAgIGNvbnN0IGNvbnNpc3RlbmN5UGN0ID0gTWF0aC5yb3VuZCgoZm91bmQuc2l6ZSAvIDcpICogMTAwKTtcbiAgICAgIGNvbnN0IHN0cmVhayA9IHRoaXMuY2FsY3VsYXRlU3RyZWFrKHdlZWtEYXRlcywgZm91bmQpO1xuXG4gICAgICAvLyBBZ2dyZWdhdGUgY29udGVudCB3aXRoIGRhdGUgbWFya2Vyc1xuICAgICAgbGV0IGFnZ3JlZ2F0ZWRDb250ZW50ID0gJyc7XG4gICAgICBmb3IgKGNvbnN0IFtkYXRlLCBjb250ZW50XSBvZiBmb3VuZCkge1xuICAgICAgICBhZ2dyZWdhdGVkQ29udGVudCArPSBgXFxuLS0tICR7ZGF0ZX0gLS0tXFxuJHtjb250ZW50fVxcbmA7XG4gICAgICB9XG5cbiAgICAgIC8vIEJ1aWxkIGNvbnRleHQgaGludHMgZnJvbSBhbGwgY29udGVudFxuICAgICAgY29uc3QgYWxsQ29udGVudCA9IEFycmF5LmZyb20oZm91bmQudmFsdWVzKCkpLmpvaW4oJ1xcbicpO1xuICAgICAgY29uc3QgY29udGV4dEhpbnRzID0gYnVpbGRDb250ZXh0SGludHMoYWxsQ29udGVudCk7XG4gICAgICBjb25zdCBkZXRhaWxNb2QgPSBERVRBSUxfTU9ESUZJRVJTW3RoaXMuc2V0dGluZ3MuZGV0YWlsTGV2ZWxdO1xuXG4gICAgICAvLyBCdWlsZCBwcm9tcHQgd2l0aCBjb25zaXN0ZW5jeSBpbmZvXG4gICAgICBjb25zdCBkYXRlUmFuZ2UgPSBgJHt3ZWVrU3RhcnR9IHRvICR7d2Vla0VuZH1gO1xuICAgICAgY29uc3QgY29uc2lzdGVuY3lJbmZvID0gYFxcbkNPTlNJU1RFTkNZOiAke2ZvdW5kLnNpemV9LzcgZGF5cyBjYXB0dXJlZCAoJHtjb25zaXN0ZW5jeVBjdH0lKSwgbG9uZ2VzdCBzdHJlYWs6ICR7c3RyZWFrfSBkYXlzYDtcbiAgICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgU3VtbWFyaXppbmcgd2VlayBvZiAke2RhdGVSYW5nZX06JHtjb25zaXN0ZW5jeUluZm99JHtjb250ZXh0SGludHN9XFxuXFxuJHtXRUVLTFlfUFJPTVBUfSR7ZGV0YWlsTW9kfVxcblxcbiR7YWdncmVnYXRlZENvbnRlbnR9YDtcblxuICAgICAgLy8gQ2FsbCBPbGxhbWEgd2l0aCBoaWdoZXIgdG9rZW4gbGltaXQgZm9yIHdlZWtseSBzeW50aGVzaXNcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCBjYWxsT2xsYW1hKFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50LFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYU1vZGVsLFxuICAgICAgICBmdWxsUHJvbXB0LFxuICAgICAgICAxNTAwICAvLyBNb3JlIHRva2VucyBmb3Igd2Vlay1sb25nIHN5bnRoZXNpc1xuICAgICAgKTtcblxuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG5cbiAgICAgIC8vIE91dHB1dCB3aXRoIGRhdGUgcmFuZ2VcbiAgICAgIGlmICh0aGlzLnNldHRpbmdzLm91dHB1dE1vZGUgPT09ICdjdXJzb3InKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IGBcXG4jIyBXZWVrIFN1bW1hcnkgKCR7d2Vla1N0YXJ0fSB0byAke3dlZWtFbmR9KVxcblxcbiR7c3VtbWFyeX1cXG5gO1xuICAgICAgICBlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihmb3JtYXR0ZWQpO1xuICAgICAgICBuZXcgTm90aWNlKGBXZWVrIHN1bW1hcnkgaW5zZXJ0ZWQhICgke2ZvdW5kLnNpemV9LyR7N30gZGF5cykgLSBUcnkgXCJTdW1tYXJpemUgbW9udGhcIiBmb3IgYmlnZ2VyIHBpY3R1cmVgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHN1bW1hcnkpO1xuICAgICAgICBuZXcgTm90aWNlKGBXZWVrIHN1bW1hcnkgY29waWVkISAoJHtmb3VuZC5zaXplfSBkYXlzLCAke21pc3NpbmcubGVuZ3RofSBtaXNzaW5nKWApO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmluY3JlbWVudFN0YXRzKCd3ZWVrbHknKTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgbmV3IE5vdGljZShgRXJyb3I6ICR7ZXJyb3JNc2d9YCwgMTAwMDApO1xuICAgICAgY29uc29sZS5lcnJvcignW1llc3RlcmRheSBTdW1tYXJpemVyXSBXZWVrbHkgZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE1vbnRobHkgc3VtbWFyaXphdGlvbiBmdW5jdGlvblxuICBhc3luYyBzdW1tYXJpemVNb250aChlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSB7XG4gICAgY29uc3QgY3VycmVudEZpbGUgPSB2aWV3LmZpbGU7XG4gICAgaWYgKCFjdXJyZW50RmlsZSkge1xuICAgICAgbmV3IE5vdGljZSgnTm8gZmlsZSBpcyBjdXJyZW50bHkgb3BlbicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnJlbnRGaWxlbmFtZSA9IGN1cnJlbnRGaWxlLmJhc2VuYW1lO1xuICAgIGNvbnN0IGN1cnJlbnREYXRlID0gdGhpcy5leHRyYWN0RGF0ZUZyb21GaWxlbmFtZShjdXJyZW50RmlsZW5hbWUpO1xuXG4gICAgaWYgKCFjdXJyZW50RGF0ZSkge1xuICAgICAgbmV3IE5vdGljZShgQ2Fubm90IGV4dHJhY3QgZGF0ZSBmcm9tIGZpbGVuYW1lOiAke2N1cnJlbnRGaWxlbmFtZX1cXG5FeHBlY3RlZCBmb3JtYXQ6IFlZWVktTU0tRERgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IHllYXIgYW5kIG1vbnRoIGZyb20gY3VycmVudCBkYXRlXG4gICAgY29uc3QgW3llYXIsIG1vbnRoXSA9IGN1cnJlbnREYXRlLnNwbGl0KCctJykubWFwKE51bWJlcik7XG4gICAgY29uc3QgbW9udGhOYW1lID0gdGhpcy5nZXRNb250aE5hbWUobW9udGgpO1xuICAgIGNvbnN0IG1vbnRoRGF0ZXMgPSB0aGlzLmdldE1vbnRoRGF0ZXMoeWVhciwgbW9udGgpO1xuXG4gICAgY29uc3QgbG9hZGluZ05vdGljZSA9IG5ldyBOb3RpY2UoYFJlYWRpbmcgJHttb250aE5hbWV9ICR7eWVhcn0uLi5gLCAwKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBSZWFkIGFsbCBkYWlseSBub3RlcyBmb3IgdGhlIG1vbnRoXG4gICAgICBjb25zdCB7IGZvdW5kLCBtaXNzaW5nIH0gPSBhd2FpdCB0aGlzLnJlYWRXZWVrTm90ZXMobW9udGhEYXRlcyk7IC8vIFJldXNlIHdlZWsgcmVhZGVyXG5cbiAgICAgIGlmIChmb3VuZC5zaXplID09PSAwKSB7XG4gICAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgICBuZXcgTm90aWNlKGBObyBkYWlseSBub3RlcyBmb3VuZCBmb3IgJHttb250aE5hbWV9ICR7eWVhcn1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2FkaW5nTm90aWNlLnNldE1lc3NhZ2UoYFN1bW1hcml6aW5nICR7Zm91bmQuc2l6ZX0gZGF5cyAoJHttaXNzaW5nLmxlbmd0aH0gbWlzc2luZykuLi5gKTtcblxuICAgICAgLy8gQWdncmVnYXRlIGNvbnRlbnQgd2l0aCBkYXRlIG1hcmtlcnNcbiAgICAgIGxldCBhZ2dyZWdhdGVkQ29udGVudCA9ICcnO1xuICAgICAgZm9yIChjb25zdCBbZGF0ZSwgY29udGVudF0gb2YgZm91bmQpIHtcbiAgICAgICAgYWdncmVnYXRlZENvbnRlbnQgKz0gYFxcbi0tLSAke2RhdGV9IC0tLVxcbiR7Y29udGVudH1cXG5gO1xuICAgICAgfVxuXG4gICAgICAvLyBCdWlsZCBwcm9tcHRcbiAgICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgU3VtbWFyaXppbmcgbW9udGggb2YgJHttb250aE5hbWV9ICR7eWVhcn06XFxuXFxuJHtNT05USExZX1BST01QVH0ke2FnZ3JlZ2F0ZWRDb250ZW50fWA7XG5cbiAgICAgIC8vIENhbGwgT2xsYW1hIHdpdGggaGlnaCB0b2tlbiBsaW1pdCBmb3IgbW9udGhseSBzeW50aGVzaXNcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCBjYWxsT2xsYW1hKFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50LFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYU1vZGVsLFxuICAgICAgICBmdWxsUHJvbXB0LFxuICAgICAgICAyMDAwICAvLyBNb3JlIHRva2VucyBmb3IgbW9udGgtbG9uZyBzeW50aGVzaXNcbiAgICAgICk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuXG4gICAgICAvLyBPdXRwdXQgd2l0aCBtb250aCBuYW1lXG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5vdXRwdXRNb2RlID09PSAnY3Vyc29yJykge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBgXFxuIyMgTW9udGhseSBTdW1tYXJ5OiAke21vbnRoTmFtZX0gJHt5ZWFyfVxcblxcbiR7c3VtbWFyeX1cXG5gO1xuICAgICAgICBlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihmb3JtYXR0ZWQpO1xuICAgICAgICBuZXcgTm90aWNlKGBNb250aGx5IHN1bW1hcnkgaW5zZXJ0ZWQhICgke2ZvdW5kLnNpemV9IGRheXMgY2FwdHVyZWQpYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChzdW1tYXJ5KTtcbiAgICAgICAgbmV3IE5vdGljZShgTW9udGhseSBzdW1tYXJ5IGNvcGllZCEgKCR7Zm91bmQuc2l6ZX0gZGF5cyBjYXB0dXJlZClgKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbmNyZW1lbnRTdGF0cygnbW9udGhseScpO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBuZXcgTm90aWNlKGBFcnJvcjogJHtlcnJvck1zZ31gLCAxMDAwMCk7XG4gICAgICBjb25zb2xlLmVycm9yKCdbWWVzdGVyZGF5IFN1bW1hcml6ZXJdIE1vbnRobHkgZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEN1c3RvbSBkYXRlIHJhbmdlIHN1bW1hcml6YXRpb24gKGxhc3QgTiBkYXlzKVxuICBhc3luYyBzdW1tYXJpemVEYXRlUmFuZ2UoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldywgZGF5czogbnVtYmVyKSB7XG4gICAgY29uc3QgY3VycmVudEZpbGUgPSB2aWV3LmZpbGU7XG4gICAgaWYgKCFjdXJyZW50RmlsZSkge1xuICAgICAgbmV3IE5vdGljZSgnTm8gZmlsZSBpcyBjdXJyZW50bHkgb3BlbicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnJlbnRGaWxlbmFtZSA9IGN1cnJlbnRGaWxlLmJhc2VuYW1lO1xuICAgIGNvbnN0IGN1cnJlbnREYXRlID0gdGhpcy5leHRyYWN0RGF0ZUZyb21GaWxlbmFtZShjdXJyZW50RmlsZW5hbWUpO1xuXG4gICAgaWYgKCFjdXJyZW50RGF0ZSkge1xuICAgICAgbmV3IE5vdGljZShgQ2Fubm90IGV4dHJhY3QgZGF0ZSBmcm9tIGZpbGVuYW1lOiAke2N1cnJlbnRGaWxlbmFtZX1cXG5FeHBlY3RlZCBmb3JtYXQ6IFlZWVktTU0tRERgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBkYXRlIHJhbmdlIGdvaW5nIGJhY2sgZnJvbSB5ZXN0ZXJkYXkgKG5vdCBpbmNsdWRpbmcgdG9kYXkpXG4gICAgY29uc3QgZGF0ZXM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IGRhdGVQdHIgPSB0aGlzLmdldERheUJlZm9yZShjdXJyZW50RGF0ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXlzOyBpKyspIHtcbiAgICAgIGRhdGVzLnVuc2hpZnQoZGF0ZVB0cik7IC8vIEFkZCB0byBmcm9udCB0byBtYWludGFpbiBjaHJvbm9sb2dpY2FsIG9yZGVyXG4gICAgICBkYXRlUHRyID0gdGhpcy5nZXREYXlCZWZvcmUoZGF0ZVB0cik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnREYXRlID0gZGF0ZXNbMF07XG4gICAgY29uc3QgZW5kRGF0ZSA9IGRhdGVzW2RhdGVzLmxlbmd0aCAtIDFdO1xuXG4gICAgY29uc3QgbG9hZGluZ05vdGljZSA9IG5ldyBOb3RpY2UoYFJlYWRpbmcgJHtkYXlzfSBkYXlzICgke3N0YXJ0RGF0ZX0gdG8gJHtlbmREYXRlfSkuLi5gLCAwKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGZvdW5kLCBtaXNzaW5nIH0gPSBhd2FpdCB0aGlzLnJlYWRXZWVrTm90ZXMoZGF0ZXMpO1xuXG4gICAgICBpZiAoZm91bmQuc2l6ZSA9PT0gMCkge1xuICAgICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgICAgbmV3IE5vdGljZShgTm8gZGFpbHkgbm90ZXMgZm91bmQgZm9yIHRoZSBsYXN0ICR7ZGF5c30gZGF5c2ApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvYWRpbmdOb3RpY2Uuc2V0TWVzc2FnZShgU3VtbWFyaXppbmcgJHtmb3VuZC5zaXplfS8ke2RheXN9IGRheXMuLi5gKTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIGNvbnNpc3RlbmN5XG4gICAgICBjb25zdCBjb25zaXN0ZW5jeVBjdCA9IE1hdGgucm91bmQoKGZvdW5kLnNpemUgLyBkYXlzKSAqIDEwMCk7XG4gICAgICBjb25zdCBzdHJlYWsgPSB0aGlzLmNhbGN1bGF0ZVN0cmVhayhkYXRlcywgZm91bmQpO1xuXG4gICAgICAvLyBBZ2dyZWdhdGUgY29udGVudFxuICAgICAgbGV0IGFnZ3JlZ2F0ZWRDb250ZW50ID0gJyc7XG4gICAgICBmb3IgKGNvbnN0IFtkYXRlLCBjb250ZW50XSBvZiBmb3VuZCkge1xuICAgICAgICBhZ2dyZWdhdGVkQ29udGVudCArPSBgXFxuLS0tICR7ZGF0ZX0gLS0tXFxuJHtjb250ZW50fVxcbmA7XG4gICAgICB9XG5cbiAgICAgIC8vIEJ1aWxkIGNvbnRleHQgaGludHNcbiAgICAgIGNvbnN0IGFsbENvbnRlbnQgPSBBcnJheS5mcm9tKGZvdW5kLnZhbHVlcygpKS5qb2luKCdcXG4nKTtcbiAgICAgIGNvbnN0IGNvbnRleHRIaW50cyA9IGJ1aWxkQ29udGV4dEhpbnRzKGFsbENvbnRlbnQpO1xuICAgICAgY29uc3QgZGV0YWlsTW9kID0gREVUQUlMX01PRElGSUVSU1t0aGlzLnNldHRpbmdzLmRldGFpbExldmVsXTtcblxuICAgICAgLy8gVXNlIHdlZWtseSBwcm9tcHQgZm9yIG11bHRpLWRheSByYW5nZXNcbiAgICAgIGNvbnN0IGRhdGVSYW5nZSA9IGAke3N0YXJ0RGF0ZX0gdG8gJHtlbmREYXRlfSAoJHtkYXlzfSBkYXlzKWA7XG4gICAgICBjb25zdCBjb25zaXN0ZW5jeUluZm8gPSBgXFxuQ09OU0lTVEVOQ1k6ICR7Zm91bmQuc2l6ZX0vJHtkYXlzfSBkYXlzIGNhcHR1cmVkICgke2NvbnNpc3RlbmN5UGN0fSUpLCBsb25nZXN0IHN0cmVhazogJHtzdHJlYWt9IGRheXNgO1xuICAgICAgY29uc3QgZnVsbFByb21wdCA9IGBTdW1tYXJpemluZyAke2RhdGVSYW5nZX06JHtjb25zaXN0ZW5jeUluZm99JHtjb250ZXh0SGludHN9XFxuXFxuJHtXRUVLTFlfUFJPTVBUfSR7ZGV0YWlsTW9kfVxcblxcbiR7YWdncmVnYXRlZENvbnRlbnR9YDtcblxuICAgICAgLy8gU2NhbGUgdG9rZW4gbGltaXQgYmFzZWQgb24gbnVtYmVyIG9mIGRheXNcbiAgICAgIGNvbnN0IHRva2VuTGltaXQgPSBNYXRoLm1pbig4MDAgKyAoZGF5cyAqIDUwKSwgMjAwMCk7XG4gICAgICBjb25zdCBzdW1tYXJ5ID0gYXdhaXQgY2FsbE9sbGFtYShcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5vbGxhbWFFbmRwb2ludCxcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5vbGxhbWFNb2RlbCxcbiAgICAgICAgZnVsbFByb21wdCxcbiAgICAgICAgdG9rZW5MaW1pdFxuICAgICAgKTtcblxuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG5cbiAgICAgIGlmICh0aGlzLnNldHRpbmdzLm91dHB1dE1vZGUgPT09ICdjdXJzb3InKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IGBcXG4jIyBTdW1tYXJ5OiAke3N0YXJ0RGF0ZX0gdG8gJHtlbmREYXRlfSAoJHtkYXlzfSBkYXlzKVxcblxcbiR7c3VtbWFyeX1cXG5gO1xuICAgICAgICBlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihmb3JtYXR0ZWQpO1xuICAgICAgICBuZXcgTm90aWNlKGAke2RheXN9LWRheSBzdW1tYXJ5IGluc2VydGVkISAoJHtmb3VuZC5zaXplfS8ke2RheXN9IGRheXMgY2FwdHVyZWQpYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChzdW1tYXJ5KTtcbiAgICAgICAgbmV3IE5vdGljZShgJHtkYXlzfS1kYXkgc3VtbWFyeSBjb3BpZWQhICgke2ZvdW5kLnNpemV9LyR7ZGF5c30gZGF5cyBjYXB0dXJlZClgKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbmNyZW1lbnRTdGF0cygnd2Vla2x5Jyk7IC8vIENvdW50IGFzIHdlZWtseSBmb3IgbXVsdGktZGF5XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIG5ldyBOb3RpY2UoYEVycm9yOiAke2Vycm9yTXNnfWAsIDEwMDAwKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tZZXN0ZXJkYXkgU3VtbWFyaXplcl0gRGF0ZSByYW5nZSBlcnJvcjonLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gQ29tcGFyZSB0b2RheSB2cyB5ZXN0ZXJkYXlcbiAgYXN5bmMgY29tcGFyZURheXMoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykge1xuICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdmlldy5maWxlO1xuICAgIGlmICghY3VycmVudEZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ05vIGZpbGUgaXMgY3VycmVudGx5IG9wZW4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50RmlsZW5hbWUgPSBjdXJyZW50RmlsZS5iYXNlbmFtZTtcbiAgICBjb25zdCBjdXJyZW50RGF0ZSA9IHRoaXMuZXh0cmFjdERhdGVGcm9tRmlsZW5hbWUoY3VycmVudEZpbGVuYW1lKTtcblxuICAgIGlmICghY3VycmVudERhdGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCBleHRyYWN0IGRhdGUgZnJvbSBmaWxlbmFtZTogJHtjdXJyZW50RmlsZW5hbWV9XFxuRXhwZWN0ZWQgZm9ybWF0OiBZWVlZLU1NLUREYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgeWVzdGVyZGF5RGF0ZSA9IHRoaXMuZ2V0RGF5QmVmb3JlKGN1cnJlbnREYXRlKTtcbiAgICBjb25zdCBsb2FkaW5nTm90aWNlID0gbmV3IE5vdGljZShgQ29tcGFyaW5nICR7eWVzdGVyZGF5RGF0ZX0gdnMgJHtjdXJyZW50RGF0ZX0uLi5gLCAwKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBSZWFkIGJvdGggZGF5c1xuICAgICAgY29uc3QgW2RheTFSZXN1bHQsIGRheTJSZXN1bHRdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICB0aGlzLnJlYWREYWlseU5vdGVTaWxlbnQoeWVzdGVyZGF5RGF0ZSksXG4gICAgICAgIHRoaXMucmVhZERhaWx5Tm90ZVNpbGVudChjdXJyZW50RGF0ZSlcbiAgICAgIF0pO1xuXG4gICAgICBpZiAoIWRheTFSZXN1bHQpIHtcbiAgICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYE5vdGUgbm90IGZvdW5kIGZvciAke3llc3RlcmRheURhdGV9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghZGF5MlJlc3VsdCkge1xuICAgICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgICAgbmV3IE5vdGljZShgTm90ZSBub3QgZm91bmQgZm9yICR7Y3VycmVudERhdGV9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbG9hZGluZ05vdGljZS5zZXRNZXNzYWdlKCdBbmFseXppbmcgZGlmZmVyZW5jZXMuLi4nKTtcblxuICAgICAgLy8gQnVpbGQgY29tcGFyaXNvbiBwcm9tcHRcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25Db250ZW50ID0gYFxuLS0tIERheSAxOiAke3llc3RlcmRheURhdGV9IC0tLVxuJHtkYXkxUmVzdWx0LmNvbnRlbnR9XG5cbi0tLSBEYXkgMjogJHtjdXJyZW50RGF0ZX0gLS0tXG4ke2RheTJSZXN1bHQuY29udGVudH1cbmA7XG5cbiAgICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgQ29tcGFyaW5nICR7eWVzdGVyZGF5RGF0ZX0gdnMgJHtjdXJyZW50RGF0ZX06XFxuXFxuJHtDT01QQVJFX1BST01QVH0ke2NvbXBhcmlzb25Db250ZW50fWA7XG5cbiAgICAgIGNvbnN0IGNvbXBhcmlzb24gPSBhd2FpdCBjYWxsT2xsYW1hKFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50LFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYU1vZGVsLFxuICAgICAgICBmdWxsUHJvbXB0LFxuICAgICAgICA4MDBcbiAgICAgICk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuXG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5vdXRwdXRNb2RlID09PSAnY3Vyc29yJykge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBgXFxuIyMgQ29tcGFyaXNvbjogJHt5ZXN0ZXJkYXlEYXRlfSBcdTIxOTIgJHtjdXJyZW50RGF0ZX1cXG5cXG4ke2NvbXBhcmlzb259XFxuYDtcbiAgICAgICAgZWRpdG9yLnJlcGxhY2VTZWxlY3Rpb24oZm9ybWF0dGVkKTtcbiAgICAgICAgbmV3IE5vdGljZSgnRGF5IGNvbXBhcmlzb24gaW5zZXJ0ZWQhJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjb21wYXJpc29uKTtcbiAgICAgICAgbmV3IE5vdGljZSgnRGF5IGNvbXBhcmlzb24gY29waWVkIHRvIGNsaXBib2FyZCEnKTtcbiAgICAgIH1cblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgbmV3IE5vdGljZShgRXJyb3I6ICR7ZXJyb3JNc2d9YCwgMTAwMDApO1xuICAgICAgY29uc29sZS5lcnJvcignW1llc3RlcmRheSBTdW1tYXJpemVyXSBDb21wYXJlIGVycm9yOicsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBNYWluIHN1bW1hcml6YXRpb24gZnVuY3Rpb25cbiAgYXN5bmMgc3VtbWFyaXplWWVzdGVyZGF5KGVkaXRvcjogRWRpdG9yLCB2aWV3OiBNYXJrZG93blZpZXcpIHtcbiAgICAvLyBTdGVwIDE6IEdldCBjdXJyZW50IGZpbGUgYW5kIGV4dHJhY3QgaXRzIGRhdGVcbiAgICBjb25zdCBjdXJyZW50RmlsZSA9IHZpZXcuZmlsZTtcbiAgICBpZiAoIWN1cnJlbnRGaWxlKSB7XG4gICAgICBuZXcgTm90aWNlKCdObyBmaWxlIGlzIGN1cnJlbnRseSBvcGVuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudEZpbGVuYW1lID0gY3VycmVudEZpbGUuYmFzZW5hbWU7XG4gICAgY29uc3QgY3VycmVudERhdGUgPSB0aGlzLmV4dHJhY3REYXRlRnJvbUZpbGVuYW1lKGN1cnJlbnRGaWxlbmFtZSk7XG5cbiAgICBpZiAoIWN1cnJlbnREYXRlKSB7XG4gICAgICBuZXcgTm90aWNlKGBDYW5ub3QgZXh0cmFjdCBkYXRlIGZyb20gZmlsZW5hbWU6ICR7Y3VycmVudEZpbGVuYW1lfVxcbkV4cGVjdGVkIGZvcm1hdDogWVlZWS1NTS1ERGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFN0ZXAgMjogQ2FsY3VsYXRlIFwieWVzdGVyZGF5XCIgcmVsYXRpdmUgdG8gY3VycmVudCBmaWxlJ3MgZGF0ZVxuICAgIGNvbnN0IHllc3RlcmRheURhdGUgPSB0aGlzLmdldERheUJlZm9yZShjdXJyZW50RGF0ZSk7XG5cbiAgICBjb25zdCBsb2FkaW5nTm90aWNlID0gbmV3IE5vdGljZShgUmVhZGluZyAke3llc3RlcmRheURhdGV9Li4uYCwgMCk7XG5cbiAgICB0cnkge1xuICAgICAgLy8gU3RlcCAzOiBSZWFkIHllc3RlcmRheSdzIG5vdGVcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucmVhZERhaWx5Tm90ZSh5ZXN0ZXJkYXlEYXRlKTtcbiAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgZGF0ZSwgY29udGVudCB9ID0gcmVzdWx0O1xuICAgICAgbG9hZGluZ05vdGljZS5zZXRNZXNzYWdlKGBTdW1tYXJpemluZyAke2RhdGV9IHZpYSBPbGxhbWEuLi5gKTtcblxuICAgICAgLy8gU3RlcCA0OiBCdWlsZCBwcm9tcHQgd2l0aCBkYXRlIGNvbnRleHQsIGRldGFpbCBtb2RpZmllciwgYW5kIGNvbnRleHQgaGludHNcbiAgICAgIGNvbnN0IGRldGFpbE1vZCA9IERFVEFJTF9NT0RJRklFUlNbdGhpcy5zZXR0aW5ncy5kZXRhaWxMZXZlbF07XG4gICAgICBjb25zdCBjb250ZXh0SGludHMgPSBidWlsZENvbnRleHRIaW50cyhjb250ZW50KTtcbiAgICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgU3VtbWFyaXppbmcgZGFpbHkgbm90ZSBmcm9tICR7ZGF0ZX06JHtjb250ZXh0SGludHN9XFxuXFxuJHtTVU1NQVJJWkVfUFJPTVBUfSR7ZGV0YWlsTW9kfVxcblxcbi0tLVxcbiR7Y29udGVudH1gO1xuXG4gICAgICAvLyBTdGVwIDU6IENhbGwgT2xsYW1hIHdpdGggYWRhcHRpdmUgdG9rZW4gbGltaXRcbiAgICAgIGNvbnN0IHRva2VuTGltaXQgPSBjYWxjdWxhdGVUb2tlbkxpbWl0KGNvbnRlbnQpO1xuICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGNhbGxPbGxhbWEoXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hRW5kcG9pbnQsXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hTW9kZWwsXG4gICAgICAgIGZ1bGxQcm9tcHQsXG4gICAgICAgIHRva2VuTGltaXRcbiAgICAgICk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuXG4gICAgICAvLyBTdGVwIDY6IE91dHB1dCB3aXRoIGRhdGUgcmVmZXJlbmNlXG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5vdXRwdXRNb2RlID09PSAnY3Vyc29yJykge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBgXFxuIyMgU3VtbWFyeSBvZiAke2RhdGV9XFxuXFxuJHtzdW1tYXJ5fVxcbmA7XG4gICAgICAgIGVkaXRvci5yZXBsYWNlU2VsZWN0aW9uKGZvcm1hdHRlZCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN1bW1hcnkgb2YgJHtkYXRlfSBpbnNlcnRlZCEgKENtZC9DdHJsK1AgPiBcIlN1bW1hcml6ZSB3ZWVrXCIgZm9yIG1vcmUpYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChzdW1tYXJ5KTtcbiAgICAgICAgbmV3IE5vdGljZShgU3VtbWFyeSBvZiAke2RhdGV9IGNvcGllZCB0byBjbGlwYm9hcmQhYCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW5jcmVtZW50U3RhdHMoJ2RhaWx5Jyk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIG5ldyBOb3RpY2UoYEVycm9yOiAke2Vycm9yTXNnfWAsIDEwMDAwKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tZZXN0ZXJkYXkgU3VtbWFyaXplcl0gRXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFN1bW1hcml6ZSB0b2RheSdzIG5vdGUgKGN1cnJlbnQgZmlsZSlcbiAgYXN5bmMgc3VtbWFyaXplVG9kYXkoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykge1xuICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdmlldy5maWxlO1xuICAgIGlmICghY3VycmVudEZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ05vIGZpbGUgaXMgY3VycmVudGx5IG9wZW4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50RmlsZW5hbWUgPSBjdXJyZW50RmlsZS5iYXNlbmFtZTtcbiAgICBjb25zdCBjdXJyZW50RGF0ZSA9IHRoaXMuZXh0cmFjdERhdGVGcm9tRmlsZW5hbWUoY3VycmVudEZpbGVuYW1lKTtcblxuICAgIGlmICghY3VycmVudERhdGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCBleHRyYWN0IGRhdGUgZnJvbSBmaWxlbmFtZTogJHtjdXJyZW50RmlsZW5hbWV9XFxuRXhwZWN0ZWQgZm9ybWF0OiBZWVlZLU1NLUREYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbG9hZGluZ05vdGljZSA9IG5ldyBOb3RpY2UoYFN1bW1hcml6aW5nICR7Y3VycmVudERhdGV9Li4uYCwgMCk7XG5cbiAgICB0cnkge1xuICAgICAgLy8gUmVhZCBjdXJyZW50IGZpbGUgY29udGVudCBkaXJlY3RseVxuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoY3VycmVudEZpbGUpO1xuICAgICAgY29uc3QgeyBib2R5IH0gPSBleHRyYWN0RnJvbnRtYXR0ZXIoY29udGVudCk7XG4gICAgICBjb25zdCBjbGVhbkNvbnRlbnQgPSB0aGlzLnN0cmlwU3VtbWFyeVNlY3Rpb25zKGJvZHkpO1xuXG4gICAgICBpZiAoIWNsZWFuQ29udGVudC50cmltKCkpIHtcbiAgICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoJ05vdGUgaXMgZW1wdHkgb3IgY29udGFpbnMgb25seSBzdW1tYXJ5IHNlY3Rpb25zJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbG9hZGluZ05vdGljZS5zZXRNZXNzYWdlKGBTdW1tYXJpemluZyB2aWEgT2xsYW1hLi4uYCk7XG5cbiAgICAgIGNvbnN0IGRldGFpbE1vZCA9IERFVEFJTF9NT0RJRklFUlNbdGhpcy5zZXR0aW5ncy5kZXRhaWxMZXZlbF07XG4gICAgICBjb25zdCBjb250ZXh0SGludHMgPSBidWlsZENvbnRleHRIaW50cyhjbGVhbkNvbnRlbnQpO1xuICAgICAgY29uc3QgZnVsbFByb21wdCA9IGBTdW1tYXJpemluZyB0b2RheSdzIG5vdGUgKCR7Y3VycmVudERhdGV9KSAtIG5vdGUgbWF5IGJlIGluLXByb2dyZXNzOiR7Y29udGV4dEhpbnRzfVxcblxcbiR7U1VNTUFSSVpFX1BST01QVH0ke2RldGFpbE1vZH1cXG5cXG4tLS1cXG4ke2NsZWFuQ29udGVudH1gO1xuXG4gICAgICBjb25zdCB0b2tlbkxpbWl0ID0gY2FsY3VsYXRlVG9rZW5MaW1pdChjbGVhbkNvbnRlbnQpO1xuICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGNhbGxPbGxhbWEoXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hRW5kcG9pbnQsXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hTW9kZWwsXG4gICAgICAgIGZ1bGxQcm9tcHQsXG4gICAgICAgIHRva2VuTGltaXRcbiAgICAgICk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuXG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5vdXRwdXRNb2RlID09PSAnY3Vyc29yJykge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBgXFxuIyMgVG9kYXkncyBTdW1tYXJ5ICgke2N1cnJlbnREYXRlfSlcXG5cXG4ke3N1bW1hcnl9XFxuYDtcbiAgICAgICAgZWRpdG9yLnJlcGxhY2VTZWxlY3Rpb24oZm9ybWF0dGVkKTtcbiAgICAgICAgbmV3IE5vdGljZShgVG9kYXkncyBzdW1tYXJ5IGluc2VydGVkIWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoc3VtbWFyeSk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFRvZGF5J3Mgc3VtbWFyeSBjb3BpZWQhYCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW5jcmVtZW50U3RhdHMoJ2RhaWx5Jyk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIG5ldyBOb3RpY2UoYEVycm9yOiAke2Vycm9yTXNnfWAsIDEwMDAwKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tZZXN0ZXJkYXkgU3VtbWFyaXplcl0gVG9kYXkgZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEZvcmNlIHJlLXN1bW1hcml6ZSB5ZXN0ZXJkYXksIGJ5cGFzc2luZyBjYWNoZVxuICBhc3luYyBmb3JjZVN1bW1hcml6ZVllc3RlcmRheShlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSB7XG4gICAgY29uc3QgY3VycmVudEZpbGUgPSB2aWV3LmZpbGU7XG4gICAgaWYgKCFjdXJyZW50RmlsZSkge1xuICAgICAgbmV3IE5vdGljZSgnTm8gZmlsZSBpcyBjdXJyZW50bHkgb3BlbicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnJlbnRGaWxlbmFtZSA9IGN1cnJlbnRGaWxlLmJhc2VuYW1lO1xuICAgIGNvbnN0IGN1cnJlbnREYXRlID0gdGhpcy5leHRyYWN0RGF0ZUZyb21GaWxlbmFtZShjdXJyZW50RmlsZW5hbWUpO1xuXG4gICAgaWYgKCFjdXJyZW50RGF0ZSkge1xuICAgICAgbmV3IE5vdGljZShgQ2Fubm90IGV4dHJhY3QgZGF0ZSBmcm9tIGZpbGVuYW1lOiAke2N1cnJlbnRGaWxlbmFtZX1cXG5FeHBlY3RlZCBmb3JtYXQ6IFlZWVktTU0tRERgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB5ZXN0ZXJkYXlEYXRlID0gdGhpcy5nZXREYXlCZWZvcmUoY3VycmVudERhdGUpO1xuXG4gICAgLy8gQ2xlYXIgY2FjaGUgZW50cnkgZm9yIHRoaXMgZGF0ZVxuICAgIGlmICh0aGlzLnNldHRpbmdzLnN1bW1hcnlDYWNoZVt5ZXN0ZXJkYXlEYXRlXSkge1xuICAgICAgZGVsZXRlIHRoaXMuc2V0dGluZ3Muc3VtbWFyeUNhY2hlW3llc3RlcmRheURhdGVdO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICB9XG5cbiAgICBuZXcgTm90aWNlKGBDYWNoZSBjbGVhcmVkIGZvciAke3llc3RlcmRheURhdGV9LCByZS1zdW1tYXJpemluZy4uLmApO1xuXG4gICAgLy8gTm93IHJ1biByZWd1bGFyIHN1bW1hcml6YXRpb25cbiAgICBhd2FpdCB0aGlzLnN1bW1hcml6ZVllc3RlcmRheShlZGl0b3IsIHZpZXcpO1xuICB9XG5cbiAgLy8gSGFuZGxlIGZpbGUgb3BlbiBldmVudCBmb3IgYXV0by1zdW1tYXJpemF0aW9uXG4gIGFzeW5jIGhhbmRsZUZpbGVPcGVuKGZpbGU6IFRGaWxlKSB7XG4gICAgLy8gQ2hlY2sgaWYgaXQncyBpbiB0aGUgZGFpbHkgbm90ZXMgZm9sZGVyXG4gICAgaWYgKCFmaWxlLnBhdGguc3RhcnRzV2l0aCh0aGlzLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgZmlsZW5hbWUgbWF0Y2hlcyBkYXRlIHBhdHRlcm5cbiAgICBjb25zdCBkYXRlTWF0Y2ggPSB0aGlzLmV4dHJhY3REYXRlRnJvbUZpbGVuYW1lKGZpbGUuYmFzZW5hbWUpO1xuICAgIGlmICghZGF0ZU1hdGNoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUmVhZCB0aGUgZmlsZSBjb250ZW50XG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG5cbiAgICAvLyBDaGVjayBpZiB0YXJnZXQgc2VjdGlvbiBleGlzdHNcbiAgICBjb25zdCB0YXJnZXRTZWN0aW9uID0gdGhpcy5zZXR0aW5ncy50YXJnZXRTZWN0aW9uO1xuICAgIGNvbnN0IHNlY3Rpb25JbmRleCA9IGNvbnRlbnQuaW5kZXhPZih0YXJnZXRTZWN0aW9uKTtcbiAgICBpZiAoc2VjdGlvbkluZGV4ID09PSAtMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHNlY3Rpb24gaXMgZW1wdHkgKG5leHQgbGluZSBhZnRlciBzZWN0aW9uIGhlYWRlciBzaG91bGQgYmUgZW1wdHkgb3IgYW5vdGhlciBoZWFkZXIpXG4gICAgY29uc3QgYWZ0ZXJTZWN0aW9uID0gY29udGVudC5zdWJzdHJpbmcoc2VjdGlvbkluZGV4ICsgdGFyZ2V0U2VjdGlvbi5sZW5ndGgpO1xuICAgIGNvbnN0IG5leHROZXdsaW5lID0gYWZ0ZXJTZWN0aW9uLmluZGV4T2YoJ1xcbicpO1xuICAgIGlmIChuZXh0TmV3bGluZSA9PT0gLTEpIHtcbiAgICAgIC8vIFNlY3Rpb24gaXMgYXQgZW5kIG9mIGZpbGUgd2l0aCBubyBuZXdsaW5lIC0gaXQncyBlbXB0eVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb250ZW50QWZ0ZXJIZWFkZXIgPSBhZnRlclNlY3Rpb24uc3Vic3RyaW5nKG5leHROZXdsaW5lICsgMSk7XG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSdzIGFscmVhZHkgY29udGVudCAobm90IGp1c3Qgd2hpdGVzcGFjZSBvciBuZXh0IHNlY3Rpb24pXG4gICAgICBjb25zdCBuZXh0U2VjdGlvbk1hdGNoID0gY29udGVudEFmdGVySGVhZGVyLm1hdGNoKC9eKFxccyopKCMjfFxcbiMjfCQpLyk7XG4gICAgICBpZiAoIW5leHRTZWN0aW9uTWF0Y2gpIHtcbiAgICAgICAgLy8gVGhlcmUncyBjb250ZW50IGFmdGVyIHRoZSBoZWFkZXIgdGhhdCBpc24ndCBhbm90aGVyIHNlY3Rpb25cbiAgICAgICAgY29uc3QgZmlyc3ROb25XaGl0ZXNwYWNlID0gY29udGVudEFmdGVySGVhZGVyLnRyaW0oKTtcbiAgICAgICAgaWYgKGZpcnN0Tm9uV2hpdGVzcGFjZSAmJiAhZmlyc3ROb25XaGl0ZXNwYWNlLnN0YXJ0c1dpdGgoJyMjJykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHZXQgeWVzdGVyZGF5J3MgZGF0ZSBiYXNlZCBvbiB0aGlzIGZpbGVcbiAgICBjb25zdCB5ZXN0ZXJkYXlEYXRlID0gdGhpcy5nZXREYXlCZWZvcmUoZGF0ZU1hdGNoKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBSZWFkIHllc3RlcmRheSdzIG5vdGUgZmlyc3QgdG8gY2hlY2sgaWYgY29udGVudCBoYXMgY2hhbmdlZFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZWFkRGFpbHlOb3RlKHllc3RlcmRheURhdGUpO1xuICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IGRhdGUsIGNvbnRlbnQ6IHllc3RlcmRheUNvbnRlbnQgfSA9IHJlc3VsdDtcblxuICAgICAgLy8gQ2hlY2sgY29udGVudCBoYXNoIC0gc2tpcCBpZiB1bmNoYW5nZWQgc2luY2UgbGFzdCBzdW1tYXJpemF0aW9uXG4gICAgICBjb25zdCBjb250ZW50SGFzaCA9IHNpbXBsZUhhc2goeWVzdGVyZGF5Q29udGVudCArIHRoaXMuc2V0dGluZ3MuZGV0YWlsTGV2ZWwpO1xuICAgICAgY29uc3QgY2FjaGVkSGFzaCA9IHRoaXMuc2V0dGluZ3Muc3VtbWFyeUNhY2hlW2RhdGVdO1xuXG4gICAgICBpZiAoY2FjaGVkSGFzaCA9PT0gY29udGVudEhhc2gpIHtcbiAgICAgICAgLy8gQ29udGVudCB1bmNoYW5nZWQsIHNraXAgc3VtbWFyaXphdGlvbiBzaWxlbnRseVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbG9hZGluZ05vdGljZSA9IG5ldyBOb3RpY2UoYEF1dG8tc3VtbWFyaXppbmcgJHt5ZXN0ZXJkYXlEYXRlfS4uLmAsIDApO1xuICAgICAgbG9hZGluZ05vdGljZS5zZXRNZXNzYWdlKGBTdW1tYXJpemluZyAke2RhdGV9IHZpYSBPbGxhbWEuLi5gKTtcblxuICAgICAgLy8gQnVpbGQgcHJvbXB0IGFuZCBjYWxsIE9sbGFtYSB3aXRoIGFkYXB0aXZlIHRva2VuIGxpbWl0XG4gICAgICBjb25zdCBkZXRhaWxNb2QgPSBERVRBSUxfTU9ESUZJRVJTW3RoaXMuc2V0dGluZ3MuZGV0YWlsTGV2ZWxdO1xuICAgICAgY29uc3QgY29udGV4dEhpbnRzID0gYnVpbGRDb250ZXh0SGludHMoeWVzdGVyZGF5Q29udGVudCk7XG4gICAgICBjb25zdCBmdWxsUHJvbXB0ID0gYFN1bW1hcml6aW5nIGRhaWx5IG5vdGUgZnJvbSAke2RhdGV9OiR7Y29udGV4dEhpbnRzfVxcblxcbiR7U1VNTUFSSVpFX1BST01QVH0ke2RldGFpbE1vZH1cXG5cXG4tLS1cXG4ke3llc3RlcmRheUNvbnRlbnR9YDtcbiAgICAgIGNvbnN0IHRva2VuTGltaXQgPSBjYWxjdWxhdGVUb2tlbkxpbWl0KHllc3RlcmRheUNvbnRlbnQpO1xuICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGNhbGxPbGxhbWEoXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hRW5kcG9pbnQsXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hTW9kZWwsXG4gICAgICAgIGZ1bGxQcm9tcHQsXG4gICAgICAgIHRva2VuTGltaXRcbiAgICAgICk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuXG4gICAgICAvLyBJbnNlcnQgc3VtbWFyeSBhZnRlciB0aGUgdGFyZ2V0IHNlY3Rpb24gaGVhZGVyXG4gICAgICBhd2FpdCB0aGlzLmluc2VydEF0U2VjdGlvbihmaWxlLCB0YXJnZXRTZWN0aW9uLCBzdW1tYXJ5KTtcblxuICAgICAgLy8gVXBkYXRlIGNhY2hlIHdpdGggbmV3IGNvbnRlbnQgaGFzaFxuICAgICAgdGhpcy5zZXR0aW5ncy5zdW1tYXJ5Q2FjaGVbZGF0ZV0gPSBjb250ZW50SGFzaDtcbiAgICAgIC8vIENsZWFuIG9sZCBjYWNoZSBlbnRyaWVzIChrZWVwIGxhc3QgMzAgZGF5cylcbiAgICAgIHRoaXMuY2xlYW5TdW1tYXJ5Q2FjaGUoKTtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG5cbiAgICAgIC8vIFRyYWNrIHN0YXRzICh3aXRob3V0IGV4dHJhIHNhdmUgc2luY2UgaW5jcmVtZW50U3RhdHMgc2F2ZXMpXG4gICAgICBhd2FpdCB0aGlzLmluY3JlbWVudFN0YXRzKCdkYWlseScpO1xuXG4gICAgICBuZXcgTm90aWNlKGBBdXRvLXN1bW1hcml6ZWQgJHtkYXRlfSEgKENtZC9DdHJsK1AgPiBcIlN1bW1hcml6ZVwiIGZvciB3ZWVrL21vbnRoKWApO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgbmV3IE5vdGljZShgQXV0by1zdW1tYXJpemUgZXJyb3I6ICR7ZXJyb3JNc2d9YCwgMTAwMDApO1xuICAgICAgY29uc29sZS5lcnJvcignW1llc3RlcmRheSBTdW1tYXJpemVyXSBBdXRvLXN1bW1hcml6ZSBlcnJvcjonLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2xlYW4gb2xkIGNhY2hlIGVudHJpZXMgdG8gcHJldmVudCB1bmJvdW5kZWQgZ3Jvd3RoXG4gIGNsZWFuU3VtbWFyeUNhY2hlKCkge1xuICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyh0aGlzLnNldHRpbmdzLnN1bW1hcnlDYWNoZSk7XG4gICAgaWYgKGVudHJpZXMubGVuZ3RoIDw9IDMwKSByZXR1cm47XG5cbiAgICAvLyBTb3J0IGJ5IGRhdGUgKG5ld2VzdCBmaXJzdCkgYW5kIGtlZXAgb25seSBsYXN0IDMwXG4gICAgZW50cmllcy5zb3J0KChhLCBiKSA9PiBiWzBdLmxvY2FsZUNvbXBhcmUoYVswXSkpO1xuICAgIHRoaXMuc2V0dGluZ3Muc3VtbWFyeUNhY2hlID0gT2JqZWN0LmZyb21FbnRyaWVzKGVudHJpZXMuc2xpY2UoMCwgMzApKTtcbiAgfVxuXG4gIC8vIFRlc3QgT2xsYW1hIGNvbm5lY3Rpb24gYW5kIG1vZGVsIGF2YWlsYWJpbGl0eVxuICBhc3luYyB0ZXN0Q29ubmVjdGlvbigpIHtcbiAgICBjb25zdCBsb2FkaW5nTm90aWNlID0gbmV3IE5vdGljZSgnVGVzdGluZyBPbGxhbWEgY29ubmVjdGlvbi4uLicsIDApO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIFRlc3QgZW5kcG9pbnQgcmVhY2hhYmlsaXR5XG4gICAgICBjb25zdCB0YWdzUmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50fS9hcGkvdGFnc2AsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgIGlmICh0YWdzUmVzcG9uc2Uuc3RhdHVzICE9PSAyMDApIHtcbiAgICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYE9sbGFtYSBub3QgcmVhY2hhYmxlIGF0ICR7dGhpcy5zZXR0aW5ncy5vbGxhbWFFbmRwb2ludH1cXG5TdGF0dXM6ICR7dGFnc1Jlc3BvbnNlLnN0YXR1c31gLCAxMDAwMCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbW9kZWxzID0gKHRhZ3NSZXNwb25zZS5qc29uLm1vZGVscyB8fCBbXSkubWFwKChtOiB7IG5hbWU6IHN0cmluZyB9KSA9PiBtLm5hbWUpO1xuXG4gICAgICBsb2FkaW5nTm90aWNlLnNldE1lc3NhZ2UoJ1Rlc3RpbmcgbW9kZWwgcmVzcG9uc2UuLi4nKTtcblxuICAgICAgLy8gUXVpY2sgZ2VuZXJhdGlvbiB0ZXN0XG4gICAgICBjb25zdCB0ZXN0U3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgY29uc3QgdGVzdFJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7dGhpcy5zZXR0aW5ncy5vbGxhbWFFbmRwb2ludH0vYXBpL2dlbmVyYXRlYCxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgbW9kZWw6IHRoaXMuc2V0dGluZ3Mub2xsYW1hTW9kZWwsXG4gICAgICAgICAgcHJvbXB0OiAnU2F5IFwiT0tcIiBhbmQgbm90aGluZyBlbHNlLicsXG4gICAgICAgICAgc3RyZWFtOiBmYWxzZSxcbiAgICAgICAgICBvcHRpb25zOiB7IG51bV9wcmVkaWN0OiAxMCB9XG4gICAgICAgIH0pLFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB0ZXN0RHVyYXRpb24gPSBEYXRlLm5vdygpIC0gdGVzdFN0YXJ0O1xuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG5cbiAgICAgIGlmICh0ZXN0UmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgICBgXHUyNzEzIENvbm5lY3Rpb24gT0tcXG5gICtcbiAgICAgICAgICBgXHUyNzEzIE1vZGVsOiAke3RoaXMuc2V0dGluZ3Mub2xsYW1hTW9kZWx9XFxuYCArXG4gICAgICAgICAgYFx1MjcxMyBSZXNwb25zZSB0aW1lOiAke3Rlc3REdXJhdGlvbn1tc1xcbmAgK1xuICAgICAgICAgIGBcdTI3MTMgQXZhaWxhYmxlIG1vZGVsczogJHttb2RlbHMubGVuZ3RofWAsXG4gICAgICAgICAgNTAwMFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmICh0ZXN0UmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgICBgXHUyNzEzIE9sbGFtYSBjb25uZWN0ZWRcXG5gICtcbiAgICAgICAgICBgXHUyNzE3IE1vZGVsIG5vdCBmb3VuZDogJHt0aGlzLnNldHRpbmdzLm9sbGFtYU1vZGVsfVxcbmAgK1xuICAgICAgICAgIGBBdmFpbGFibGU6ICR7bW9kZWxzLnNsaWNlKDAsIDUpLmpvaW4oJywgJyl9JHttb2RlbHMubGVuZ3RoID4gNSA/ICcuLi4nIDogJyd9YCxcbiAgICAgICAgICAxMDAwMFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3IE5vdGljZShgT2xsYW1hIGVycm9yOiBzdGF0dXMgJHt0ZXN0UmVzcG9uc2Uuc3RhdHVzfWAsIDEwMDAwKTtcbiAgICAgIH1cblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgbmV3IE5vdGljZShgQ29ubmVjdGlvbiB0ZXN0IGZhaWxlZDogJHtlcnJvck1zZ31gLCAxMDAwMCk7XG4gICAgfVxuICB9XG5cbiAgLy8gQmF0Y2ggc3VtbWFyaXplIG5vdGVzIHRoYXQgYXJlIG1pc3Npbmcgc3VtbWFyaWVzXG4gIGFzeW5jIGJhdGNoU3VtbWFyaXplKCkge1xuICAgIGNvbnN0IGxvYWRpbmdOb3RpY2UgPSBuZXcgTm90aWNlKCdTY2FubmluZyBmb3Igbm90ZXMgd2l0aG91dCBzdW1tYXJpZXMuLi4nLCAwKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBHZXQgYWxsIGZpbGVzIGluIGRhaWx5IG5vdGVzIGZvbGRlclxuICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMuc2V0dGluZ3MuZGFpbHlOb3Rlc0ZvbGRlcik7XG4gICAgICBpZiAoIWZvbGRlciB8fCAhKCdjaGlsZHJlbicgaW4gZm9sZGVyKSkge1xuICAgICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgICAgbmV3IE5vdGljZShgRGFpbHkgbm90ZXMgZm9sZGVyIG5vdCBmb3VuZDogJHt0aGlzLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXJ9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlsZXMgPSAoZm9sZGVyIGFzIHsgY2hpbGRyZW46IFRGaWxlW10gfSkuY2hpbGRyZW5cbiAgICAgICAgLmZpbHRlcigoZik6IGYgaXMgVEZpbGUgPT4gZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSAnbWQnKVxuICAgICAgICAuc29ydCgoYSwgYikgPT4gYi5iYXNlbmFtZS5sb2NhbGVDb21wYXJlKGEuYmFzZW5hbWUpKTsgLy8gTmV3ZXN0IGZpcnN0XG5cbiAgICAgIC8vIEZpbmQgbm90ZXMgd2l0aG91dCBzdW1tYXJpZXMgKGxhc3QgMzAgZGF5cylcbiAgICAgIGNvbnN0IG5vdGVzTmVlZGluZ1N1bW1hcnk6IFRGaWxlW10gPSBbXTtcbiAgICAgIGNvbnN0IHRhcmdldFNlY3Rpb24gPSB0aGlzLnNldHRpbmdzLnRhcmdldFNlY3Rpb247XG5cbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcy5zbGljZSgwLCAzMCkpIHsgLy8gTGltaXQgdG8gbGFzdCAzMCB0byBwcmV2ZW50IHJ1bmF3YXlcbiAgICAgICAgY29uc3QgZGF0ZU1hdGNoID0gdGhpcy5leHRyYWN0RGF0ZUZyb21GaWxlbmFtZShmaWxlLmJhc2VuYW1lKTtcbiAgICAgICAgaWYgKCFkYXRlTWF0Y2gpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBjb250ZW50LmluZGV4T2YodGFyZ2V0U2VjdGlvbik7XG5cbiAgICAgICAgaWYgKHNlY3Rpb25JbmRleCA9PT0gLTEpIGNvbnRpbnVlOyAvLyBObyB0YXJnZXQgc2VjdGlvblxuXG4gICAgICAgIC8vIENoZWNrIGlmIHNlY3Rpb24gaGFzIGNvbnRlbnRcbiAgICAgICAgY29uc3QgYWZ0ZXJTZWN0aW9uID0gY29udGVudC5zdWJzdHJpbmcoc2VjdGlvbkluZGV4ICsgdGFyZ2V0U2VjdGlvbi5sZW5ndGgpO1xuICAgICAgICBjb25zdCBuZXh0TmV3bGluZSA9IGFmdGVyU2VjdGlvbi5pbmRleE9mKCdcXG4nKTtcbiAgICAgICAgaWYgKG5leHROZXdsaW5lID09PSAtMSkge1xuICAgICAgICAgIG5vdGVzTmVlZGluZ1N1bW1hcnkucHVzaChmaWxlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRBZnRlckhlYWRlciA9IGFmdGVyU2VjdGlvbi5zdWJzdHJpbmcobmV4dE5ld2xpbmUgKyAxKS50cmltKCk7XG4gICAgICAgIGNvbnN0IG5leHRTZWN0aW9uID0gY29udGVudEFmdGVySGVhZGVyLm1hdGNoKC9eIyNcXHMvKTtcbiAgICAgICAgaWYgKCFjb250ZW50QWZ0ZXJIZWFkZXIgfHwgbmV4dFNlY3Rpb24pIHtcbiAgICAgICAgICBub3Rlc05lZWRpbmdTdW1tYXJ5LnB1c2goZmlsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG5vdGVzTmVlZGluZ1N1bW1hcnkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgICBuZXcgTm90aWNlKCdBbGwgcmVjZW50IG5vdGVzIGhhdmUgc3VtbWFyaWVzIScpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvYWRpbmdOb3RpY2Uuc2V0TWVzc2FnZShgRm91bmQgJHtub3Rlc05lZWRpbmdTdW1tYXJ5Lmxlbmd0aH0gbm90ZXMgd2l0aG91dCBzdW1tYXJpZXMuIFN0YXJ0aW5nIGJhdGNoLi4uYCk7XG5cbiAgICAgIGxldCBwcm9jZXNzZWQgPSAwO1xuICAgICAgbGV0IGVycm9ycyA9IDA7XG5cbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBub3Rlc05lZWRpbmdTdW1tYXJ5KSB7XG4gICAgICAgIGNvbnN0IGRhdGVNYXRjaCA9IHRoaXMuZXh0cmFjdERhdGVGcm9tRmlsZW5hbWUoZmlsZS5iYXNlbmFtZSk7XG4gICAgICAgIGlmICghZGF0ZU1hdGNoKSBjb250aW51ZTtcblxuICAgICAgICBjb25zdCB5ZXN0ZXJkYXlEYXRlID0gdGhpcy5nZXREYXlCZWZvcmUoZGF0ZU1hdGNoKTtcbiAgICAgICAgbG9hZGluZ05vdGljZS5zZXRNZXNzYWdlKGBbJHtwcm9jZXNzZWQgKyAxfS8ke25vdGVzTmVlZGluZ1N1bW1hcnkubGVuZ3RofV0gU3VtbWFyaXppbmcgJHt5ZXN0ZXJkYXlEYXRlfS4uLmApO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gUmVhZCB5ZXN0ZXJkYXkncyBub3RlXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZWFkRGFpbHlOb3RlKHllc3RlcmRheURhdGUpO1xuICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICBlcnJvcnMrKztcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHsgZGF0ZSwgY29udGVudDogeWVzdGVyZGF5Q29udGVudCB9ID0gcmVzdWx0O1xuXG4gICAgICAgICAgLy8gQnVpbGQgcHJvbXB0IGFuZCBzdW1tYXJpemVcbiAgICAgICAgICBjb25zdCBkZXRhaWxNb2QgPSBERVRBSUxfTU9ESUZJRVJTW3RoaXMuc2V0dGluZ3MuZGV0YWlsTGV2ZWxdO1xuICAgICAgICAgIGNvbnN0IGNvbnRleHRIaW50cyA9IGJ1aWxkQ29udGV4dEhpbnRzKHllc3RlcmRheUNvbnRlbnQpO1xuICAgICAgICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgU3VtbWFyaXppbmcgZGFpbHkgbm90ZSBmcm9tICR7ZGF0ZX06JHtjb250ZXh0SGludHN9XFxuXFxuJHtTVU1NQVJJWkVfUFJPTVBUfSR7ZGV0YWlsTW9kfVxcblxcbi0tLVxcbiR7eWVzdGVyZGF5Q29udGVudH1gO1xuICAgICAgICAgIGNvbnN0IHRva2VuTGltaXQgPSBjYWxjdWxhdGVUb2tlbkxpbWl0KHllc3RlcmRheUNvbnRlbnQpO1xuXG4gICAgICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGNhbGxPbGxhbWEoXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50LFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5vbGxhbWFNb2RlbCxcbiAgICAgICAgICAgIGZ1bGxQcm9tcHQsXG4gICAgICAgICAgICB0b2tlbkxpbWl0XG4gICAgICAgICAgKTtcblxuICAgICAgICAgIC8vIEluc2VydCBpbnRvIHRoZSBmaWxlXG4gICAgICAgICAgYXdhaXQgdGhpcy5pbnNlcnRBdFNlY3Rpb24oZmlsZSwgdGFyZ2V0U2VjdGlvbiwgc3VtbWFyeSk7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgY2FjaGVcbiAgICAgICAgICBjb25zdCBjb250ZW50SGFzaCA9IHNpbXBsZUhhc2goeWVzdGVyZGF5Q29udGVudCArIHRoaXMuc2V0dGluZ3MuZGV0YWlsTGV2ZWwpO1xuICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3VtbWFyeUNhY2hlW2RhdGVdID0gY29udGVudEhhc2g7XG5cbiAgICAgICAgICBhd2FpdCB0aGlzLmluY3JlbWVudFN0YXRzKCdkYWlseScpO1xuICAgICAgICAgIHByb2Nlc3NlZCsrO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihgW0JhdGNoXSBFcnJvciBwcm9jZXNzaW5nICR7ZmlsZS5iYXNlbmFtZX06YCwgZXJyb3IpO1xuICAgICAgICAgIGVycm9ycysrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFNhdmUgY2FjaGUgYWZ0ZXIgYmF0Y2hcbiAgICAgIHRoaXMuY2xlYW5TdW1tYXJ5Q2FjaGUoKTtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgbmV3IE5vdGljZShgQmF0Y2ggY29tcGxldGU6ICR7cHJvY2Vzc2VkfSBzdW1tYXJpemVkLCAke2Vycm9yc30gZXJyb3JzYCk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIG5ldyBOb3RpY2UoYEJhdGNoIGVycm9yOiAke2Vycm9yTXNnfWAsIDEwMDAwKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tZZXN0ZXJkYXkgU3VtbWFyaXplcl0gQmF0Y2ggZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEV4cG9ydCBhbGwgc3VtbWFyaWVzIHRvIGEgc2luZ2xlIGZpbGVcbiAgYXN5bmMgZXhwb3J0U3VtbWFyaWVzKCkge1xuICAgIGNvbnN0IGxvYWRpbmdOb3RpY2UgPSBuZXcgTm90aWNlKCdTY2FubmluZyBkYWlseSBub3RlcyBmb3Igc3VtbWFyaWVzLi4uJywgMCk7XG5cbiAgICB0cnkge1xuICAgICAgLy8gR2V0IGFsbCBmaWxlcyBpbiBkYWlseSBub3RlcyBmb2xkZXJcbiAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXIpO1xuICAgICAgaWYgKCFmb2xkZXIgfHwgISgnY2hpbGRyZW4nIGluIGZvbGRlcikpIHtcbiAgICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYERhaWx5IG5vdGVzIGZvbGRlciBub3QgZm91bmQ6ICR7dGhpcy5zZXR0aW5ncy5kYWlseU5vdGVzRm9sZGVyfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVzID0gKGZvbGRlciBhcyB7IGNoaWxkcmVuOiBURmlsZVtdIH0pLmNoaWxkcmVuXG4gICAgICAgIC5maWx0ZXIoKGYpOiBmIGlzIFRGaWxlID0+IGYgaW5zdGFuY2VvZiBURmlsZSAmJiBmLmV4dGVuc2lvbiA9PT0gJ21kJylcbiAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIuYmFzZW5hbWUubG9jYWxlQ29tcGFyZShhLmJhc2VuYW1lKSk7IC8vIE5ld2VzdCBmaXJzdFxuXG4gICAgICBsb2FkaW5nTm90aWNlLnNldE1lc3NhZ2UoYFNjYW5uaW5nICR7ZmlsZXMubGVuZ3RofSBkYWlseSBub3Rlcy4uLmApO1xuXG4gICAgICBjb25zdCBzdW1tYXJpZXM6IEFycmF5PHsgZGF0ZTogc3RyaW5nOyBzdW1tYXJ5OiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgIGNvbnN0IGRhdGVNYXRjaCA9IHRoaXMuZXh0cmFjdERhdGVGcm9tRmlsZW5hbWUoZmlsZS5iYXNlbmFtZSk7XG4gICAgICAgIGlmICghZGF0ZU1hdGNoKSBjb250aW51ZTtcblxuICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcblxuICAgICAgICAvLyBFeHRyYWN0IHN1bW1hcnkgc2VjdGlvbnNcbiAgICAgICAgY29uc3Qgc3VtbWFyeVBhdHRlcm5zID0gW1xuICAgICAgICAgIC8jIyBTdW1tYXJ5IG9mIFxcZHs0fS1cXGR7Mn0tXFxkezJ9XFxuXFxuKFtcXHNcXFNdKj8pKD89XFxuIyMgfFxcbi0tLXxcXFopL2csXG4gICAgICAgICAgLyMjIFllc3RlcmRheSdzIEhpZ2hsaWdodHNcXG5cXG4oW1xcc1xcU10qPykoPz1cXG4jIyB8XFxuLS0tfFxcWikvZyxcbiAgICAgICAgICAvIyMgV2VlayBTdW1tYXJ5W15cXG5dKlxcblxcbihbXFxzXFxTXSo/KSg/PVxcbiMjIHxcXG4tLS18XFxaKS9nLFxuICAgICAgICAgIC8jIyBNb250aGx5IFN1bW1hcnlbXlxcbl0qXFxuXFxuKFtcXHNcXFNdKj8pKD89XFxuIyMgfFxcbi0tLXxcXFopL2csXG4gICAgICAgICAgLyMjIFRvZGF5J3MgU3VtbWFyeVteXFxuXSpcXG5cXG4oW1xcc1xcU10qPykoPz1cXG4jIyB8XFxuLS0tfFxcWikvZ1xuICAgICAgICBdO1xuXG4gICAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBzdW1tYXJ5UGF0dGVybnMpIHtcbiAgICAgICAgICBsZXQgbWF0Y2g7XG4gICAgICAgICAgd2hpbGUgKChtYXRjaCA9IHBhdHRlcm4uZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IHN1bW1hcnlUZXh0ID0gbWF0Y2hbMV0udHJpbSgpO1xuICAgICAgICAgICAgaWYgKHN1bW1hcnlUZXh0KSB7XG4gICAgICAgICAgICAgIHN1bW1hcmllcy5wdXNoKHsgZGF0ZTogZGF0ZU1hdGNoLCBzdW1tYXJ5OiBzdW1tYXJ5VGV4dCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHN1bW1hcmllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoJ05vIHN1bW1hcmllcyBmb3VuZCBpbiBkYWlseSBub3RlcycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFNvcnQgYnkgZGF0ZSAobmV3ZXN0IGZpcnN0KSBhbmQgZGVkdXBsaWNhdGVcbiAgICAgIGNvbnN0IHNlZW5EYXRlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgY29uc3QgdW5pcXVlU3VtbWFyaWVzID0gc3VtbWFyaWVzXG4gICAgICAgIC5zb3J0KChhLCBiKSA9PiBiLmRhdGUubG9jYWxlQ29tcGFyZShhLmRhdGUpKVxuICAgICAgICAuZmlsdGVyKHMgPT4ge1xuICAgICAgICAgIGlmIChzZWVuRGF0ZXMuaGFzKHMuZGF0ZSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICBzZWVuRGF0ZXMuYWRkKHMuZGF0ZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBCdWlsZCBleHBvcnQgY29udGVudFxuICAgICAgbGV0IGV4cG9ydENvbnRlbnQgPSBgIyBKb3VybmFsIFN1bW1hcmllcyBFeHBvcnRcXG5cXG5gO1xuICAgICAgZXhwb3J0Q29udGVudCArPSBgKkV4cG9ydGVkICR7dW5pcXVlU3VtbWFyaWVzLmxlbmd0aH0gc3VtbWFyaWVzIG9uICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF19KlxcblxcbmA7XG4gICAgICBleHBvcnRDb250ZW50ICs9IGAtLS1cXG5cXG5gO1xuXG4gICAgICBmb3IgKGNvbnN0IHsgZGF0ZSwgc3VtbWFyeSB9IG9mIHVuaXF1ZVN1bW1hcmllcykge1xuICAgICAgICBleHBvcnRDb250ZW50ICs9IGAjIyAke2RhdGV9XFxuXFxuJHtzdW1tYXJ5fVxcblxcbi0tLVxcblxcbmA7XG4gICAgICB9XG5cbiAgICAgIC8vIFdyaXRlIHRvIGZpbGVcbiAgICAgIGNvbnN0IGV4cG9ydFBhdGggPSBgJHt0aGlzLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXJ9L3N1bW1hcmllcy1leHBvcnQubWRgO1xuICAgICAgY29uc3QgZXhpc3RpbmdGaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGV4cG9ydFBhdGgpO1xuXG4gICAgICBpZiAoZXhpc3RpbmdGaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGV4aXN0aW5nRmlsZSwgZXhwb3J0Q29udGVudCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZXhwb3J0UGF0aCwgZXhwb3J0Q29udGVudCk7XG4gICAgICB9XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgbmV3IE5vdGljZShgRXhwb3J0ZWQgJHt1bmlxdWVTdW1tYXJpZXMubGVuZ3RofSBzdW1tYXJpZXMgdG8gJHtleHBvcnRQYXRofWApO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBuZXcgTm90aWNlKGBFeHBvcnQgZXJyb3I6ICR7ZXJyb3JNc2d9YCwgMTAwMDApO1xuICAgICAgY29uc29sZS5lcnJvcignW1llc3RlcmRheSBTdW1tYXJpemVyXSBFeHBvcnQgZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluc2VydCBjb250ZW50IGFmdGVyIGEgc2VjdGlvbiBoZWFkZXJcbiAgYXN5bmMgaW5zZXJ0QXRTZWN0aW9uKGZpbGU6IFRGaWxlLCBzZWN0aW9uSGVhZGVyOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuICAgIGNvbnN0IGZpbGVDb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBmaWxlQ29udGVudC5pbmRleE9mKHNlY3Rpb25IZWFkZXIpO1xuXG4gICAgaWYgKHNlY3Rpb25JbmRleCA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2VjdGlvbiBcIiR7c2VjdGlvbkhlYWRlcn1cIiBub3QgZm91bmRgKTtcbiAgICB9XG5cbiAgICAvLyBGaW5kIHRoZSBlbmQgb2YgdGhlIHNlY3Rpb24gaGVhZGVyIGxpbmVcbiAgICBjb25zdCBoZWFkZXJFbmQgPSBmaWxlQ29udGVudC5pbmRleE9mKCdcXG4nLCBzZWN0aW9uSW5kZXgpO1xuICAgIGlmIChoZWFkZXJFbmQgPT09IC0xKSB7XG4gICAgICAvLyBTZWN0aW9uIGhlYWRlciBpcyBhdCBlbmQgb2YgZmlsZVxuICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpbGVDb250ZW50ICsgJ1xcblxcbicgKyBjb250ZW50ICsgJ1xcbic7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgbmV3Q29udGVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEluc2VydCBhZnRlciBoZWFkZXJcbiAgICAgIGNvbnN0IGJlZm9yZSA9IGZpbGVDb250ZW50LnN1YnN0cmluZygwLCBoZWFkZXJFbmQgKyAxKTtcbiAgICAgIGNvbnN0IGFmdGVyID0gZmlsZUNvbnRlbnQuc3Vic3RyaW5nKGhlYWRlckVuZCArIDEpO1xuICAgICAgY29uc3QgbmV3Q29udGVudCA9IGJlZm9yZSArICdcXG4nICsgY29udGVudCArICdcXG4nICsgYWZ0ZXI7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgbmV3Q29udGVudCk7XG4gICAgfVxuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNldHRpbmdzIFRhYlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vLyBGZXRjaCBhdmFpbGFibGUgbW9kZWxzIGZyb20gT2xsYW1hXG5hc3luYyBmdW5jdGlvbiBmZXRjaEF2YWlsYWJsZU1vZGVscyhlbmRwb2ludDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2VuZHBvaW50fS9hcGkvdGFnc2AsXG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbW9kZWxzID0gKGRhdGEubW9kZWxzIHx8IFtdKVxuICAgICAgICAubWFwKChtOiB7IG5hbWU6IHN0cmluZyB9KSA9PiBtLm5hbWUpXG4gICAgICAgIC5zb3J0KChhOiBzdHJpbmcsIGI6IHN0cmluZykgPT4gYS5sb2NhbGVDb21wYXJlKGIpKTtcbiAgICAgIHJldHVybiBtb2RlbHM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cbmNsYXNzIFllc3RlcmRheVN1bW1hcml6ZXJTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHBsdWdpbjogWWVzdGVyZGF5U3VtbWFyaXplclBsdWdpbjtcbiAgYXZhaWxhYmxlTW9kZWxzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFllc3RlcmRheVN1bW1hcml6ZXJQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcblxuICAgIC8vIEZldGNoIGF2YWlsYWJsZSBtb2RlbHMgaW4gYmFja2dyb3VuZFxuICAgIGZldGNoQXZhaWxhYmxlTW9kZWxzKHRoaXMucGx1Z2luLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50KS50aGVuKG1vZGVscyA9PiB7IHRoaXMuYXZhaWxhYmxlTW9kZWxzID0gbW9kZWxzOyB9KTtcblxuICAgIC8vIE9sbGFtYSBlbmRwb2ludFxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ09sbGFtYSBlbmRwb2ludCcpXG4gICAgICAuc2V0RGVzYygnU2VydmVyIGFkZHJlc3MuJylcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mub2xsYW1hRW5kcG9pbnQpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFFbmRwb2ludCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIC8vIFJlZnJlc2ggbW9kZWxzIHdoZW4gZW5kcG9pbnQgY2hhbmdlc1xuICAgICAgICAgIHRoaXMuYXZhaWxhYmxlTW9kZWxzID0gYXdhaXQgZmV0Y2hBdmFpbGFibGVNb2RlbHModmFsdWUpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KSk7XG5cbiAgICAvLyBPbGxhbWEgbW9kZWxcbiAgICBjb25zdCBtb2RlbFNldHRpbmcgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdPbGxhbWEgbW9kZWwnKVxuICAgICAgLnNldERlc2ModGhpcy5hdmFpbGFibGVNb2RlbHMubGVuZ3RoID4gMFxuICAgICAgICA/IGAke3RoaXMuYXZhaWxhYmxlTW9kZWxzLmxlbmd0aH0gbW9kZWxzIGRldGVjdGVkLiBSZWNvbW1lbmRlZDogZ2VtbWEzOjEyYiAoYmVzdCBiYWxhbmNlKWBcbiAgICAgICAgOiAnQ291bGQgbm90IGRldGVjdCBtb2RlbHMuIEVudGVyIG1hbnVhbGx5IG9yIGNoZWNrIGlmIE9sbGFtYSBpcyBydW5uaW5nLicpO1xuXG4gICAgaWYgKHRoaXMuYXZhaWxhYmxlTW9kZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIER5bmFtaWMgZHJvcGRvd24gZnJvbSBkZXRlY3RlZCBtb2RlbHNcbiAgICAgIG1vZGVsU2V0dGluZy5hZGREcm9wZG93bihkcm9wZG93biA9PiB7XG4gICAgICAgIC8vIEFkZCByZWNvbW1lbmRlZCBtb2RlbHMgZmlyc3QgaWYgYXZhaWxhYmxlXG4gICAgICAgIC8vIEJlbmNobWFyayB2MiByYW5raW5nczogZGVlcHNlZWstcjE6bGF0ZXN0ICg5MSksIGdlbW1hMzoxMmIgKDgyKSwgcXdlbjIuNS1jb2Rlcjo3YiAoNTgpXG4gICAgICAgIGNvbnN0IHJlY29tbWVuZGVkID0gWydnZW1tYTM6MTJiJywgJ2RlZXBzZWVrLXIxOmxhdGVzdCcsICdkZWVwc2Vlay1yMTo4YicsICdxd2VuMi41LWNvZGVyOjdiJ107XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVJlY29tbWVuZGVkID0gcmVjb21tZW5kZWQuZmlsdGVyKG0gPT4gdGhpcy5hdmFpbGFibGVNb2RlbHMuaW5jbHVkZXMobSkpO1xuICAgICAgICBjb25zdCBvdGhlck1vZGVscyA9IHRoaXMuYXZhaWxhYmxlTW9kZWxzLmZpbHRlcihtID0+ICFyZWNvbW1lbmRlZC5pbmNsdWRlcyhtKSk7XG5cbiAgICAgICAgYXZhaWxhYmxlUmVjb21tZW5kZWQuZm9yRWFjaChtb2RlbCA9PiB7XG4gICAgICAgICAgY29uc3QgbGFiZWwgPSBtb2RlbCA9PT0gJ2dlbW1hMzoxMmInID8gYCR7bW9kZWx9IChSZWNvbW1lbmRlZCAtIGJlc3QgYmFsYW5jZSlgXG4gICAgICAgICAgICA6IG1vZGVsID09PSAnZGVlcHNlZWstcjE6bGF0ZXN0JyA/IGAke21vZGVsfSAoQmVzdCBxdWFsaXR5KWBcbiAgICAgICAgICAgIDogbW9kZWwgPT09ICdxd2VuMi41LWNvZGVyOjdiJyA/IGAke21vZGVsfSAoRmFzdGVzdClgXG4gICAgICAgICAgICA6IG1vZGVsO1xuICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbGFiZWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoYXZhaWxhYmxlUmVjb21tZW5kZWQubGVuZ3RoID4gMCAmJiBvdGhlck1vZGVscy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKCctLS0nLCAnXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvdGhlck1vZGVscy5mb3JFYWNoKG1vZGVsID0+IHtcbiAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGN1cnJlbnQgdmFsdWUsIGRlZmF1bHRpbmcgdG8gZmlyc3Qgb3B0aW9uIGlmIGN1cnJlbnQgbm90IGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBjdXJyZW50TW9kZWwgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFNb2RlbDtcbiAgICAgICAgaWYgKHRoaXMuYXZhaWxhYmxlTW9kZWxzLmluY2x1ZGVzKGN1cnJlbnRNb2RlbCkpIHtcbiAgICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjdXJyZW50TW9kZWwpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuYXZhaWxhYmxlTW9kZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLmF2YWlsYWJsZU1vZGVsc1swXSk7XG4gICAgICAgIH1cblxuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBpZiAodmFsdWUgIT09ICctLS0nKSB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZHJvcGRvd247XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBbHdheXMgYWxsb3cgY3VzdG9tIG1vZGVsIGVudHJ5XG4gICAgbW9kZWxTZXR0aW5nLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAuc2V0UGxhY2Vob2xkZXIoJ09yIGVudGVyIGN1c3RvbSBtb2RlbC4uLicpXG4gICAgICAuc2V0VmFsdWUodGhpcy5hdmFpbGFibGVNb2RlbHMuaW5jbHVkZXModGhpcy5wbHVnaW4uc2V0dGluZ3Mub2xsYW1hTW9kZWwpID8gJycgOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFNb2RlbClcbiAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgaWYgKHZhbHVlLnRyaW0oKSkge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm9sbGFtYU1vZGVsID0gdmFsdWUudHJpbSgpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG5cbiAgICAvLyBEYWlseSBub3RlcyBmb2xkZXJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdEYWlseSBub3RlcyBmb2xkZXInKVxuICAgICAgLnNldERlc2MoJ0ZvbGRlciBjb250YWluaW5nIHlvdXIgZGFpbHkgbm90ZXMuJylcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJzEwX2RhaWx5JylcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXIpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU5vdGVzRm9sZGVyID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIE91dHB1dCBtb2RlXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnT3V0cHV0IG1vZGUnKVxuICAgICAgLnNldERlc2MoJ1doZXJlIHRvIHB1dCB0aGUgZ2VuZXJhdGVkIHN1bW1hcnkuJylcbiAgICAgIC5hZGREcm9wZG93bihkcm9wZG93biA9PiBkcm9wZG93blxuICAgICAgICAuYWRkT3B0aW9uKCdjdXJzb3InLCAnSW5zZXJ0IGF0IGN1cnNvcicpXG4gICAgICAgIC5hZGRPcHRpb24oJ2NsaXBib2FyZCcsICdDb3B5IHRvIGNsaXBib2FyZCcpXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5vdXRwdXRNb2RlKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiAnY3Vyc29yJyB8ICdjbGlwYm9hcmQnKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mub3V0cHV0TW9kZSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG5cbiAgICAvLyBEZXRhaWwgbGV2ZWxcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdEZXRhaWwgbGV2ZWwnKVxuICAgICAgLnNldERlc2MoJ0hvdyBtdWNoIGRldGFpbCB0byBpbmNsdWRlIGluIHN1bW1hcmllcy4nKVxuICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXG4gICAgICAgIC5hZGRPcHRpb24oJ2NvbmNpc2UnLCAnQ29uY2lzZSAobWluaW1hbCwgZmFzdCknKVxuICAgICAgICAuYWRkT3B0aW9uKCdzdGFuZGFyZCcsICdTdGFuZGFyZCAoYmFsYW5jZWQpJylcbiAgICAgICAgLmFkZE9wdGlvbignZGV0YWlsZWQnLCAnRGV0YWlsZWQgKGNvbXByZWhlbnNpdmUpJylcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRldGFpbExldmVsKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiAnY29uY2lzZScgfCAnc3RhbmRhcmQnIHwgJ2RldGFpbGVkJykgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRldGFpbExldmVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIEF1dG8tc3VtbWFyaXphdGlvbiBoZWFkaW5nXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnQXV0by1zdW1tYXJpemF0aW9uJylcbiAgICAgIC5zZXRIZWFkaW5nKCk7XG5cbiAgICAvLyBBdXRvLXN1bW1hcml6ZSB0b2dnbGVcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdBdXRvLXN1bW1hcml6ZSBvbiBmaWxlIG9wZW4nKVxuICAgICAgLnNldERlc2MoJ0F1dG9tYXRpY2FsbHkgc3VtbWFyaXplIHllc3RlcmRheSB3aGVuIG9wZW5pbmcgYSBkYWlseSBub3RlLicpXG4gICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TdW1tYXJpemUpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvU3VtbWFyaXplID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIFRhcmdldCBzZWN0aW9uXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnVGFyZ2V0IHNlY3Rpb24nKVxuICAgICAgLnNldERlc2MoJ1NlY3Rpb24gaGVhZGVyIHdoZXJlIHRoZSBhdXRvLXN1bW1hcnkgd2lsbCBiZSBpbnNlcnRlZC4nKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRTZWN0aW9uKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0U2VjdGlvbiA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG5cbiAgICAvLyBXZWVrbHkgc3VtbWFyaXphdGlvbiBoZWFkaW5nXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnV2Vla2x5IHN1bW1hcml6YXRpb24nKVxuICAgICAgLnNldEhlYWRpbmcoKTtcblxuICAgIC8vIFdlZWsgc3RhcnQgZGF5XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnV2VlayBzdGFydHMgb24nKVxuICAgICAgLnNldERlc2MoJ0ZpcnN0IGRheSBvZiB0aGUgd2VlayBmb3Igd2Vla2x5IHN1bW1hcmllcy4nKVxuICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXG4gICAgICAgIC5hZGRPcHRpb24oJ21vbmRheScsICdNb25kYXknKVxuICAgICAgICAuYWRkT3B0aW9uKCdzdW5kYXknLCAnU3VuZGF5JylcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSlcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogJ21vbmRheScgfCAnc3VuZGF5JykgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG5cbiAgICAvLyBXZWVrbHkgdGFyZ2V0IHNlY3Rpb25cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdXZWVrbHkgdGFyZ2V0IHNlY3Rpb24nKVxuICAgICAgLnNldERlc2MoJ1NlY3Rpb24gaGVhZGVyIGZvciB3ZWVrbHkgc3VtbWFyeSBvdXRwdXQuJylcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2x5VGFyZ2V0U2VjdGlvbilcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtseVRhcmdldFNlY3Rpb24gPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuXG4gICAgLy8gU3RhdGlzdGljcyBoZWFkaW5nXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnU3RhdGlzdGljcycpXG4gICAgICAuc2V0SGVhZGluZygpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBzdGF0cyBpZiBtaXNzaW5nXG4gICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdGF0cyB8fCBERUZBVUxUX1NFVFRJTkdTLnN0YXRzO1xuICAgIGNvbnN0IGNhY2hlU2l6ZSA9IE9iamVjdC5rZXlzKHRoaXMucGx1Z2luLnNldHRpbmdzLnN1bW1hcnlDYWNoZSB8fCB7fSkubGVuZ3RoO1xuXG4gICAgLy8gU3RhdHMgZGlzcGxheVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1N1bW1hcnkgc3RhdGlzdGljcycpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgYFRvdGFsOiAke3N0YXRzLnRvdGFsU3VtbWFyaWVzfSBzdW1tYXJpZXNcXG5gICtcbiAgICAgICAgYERhaWx5OiAke3N0YXRzLmRhaWx5U3VtbWFyaWVzfSB8IFdlZWtseTogJHtzdGF0cy53ZWVrbHlTdW1tYXJpZXN9IHwgTW9udGhseTogJHtzdGF0cy5tb250aGx5U3VtbWFyaWVzfVxcbmAgK1xuICAgICAgICBgTGFzdCBzdW1tYXJ5OiAke3N0YXRzLmxhc3RTdW1tYXJ5RGF0ZSB8fCAnTmV2ZXInfVxcbmAgK1xuICAgICAgICBgQ2FjaGUgZW50cmllczogJHtjYWNoZVNpemV9LzMwYFxuICAgICAgKTtcblxuICAgIC8vIFJlc2V0IHN0YXRzIGJ1dHRvblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1Jlc2V0IHN0YXRpc3RpY3MnKVxuICAgICAgLnNldERlc2MoJ0NsZWFyIGFsbCBzdW1tYXJ5IHN0YXRpc3RpY3MuJylcbiAgICAgIC5hZGRCdXR0b24oYnV0dG9uID0+IGJ1dHRvblxuICAgICAgICAuc2V0QnV0dG9uVGV4dCgnUmVzZXQnKVxuICAgICAgICAuc2V0V2FybmluZygpXG4gICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdGF0cyA9IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5zdGF0cyB9O1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIHRoZSBkaXNwbGF5XG4gICAgICAgICAgbmV3IE5vdGljZSgnU3RhdGlzdGljcyByZXNldCcpO1xuICAgICAgICB9KSk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0JBQXdHO0FBOEJ4RyxJQUFNLG1CQUFnRDtBQUFBLEVBQ3BELGdCQUFnQjtBQUFBLEVBQ2hCLGFBQWE7QUFBQTtBQUFBLEVBQ2Isa0JBQWtCO0FBQUEsRUFDbEIsWUFBWTtBQUFBLEVBQ1osZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsY0FBYztBQUFBLEVBQ2QscUJBQXFCO0FBQUEsRUFDckIsYUFBYTtBQUFBLEVBQ2IsY0FBYyxDQUFDO0FBQUEsRUFDZixPQUFPO0FBQUEsSUFDTCxnQkFBZ0I7QUFBQSxJQUNoQixnQkFBZ0I7QUFBQSxJQUNoQixpQkFBaUI7QUFBQSxJQUNqQixrQkFBa0I7QUFBQSxJQUNsQixpQkFBaUI7QUFBQSxFQUNuQjtBQUNGO0FBR0EsSUFBTSxtQkFBbUI7QUFBQSxFQUN2QixTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT1QsVUFBVTtBQUFBO0FBQUEsRUFFVixVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBT1o7QUFNQSxJQUFNLG1CQUFtQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQWdGekIsSUFBTSxnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUEwRXRCLElBQU0saUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7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
