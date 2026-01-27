import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, requestUrl, TFile } from 'obsidian';

// ============================================================================
// Settings
// ============================================================================

interface YesterdaySummarizerSettings {
  ollamaEndpoint: string;
  ollamaModel: string;
  dailyNotesFolder: string;
  outputMode: 'cursor' | 'clipboard';
  autoSummarize: boolean;
  targetSection: string;
  // Weekly settings
  weekStartDay: 'monday' | 'sunday';
  weeklyTargetSection: string;
  // Quality settings
  detailLevel: 'concise' | 'standard' | 'detailed';
  // Cache for skipping unchanged content (date -> content hash)
  summaryCache: Record<string, string>;
  // Statistics
  stats: {
    totalSummaries: number;
    dailySummaries: number;
    weeklySummaries: number;
    monthlySummaries: number;
    lastSummaryDate: string | null;
  };
}

const DEFAULT_SETTINGS: YesterdaySummarizerSettings = {
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'gemma3:12b',  // Best quality/speed balance (benchmark v2: 82/100 in 60s)
  dailyNotesFolder: '10_daily',
  outputMode: 'cursor',
  autoSummarize: true,
  targetSection: "## Yesterday's Highlights",
  weekStartDay: 'monday',
  weeklyTargetSection: '## Week Summary',
  detailLevel: 'standard',
  summaryCache: {},
  stats: {
    totalSummaries: 0,
    dailySummaries: 0,
    weeklySummaries: 0,
    monthlySummaries: 0,
    lastSummaryDate: null
  }
};

// Detail level modifiers for prompts
const DETAIL_MODIFIERS = {
  concise: `
BREVITY MODE:
- Maximum 3 bullets per section
- Each bullet under 60 characters
- Skip sections with nothing notable
- No explanations, just facts`,

  standard: '', // No modifier for standard

  detailed: `
DETAILED MODE:
- Include all completed tasks (up to 10)
- Expand insights with supporting observations
- Include timestamps if mentioned
- Add context for blockers (what caused them, potential solutions)
- Include subtle mood/energy signals`
};

// ============================================================================
// Prompt Template
// ============================================================================

const SUMMARIZE_PROMPT = `You are a journal analyst. Extract meaning, don't copy text.

=== EXAMPLE ===
INPUT:
"- [x] Sent proposal to client
- [ ] Write blog post
- [ ] Fix login bug
Spent 2 hours on the proposal, way longer than expected. Still haven't started the blog post—fourth day now. Not sure what angle to take."

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
1. NEVER copy task text verbatim—always rephrase:
   - BAD: "Applied to Meta via referral from Sarah"
   - GOOD: "Submitted Meta application (referral)"
2. BLOCKERS include hidden obstacles:
   - Task repeated across days without progress = avoidance blocker
   - "not sure", "unclear", "don't know" = clarity blocker
   - "waiting on", "need X first" = dependency blocker
   - Energy crashes preventing work = energy blocker
3. INSIGHTS must synthesize patterns, not list facts.
4. Each bullet ≤60 characters.
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

const WEEKLY_PROMPT = `You are a reflective coach synthesizing a week of journal entries.

=== EXAMPLE OUTPUT ===
**Key Accomplishments**:
- Shipped [[ProjectX]] MVP
- Completed 3 job applications

**Open Threads**:
- [[BlogRedesign]] — 60% done, blocked on images
- [[TaxPrep]] — not started

**Blockers & Friction**:
- [[BlogRedesign]]: waiting on designer (3 days)
- Tax prep: avoidance pattern (mentioned 4x, 0 action)

**Energy Arc**:
- Mon-Tue high (shipped MVP), Wed crashed (meetings), Thu-Fri recovering

**Themes & Patterns**:
- TIME: 60% on [[ProjectX]], only 10% on stated priority [[JobSearch]]
- GAPS: Tax prep mentioned daily but never touched—resistance
- MOMENTUM: MVP shipped fast; blog stalled on external dependency

**Questions to Carry Forward**:
- Why avoiding tax prep? Fear of complexity?

**Trajectory**:
- Productivity: ↑ (shipped something)
- Focus: scattered (too many threads)
- Energy: depleting

**Next Week's Intention**:
Close one thread completely before starting anything new.
=== END EXAMPLE ===

CRITICAL: Follow the exact format above. Use **Section**: headers with bullet points.

**Key Accomplishments**:
- [rephrased achievement]

**Open Threads**:
- [[project]] — [current state]

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
- Productivity: [↑/→/↓]
- Focus: [scattered/concentrated]
- Energy: [building/depleting/recovering]

**Next Week's Intention**:
[Single actionable sentence]

RULES:
- Synthesize across days, don't summarize each day separately
- Surface patterns the writer might not notice
- Use [[wikilinks]] for all projects/people/tools
- No generic observations ("productive week")
- If few entries: "Only N days captured—limited data"

---
`;

const MONTHLY_PROMPT = `You are a strategic advisor synthesizing a month of journal entries. Focus on BIG PICTURE trends.

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
- This is executive-level summary—zoom out from daily details
- Look for multi-week patterns, not individual incidents
- Be honest about misalignment between intentions and actions
- Use [[wikilinks]] for projects, people, and recurring themes
- If data is sparse, say so: "Limited entries (X days captured)"
- No fluff—every sentence should contain insight

---
`;

const COMPARE_PROMPT = `Compare these two journal entries and highlight meaningful differences.

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
- Keep it brief—this is a quick comparison
- Use [[wikilinks]] for projects/people mentioned

---
`;

// ============================================================================
// LLM Backends
// ============================================================================

// Strip DeepSeek R1's <think>...</think> reasoning blocks from output
function stripThinkTags(text: string): string {
  // Remove <think>...</think> blocks (including multiline)
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// Calculate adaptive token limit based on input content length
function calculateTokenLimit(content: string, baseTokens: number = 600): number {
  const words = content.split(/\s+/).length;
  // Scale tokens: base + extra for longer content
  // ~100 words -> 600 tokens, ~500 words -> 800 tokens, ~1000+ words -> 1000 tokens
  if (words < 200) return baseTokens;
  if (words < 500) return Math.min(baseTokens + 200, 800);
  if (words < 1000) return Math.min(baseTokens + 400, 1000);
  return 1200; // Cap at 1200 for very long entries
}

// Extract existing wikilinks from content to inform the LLM
function extractWikilinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
  return [...new Set(matches.map(m => m.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/, '$1')))];
}

// Extract hashtags from content
function extractTags(content: string): string[] {
  // Match #tag but not #123 (numbers only) or inside code blocks
  const matches = content.match(/#[a-zA-Z][a-zA-Z0-9_/-]*/g) || [];
  return [...new Set(matches)];
}

// Simple hash function for content change detection
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Extract frontmatter from content (returns object and body separately)
function extractFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parser for common patterns
  const frontmatter: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value: unknown = line.slice(colonIdx + 1).trim();

      // Parse common value types
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^\d+$/.test(value as string)) value = parseInt(value as string, 10);
      else if (/^\d+\.\d+$/.test(value as string)) value = parseFloat(value as string);

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

// Build context hints from content for better LLM understanding
function buildContextHints(content: string): string {
  const { frontmatter } = extractFrontmatter(content);
  const wikilinks = extractWikilinks(content);
  const tags = extractTags(content);

  let hints = '';

  // Add frontmatter metadata if present
  const metadataKeys = ['mood', 'energy', 'productivity', 'sleep', 'exercise', 'focus'];
  const foundMeta: string[] = [];
  for (const key of metadataKeys) {
    const value = frontmatter[key];
    if (value !== undefined && value !== '' && value !== null) {
      // Safely convert value to string, handling objects properly
      let stringValue: string;
      if (typeof value === 'string') {
        stringValue = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        stringValue = String(value);
      } else {
        stringValue = JSON.stringify(value);
      }
      foundMeta.push(`${key}: ${stringValue}`);
    }
  }
  if (foundMeta.length > 0) {
    hints += `\nFRONTMATTER METADATA: ${foundMeta.join(', ')}`;
    hints += '\n(Use this metadata to inform your energy/mood observations)';
  }

  if (wikilinks.length > 0) {
    hints += `\nEXISTING LINKS in entry: ${wikilinks.slice(0, 10).map(w => `[[${w}]]`).join(', ')}`;
    hints += '\n(Preserve these links in your output when referencing these items)';
  }

  if (tags.length > 0) {
    hints += `\nTAGS used: ${tags.slice(0, 10).join(', ')}`;
  }

  return hints;
}

// Post-process LLM output to clean common issues
function postProcessOutput(text: string): string {
  let result = text;

  // Remove any remaining think tags
  result = stripThinkTags(result);

  // Remove common LLM preambles and introductory paragraphs
  result = result.replace(/^(Here'?s?|Below is|The following|I've|Let me|Based on|This week|Overall)[^*\n]*\n+/gi, '');

  // Remove "## Week of...", "### Summary of..." or similar header lines
  result = result.replace(/^#{1,4}\s+(Week of|Summary of)[^\n]*\n+/gim, '');

  // Convert markdown headers to bold format: "## Section", "#### **Section**" -> "**Section**:"
  // Handle: "#### **Key Accomplishments**" -> "**Key Accomplishments**:"
  result = result.replace(/^#{1,4}\s*\*{0,2}([^*\n#]+)\*{0,2}\s*$/gm, '**$1**:');

  // Remove horizontal rules that some models add
  result = result.replace(/^-{3,}\s*$/gm, '');

  // Clean numbered lists in Open Threads: "1. **Project**" -> "- [[Project]]"
  result = result.replace(/^\d+\.\s+\*{0,2}([^*:\n]+)\*{0,2}:\s*/gm, '- [[$1]] — ');

  // Remove trailing explanations/summaries after the structured content
  const lastSection = result.lastIndexOf('**');
  if (lastSection > 0) {
    const afterLastHeader = result.indexOf('\n\n', lastSection + 50);
    if (afterLastHeader > 0) {
      const trailing = result.slice(afterLastHeader);
      // If trailing content doesn't have headers and is explanatory, remove it
      if (!trailing.includes('**') && trailing.length > 100) {
        result = result.slice(0, afterLastHeader).trim();
      }
    }
  }

  // Normalize bullet points (some models use *, some use -)
  result = result.replace(/^\* /gm, '- ');

  // Fix double asterisks that some models add: ****Section**** -> **Section**
  result = result.replace(/\*{4,}([^*]+)\*{4,}/g, '**$1**');

  // Remove excessive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Ensure proper spacing after headers
  result = result.replace(/(\*\*[^*]+\*\*:?)\n([^-\n1-9])/g, '$1\n\n$2');

  // Clean up any remaining formatting issues
  result = result.replace(/\*\*\s*\*\*/g, ''); // Remove empty bold markers

  return result.trim();
}

// Sleep helper for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOllama(
  endpoint: string,
  model: string,
  prompt: string,
  maxTokens: number = 600,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await requestUrl({
        url: `${endpoint}/api/generate`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.5,
            top_p: 0.9,
            num_predict: maxTokens
          }
        }),
        throw: false // Don't throw on non-200, handle manually
      });

      if (response.status === 200) {
        const data = response.json;
        const rawResponse = data.response || '';
        return postProcessOutput(rawResponse);
      }

      // Handle specific error codes
      if (response.status === 404) {
        throw new Error(`Model "${model}" not found. Run: ollama pull ${model}`);
      }
      if (response.status === 503) {
        throw new Error('Ollama service unavailable. Is it running?');
      }

      lastError = new Error(`Ollama returned status ${response.status}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on model not found or service unavailable
      if (lastError.message.includes('not found') || lastError.message.includes('unavailable')) {
        throw lastError;
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries) {
      await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }

  throw new Error(`Ollama failed after ${maxRetries} attempts: ${lastError?.message}`);
}

// ============================================================================
// Main Plugin
// ============================================================================

export default class YesterdaySummarizerPlugin extends Plugin {
  settings: YesterdaySummarizerSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    // Command: Summarize Yesterday (uses Ollama)
    this.addCommand({
      id: 'summarize-yesterday',
      name: 'Summarize yesterday',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeYesterday(editor, view);
      }
    });

    // Command: Summarize Week
    this.addCommand({
      id: 'summarize-week',
      name: 'Summarize this week',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeWeek(editor, view);
      }
    });

    // Command: Summarize Month
    this.addCommand({
      id: 'summarize-month',
      name: 'Summarize this month',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeMonth(editor, view);
      }
    });

    // Command: Compare Days
    this.addCommand({
      id: 'compare-days',
      name: 'Compare yesterday vs today',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.compareDays(editor, view);
      }
    });

    // Command: Summarize Today (current note)
    this.addCommand({
      id: 'summarize-today',
      name: 'Summarize today (current note)',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeToday(editor, view);
      }
    });

    // Command: Force Re-summarize (bypass cache)
    this.addCommand({
      id: 'force-resummarize',
      name: 'Force re-summarize yesterday (bypass cache)',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.forceSummarizeYesterday(editor, view);
      }
    });

    // Command: Clear Summary Cache
    this.addCommand({
      id: 'clear-cache',
      name: 'Clear summary cache',
      callback: async () => {
        const count = Object.keys(this.settings.summaryCache).length;
        this.settings.summaryCache = {};
        await this.saveSettings();
        new Notice(`Cleared ${count} cached summaries`);
      }
    });

    // Command: Summarize Last 3 Days
    this.addCommand({
      id: 'summarize-last-3-days',
      name: 'Summarize last 3 days',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeDateRange(editor, view, 3);
      }
    });

    // Command: Summarize Last 5 Days
    this.addCommand({
      id: 'summarize-last-5-days',
      name: 'Summarize last 5 days',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeDateRange(editor, view, 5);
      }
    });

    // Command: Summarize Last 14 Days (2 weeks)
    this.addCommand({
      id: 'summarize-last-14-days',
      name: 'Summarize last 14 days (2 weeks)',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeDateRange(editor, view, 14);
      }
    });

    // Command: Export summaries to file
    this.addCommand({
      id: 'export-summaries',
      name: 'Export all summaries to file',
      callback: async () => {
        await this.exportSummaries();
      }
    });

    // Command: Batch summarize missing notes
    this.addCommand({
      id: 'batch-summarize',
      name: 'Batch summarize (catch up on missing)',
      callback: async () => {
        await this.batchSummarize();
      }
    });

    // Command: Test Ollama connection
    this.addCommand({
      id: 'test-connection',
      name: 'Test ollama connection',
      callback: async () => {
        await this.testConnection();
      }
    });

    // Add settings tab
    this.addSettingTab(new YesterdaySummarizerSettingTab(this.app, this));

    // Auto-summarize when daily note is opened
    if (this.settings.autoSummarize) {
      this.registerEvent(
        this.app.workspace.on('file-open', (file: TFile | null) => {
          if (file) {
            this.handleFileOpen(file).catch(() => { /* handled */ });
          }
        })
      );
    }
  }

  onunload() {
    // Plugin unloaded
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Increment summary statistics
  async incrementStats(type: 'daily' | 'weekly' | 'monthly') {
    // Initialize stats if missing (for upgrades from older versions)
    if (!this.settings.stats) {
      this.settings.stats = { ...DEFAULT_SETTINGS.stats };
    }
    this.settings.stats.totalSummaries++;
    if (type === 'daily') this.settings.stats.dailySummaries++;
    else if (type === 'weekly') this.settings.stats.weeklySummaries++;
    else if (type === 'monthly') this.settings.stats.monthlySummaries++;
    this.settings.stats.lastSummaryDate = new Date().toISOString().split('T')[0];
    await this.saveSettings();
  }

  // Extract date from filename (e.g., "2026-01-15.md" -> "2026-01-15")
  extractDateFromFilename(filename: string): string | null {
    // Match YYYY-MM-DD pattern
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  // Calculate the day before a given date
  getDayBefore(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  // Calculate the start of the week (Monday or Sunday) containing a given date
  getWeekStart(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    let daysToSubtract: number;
    if (this.settings.weekStartDay === 'monday') {
      // Monday is day 1, so subtract (dayOfWeek - 1), handling Sunday (0) as 7
      daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    } else {
      // Sunday is day 0
      daysToSubtract = dayOfWeek;
    }

    date.setDate(date.getDate() - daysToSubtract);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  // Get array of 7 date strings for the week starting from startDate
  getWeekDates(startDate: string): string[] {
    const [year, month, day] = startDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      date.setDate(date.getDate() + 1);
    }

    return dates;
  }

  // Get all dates in a month
  getMonthDates(year: number, month: number): string[] {
    const dates: string[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const m = String(month).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      dates.push(`${year}-${m}-${d}`);
    }

    return dates;
  }

  // Get month name
  getMonthName(month: number): string {
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return names[month - 1];
  }

  // Calculate longest streak of consecutive days with entries
  calculateStreak(dates: string[], found: Map<string, string>): number {
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
  stripSummarySections(content: string): string {
    // Remove "## Yesterday's Highlights" and everything after until next h2 or end
    // Remove "## Summary of YYYY-MM-DD" sections similarly
    const lines = content.split('\n');
    const result: string[] = [];
    let inSummarySection = false;

    for (const line of lines) {
      // Check if entering a summary section
      if (line.match(/^## (Yesterday's Highlights|Summary of \d{4}-\d{2}-\d{2})/)) {
        inSummarySection = true;
        continue;
      }
      // Check if exiting summary section (hit another h2)
      if (inSummarySection && line.match(/^## /)) {
        inSummarySection = false;
      }
      // Only include lines not in summary section
      if (!inSummarySection) {
        result.push(line);
      }
    }

    return result.join('\n').trim();
  }

  // Read a specific date's daily note - returns { date, content } or null
  async readDailyNote(targetDate: string): Promise<{ date: string; content: string } | null> {
    // Try both filename formats:
    // 1. YYYY-MM-DD – Journal.md (old format)
    // 2. YYYY-MM-DD.md (new format)
    const formats = [
      `${this.settings.dailyNotesFolder}/${targetDate} – Journal.md`,
      `${this.settings.dailyNotesFolder}/${targetDate}.md`
    ];

    let notePath: string | null = null;
    for (const path of formats) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file) {
        notePath = path;
        break;
      }
    }

    if (!notePath) {
      new Notice(`Note not found for ${targetDate}`);
      return null;
    }

    try {
      const content = await this.app.vault.adapter.read(notePath);
      // Strip frontmatter (everything between first two ---)
      const frontmatterEnd = content.indexOf('---', 3);
      let bodyContent: string;
      if (frontmatterEnd !== -1) {
        bodyContent = content.substring(frontmatterEnd + 3).trim();
      } else {
        bodyContent = content;
      }

      // Strip any existing summary sections to prevent stale content propagation
      bodyContent = this.stripSummarySections(bodyContent);

      return { date: targetDate, content: bodyContent };
    } catch (error) {
      new Notice(`Error reading note: ${error}`);
      return null;
    }
  }

  // Read a daily note silently (no notice on missing) - for week aggregation
  async readDailyNoteSilent(targetDate: string): Promise<{ date: string; content: string } | null> {
    const formats = [
      `${this.settings.dailyNotesFolder}/${targetDate} – Journal.md`,
      `${this.settings.dailyNotesFolder}/${targetDate}.md`
    ];

    let notePath: string | null = null;
    for (const path of formats) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file) {
        notePath = path;
        break;
      }
    }

    if (!notePath) {
      return null; // Silently return null for missing days
    }

    try {
      const content = await this.app.vault.adapter.read(notePath);
      const frontmatterEnd = content.indexOf('---', 3);
      let bodyContent: string;
      if (frontmatterEnd !== -1) {
        bodyContent = content.substring(frontmatterEnd + 3).trim();
      } else {
        bodyContent = content;
      }
      bodyContent = this.stripSummarySections(bodyContent);
      return { date: targetDate, content: bodyContent };
    } catch {
      return null;
    }
  }

  // Read all daily notes for a week using Promise.allSettled for parallel reading
  async readWeekNotes(dates: string[]): Promise<{ found: Map<string, string>; missing: string[] }> {
    const results = await Promise.allSettled(
      dates.map(date => this.readDailyNoteSilent(date))
    );

    const found = new Map<string, string>();
    const missing: string[] = [];

    results.forEach((result, index) => {
      const date = dates[index];
      if (result.status === 'fulfilled' && result.value) {
        found.set(date, result.value.content);
      } else {
        missing.push(date);
      }
    });

    return { found, missing };
  }

  // Weekly summarization function
  async summarizeWeek(editor: Editor, view: MarkdownView) {
    const currentFile = view.file;
    if (!currentFile) {
      new Notice('No file is currently open');
      return;
    }

    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);

    if (!currentDate) {
      new Notice(`Cannot extract date from filename: ${currentFilename}\nExpected format: YYYY-MM-DD`);
      return;
    }

    // Calculate week range
    const weekStart = this.getWeekStart(currentDate);
    const weekDates = this.getWeekDates(weekStart);
    const weekEnd = weekDates[6];

    const loadingNotice = new Notice(`Reading week ${weekStart} to ${weekEnd}...`, 0);

    try {
      // Read all daily notes for the week
      const { found, missing } = await this.readWeekNotes(weekDates);

      if (found.size === 0) {
        loadingNotice.hide();
        new Notice(`No daily notes found for week ${weekStart} to ${weekEnd}`);
        return;
      }

      loadingNotice.setMessage(`Summarizing ${found.size} days (${missing.length} missing)...`);

      // Calculate consistency metrics
      const consistencyPct = Math.round((found.size / 7) * 100);
      const streak = this.calculateStreak(weekDates, found);

      // Aggregate content with date markers
      let aggregatedContent = '';
      for (const [date, content] of found) {
        aggregatedContent += `\n--- ${date} ---\n${content}\n`;
      }

      // Build context hints from all content
      const allContent = Array.from(found.values()).join('\n');
      const contextHints = buildContextHints(allContent);
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];

      // Build prompt with consistency info
      const dateRange = `${weekStart} to ${weekEnd}`;
      const consistencyInfo = `\nCONSISTENCY: ${found.size}/7 days captured (${consistencyPct}%), longest streak: ${streak} days`;
      const fullPrompt = `Summarizing week of ${dateRange}:${consistencyInfo}${contextHints}\n\n${WEEKLY_PROMPT}${detailMod}\n\n${aggregatedContent}`;

      // Call Ollama with higher token limit for weekly synthesis
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        1500  // More tokens for week-long synthesis
      );

      loadingNotice.hide();

      // Output with date range
      if (this.settings.outputMode === 'cursor') {
        const formatted = `\n## Week Summary (${weekStart} to ${weekEnd})\n\n${summary}\n`;
        editor.replaceSelection(formatted);
        new Notice(`Week summary inserted! (${found.size}/${7} days) - Try "Summarize month" for bigger picture`);
      } else {
        await navigator.clipboard.writeText(summary);
        new Notice(`Week summary copied! (${found.size} days, ${missing.length} missing)`);
      }

      await this.incrementStats('weekly');

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Weekly error:', error);
    }
  }

  // Monthly summarization function
  async summarizeMonth(editor: Editor, view: MarkdownView) {
    const currentFile = view.file;
    if (!currentFile) {
      new Notice('No file is currently open');
      return;
    }

    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);

    if (!currentDate) {
      new Notice(`Cannot extract date from filename: ${currentFilename}\nExpected format: YYYY-MM-DD`);
      return;
    }

    // Extract year and month from current date
    const [year, month] = currentDate.split('-').map(Number);
    const monthName = this.getMonthName(month);
    const monthDates = this.getMonthDates(year, month);

    const loadingNotice = new Notice(`Reading ${monthName} ${year}...`, 0);

    try {
      // Read all daily notes for the month
      const { found, missing } = await this.readWeekNotes(monthDates); // Reuse week reader

      if (found.size === 0) {
        loadingNotice.hide();
        new Notice(`No daily notes found for ${monthName} ${year}`);
        return;
      }

      loadingNotice.setMessage(`Summarizing ${found.size} days (${missing.length} missing)...`);

      // Aggregate content with date markers
      let aggregatedContent = '';
      for (const [date, content] of found) {
        aggregatedContent += `\n--- ${date} ---\n${content}\n`;
      }

      // Build prompt
      const fullPrompt = `Summarizing month of ${monthName} ${year}:\n\n${MONTHLY_PROMPT}${aggregatedContent}`;

      // Call Ollama with high token limit for monthly synthesis
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        2000  // More tokens for month-long synthesis
      );

      loadingNotice.hide();

      // Output with month name
      if (this.settings.outputMode === 'cursor') {
        const formatted = `\n## Monthly Summary: ${monthName} ${year}\n\n${summary}\n`;
        editor.replaceSelection(formatted);
        new Notice(`Monthly summary inserted! (${found.size} days captured)`);
      } else {
        await navigator.clipboard.writeText(summary);
        new Notice(`Monthly summary copied! (${found.size} days captured)`);
      }

      await this.incrementStats('monthly');

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Monthly error:', error);
    }
  }

  // Custom date range summarization (last N days)
  async summarizeDateRange(editor: Editor, view: MarkdownView, days: number) {
    const currentFile = view.file;
    if (!currentFile) {
      new Notice('No file is currently open');
      return;
    }

    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);

    if (!currentDate) {
      new Notice(`Cannot extract date from filename: ${currentFilename}\nExpected format: YYYY-MM-DD`);
      return;
    }

    // Generate date range going back from yesterday (not including today)
    const dates: string[] = [];
    let datePtr = this.getDayBefore(currentDate);
    for (let i = 0; i < days; i++) {
      dates.unshift(datePtr); // Add to front to maintain chronological order
      datePtr = this.getDayBefore(datePtr);
    }

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const loadingNotice = new Notice(`Reading ${days} days (${startDate} to ${endDate})...`, 0);

    try {
      const { found } = await this.readWeekNotes(dates);

      if (found.size === 0) {
        loadingNotice.hide();
        new Notice(`No daily notes found for the last ${days} days`);
        return;
      }

      loadingNotice.setMessage(`Summarizing ${found.size}/${days} days...`);

      // Calculate consistency
      const consistencyPct = Math.round((found.size / days) * 100);
      const streak = this.calculateStreak(dates, found);

      // Aggregate content
      let aggregatedContent = '';
      for (const [date, content] of found) {
        aggregatedContent += `\n--- ${date} ---\n${content}\n`;
      }

      // Build context hints
      const allContent = Array.from(found.values()).join('\n');
      const contextHints = buildContextHints(allContent);
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];

      // Use weekly prompt for multi-day ranges
      const dateRange = `${startDate} to ${endDate} (${days} days)`;
      const consistencyInfo = `\nCONSISTENCY: ${found.size}/${days} days captured (${consistencyPct}%), longest streak: ${streak} days`;
      const fullPrompt = `Summarizing ${dateRange}:${consistencyInfo}${contextHints}\n\n${WEEKLY_PROMPT}${detailMod}\n\n${aggregatedContent}`;

      // Scale token limit based on number of days
      const tokenLimit = Math.min(800 + (days * 50), 2000);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );

      loadingNotice.hide();

      if (this.settings.outputMode === 'cursor') {
        const formatted = `\n## Summary: ${startDate} to ${endDate} (${days} days)\n\n${summary}\n`;
        editor.replaceSelection(formatted);
        new Notice(`${days}-day summary inserted! (${found.size}/${days} days captured)`);
      } else {
        await navigator.clipboard.writeText(summary);
        new Notice(`${days}-day summary copied! (${found.size}/${days} days captured)`);
      }

      await this.incrementStats('weekly'); // Count as weekly for multi-day

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Date range error:', error);
    }
  }

  // Compare today vs yesterday
  async compareDays(editor: Editor, view: MarkdownView) {
    const currentFile = view.file;
    if (!currentFile) {
      new Notice('No file is currently open');
      return;
    }

    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);

    if (!currentDate) {
      new Notice(`Cannot extract date from filename: ${currentFilename}\nExpected format: YYYY-MM-DD`);
      return;
    }

    const yesterdayDate = this.getDayBefore(currentDate);
    const loadingNotice = new Notice(`Comparing ${yesterdayDate} vs ${currentDate}...`, 0);

    try {
      // Read both days
      const [day1Result, day2Result] = await Promise.all([
        this.readDailyNoteSilent(yesterdayDate),
        this.readDailyNoteSilent(currentDate)
      ]);

      if (!day1Result) {
        loadingNotice.hide();
        new Notice(`Note not found for ${yesterdayDate}`);
        return;
      }
      if (!day2Result) {
        loadingNotice.hide();
        new Notice(`Note not found for ${currentDate}`);
        return;
      }

      loadingNotice.setMessage('Analyzing differences...');

      // Build comparison prompt
      const comparisonContent = `
--- Day 1: ${yesterdayDate} ---
${day1Result.content}

--- Day 2: ${currentDate} ---
${day2Result.content}
`;

      const fullPrompt = `Comparing ${yesterdayDate} vs ${currentDate}:\n\n${COMPARE_PROMPT}${comparisonContent}`;

      const comparison = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        800
      );

      loadingNotice.hide();

      if (this.settings.outputMode === 'cursor') {
        const formatted = `\n## Comparison: ${yesterdayDate} → ${currentDate}\n\n${comparison}\n`;
        editor.replaceSelection(formatted);
        new Notice('Day comparison inserted!');
      } else {
        await navigator.clipboard.writeText(comparison);
        new Notice('Day comparison copied to clipboard!');
      }

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Compare error:', error);
    }
  }

  // Main summarization function
  async summarizeYesterday(editor: Editor, view: MarkdownView) {
    // Step 1: Get current file and extract its date
    const currentFile = view.file;
    if (!currentFile) {
      new Notice('No file is currently open');
      return;
    }

    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);

    if (!currentDate) {
      new Notice(`Cannot extract date from filename: ${currentFilename}\nExpected format: YYYY-MM-DD`);
      return;
    }

    // Step 2: Calculate "yesterday" relative to current file's date
    const yesterdayDate = this.getDayBefore(currentDate);

    const loadingNotice = new Notice(`Reading ${yesterdayDate}...`, 0);

    try {
      // Step 3: Read yesterday's note
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        loadingNotice.hide();
        return;
      }

      const { date, content } = result;
      loadingNotice.setMessage(`Summarizing ${date} via ollama...`);

      // Step 4: Build prompt with date context, detail modifier, and context hints
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const contextHints = buildContextHints(content);
      const fullPrompt = `Summarizing daily note from ${date}:${contextHints}\n\n${SUMMARIZE_PROMPT}${detailMod}\n\n---\n${content}`;

      // Step 5: Call Ollama with adaptive token limit
      const tokenLimit = calculateTokenLimit(content);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );

      loadingNotice.hide();

      // Step 6: Output with date reference
      if (this.settings.outputMode === 'cursor') {
        const formatted = `\n## Summary of ${date}\n\n${summary}\n`;
        editor.replaceSelection(formatted);
        new Notice(`Summary of ${date} inserted! (Cmd/Ctrl+P > "Summarize week" for more)`);
      } else {
        await navigator.clipboard.writeText(summary);
        new Notice(`Summary of ${date} copied to clipboard!`);
      }

      await this.incrementStats('daily');

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Error:', error);
    }
  }

  // Summarize today's note (current file)
  async summarizeToday(editor: Editor, view: MarkdownView) {
    const currentFile = view.file;
    if (!currentFile) {
      new Notice('No file is currently open');
      return;
    }

    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);

    if (!currentDate) {
      new Notice(`Cannot extract date from filename: ${currentFilename}\nExpected format: YYYY-MM-DD`);
      return;
    }

    const loadingNotice = new Notice(`Summarizing ${currentDate}...`, 0);

    try {
      // Read current file content directly
      const content = await this.app.vault.read(currentFile);
      const { body } = extractFrontmatter(content);
      const cleanContent = this.stripSummarySections(body);

      if (!cleanContent.trim()) {
        loadingNotice.hide();
        new Notice('Note is empty or contains only summary sections');
        return;
      }

      loadingNotice.setMessage(`Summarizing via ollama...`);

      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const contextHints = buildContextHints(cleanContent);
      const fullPrompt = `Summarizing today's note (${currentDate}) - note may be in-progress:${contextHints}\n\n${SUMMARIZE_PROMPT}${detailMod}\n\n---\n${cleanContent}`;

      const tokenLimit = calculateTokenLimit(cleanContent);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );

      loadingNotice.hide();

      if (this.settings.outputMode === 'cursor') {
        const formatted = `\n## Today's Summary (${currentDate})\n\n${summary}\n`;
        editor.replaceSelection(formatted);
        new Notice(`Today's summary inserted!`);
      } else {
        await navigator.clipboard.writeText(summary);
        new Notice(`Today's summary copied!`);
      }

      await this.incrementStats('daily');

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Today error:', error);
    }
  }

  // Force re-summarize yesterday, bypassing cache
  async forceSummarizeYesterday(editor: Editor, view: MarkdownView) {
    const currentFile = view.file;
    if (!currentFile) {
      new Notice('No file is currently open');
      return;
    }

    const currentFilename = currentFile.basename;
    const currentDate = this.extractDateFromFilename(currentFilename);

    if (!currentDate) {
      new Notice(`Cannot extract date from filename: ${currentFilename}\nExpected format: YYYY-MM-DD`);
      return;
    }

    const yesterdayDate = this.getDayBefore(currentDate);

    // Clear cache entry for this date
    if (this.settings.summaryCache[yesterdayDate]) {
      delete this.settings.summaryCache[yesterdayDate];
      await this.saveSettings();
    }

    new Notice(`Cache cleared for ${yesterdayDate}, re-summarizing...`);

    // Now run regular summarization
    await this.summarizeYesterday(editor, view);
  }

  // Handle file open event for auto-summarization
  async handleFileOpen(file: TFile) {
    // Check if it's in the daily notes folder
    if (!file.path.startsWith(this.settings.dailyNotesFolder)) {
      return;
    }

    // Check if filename matches date pattern
    const dateMatch = this.extractDateFromFilename(file.basename);
    if (!dateMatch) {
      return;
    }

    // Read the file content
    const content = await this.app.vault.read(file);

    // Check if target section exists
    const targetSection = this.settings.targetSection;
    const sectionIndex = content.indexOf(targetSection);
    if (sectionIndex === -1) {
      return;
    }

    // Check if section is empty (next line after section header should be empty or another header)
    const afterSection = content.substring(sectionIndex + targetSection.length);
    const nextNewline = afterSection.indexOf('\n');
    if (nextNewline === -1) {
      // Section is at end of file with no newline - it's empty
    } else {
      const contentAfterHeader = afterSection.substring(nextNewline + 1);
      // Check if there's already content (not just whitespace or next section)
      const nextSectionMatch = contentAfterHeader.match(/^(\s*)(##|\n##|$)/);
      if (!nextSectionMatch) {
        // There's content after the header that isn't another section
        const firstNonWhitespace = contentAfterHeader.trim();
        if (firstNonWhitespace && !firstNonWhitespace.startsWith('##')) {
          return;
        }
      }
    }

    // Get yesterday's date based on this file
    const yesterdayDate = this.getDayBefore(dateMatch);

    try {
      // Read yesterday's note first to check if content has changed
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        return;
      }

      const { date, content: yesterdayContent } = result;

      // Check content hash - skip if unchanged since last summarization
      const contentHash = simpleHash(yesterdayContent + this.settings.detailLevel);
      const cachedHash = this.settings.summaryCache[date];

      if (cachedHash === contentHash) {
        // Content unchanged, skip summarization silently
                return;
      }

      const loadingNotice = new Notice(`Auto-summarizing ${yesterdayDate}...`, 0);
      loadingNotice.setMessage(`Summarizing ${date} via ollama...`);

      // Build prompt and call Ollama with adaptive token limit
      const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
      const contextHints = buildContextHints(yesterdayContent);
      const fullPrompt = `Summarizing daily note from ${date}:${contextHints}\n\n${SUMMARIZE_PROMPT}${detailMod}\n\n---\n${yesterdayContent}`;
      const tokenLimit = calculateTokenLimit(yesterdayContent);
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt,
        tokenLimit
      );

      loadingNotice.hide();

      // Insert summary after the target section header
      await this.insertAtSection(file, targetSection, summary);

      // Update cache with new content hash
      this.settings.summaryCache[date] = contentHash;
      // Clean old cache entries (keep last 30 days)
      this.cleanSummaryCache();
      await this.saveSettings();

      // Track stats (without extra save since incrementStats saves)
      await this.incrementStats('daily');

      new Notice(`Auto-summarized ${date}! (Cmd/Ctrl+P > "Summarize" for week/month)`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Auto-summarize error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Auto-summarize error:', error);
    }
  }

  // Clean old cache entries to prevent unbounded growth
  cleanSummaryCache() {
    const entries = Object.entries(this.settings.summaryCache);
    if (entries.length <= 30) return;

    // Sort by date (newest first) and keep only last 30
    entries.sort((a, b) => b[0].localeCompare(a[0]));
    this.settings.summaryCache = Object.fromEntries(entries.slice(0, 30));
  }

  // Test Ollama connection and model availability
  async testConnection() {
    const loadingNotice = new Notice('Testing ollama connection...', 0);

    try {
      // Test endpoint reachability
      const tagsResponse = await requestUrl({
        url: `${this.settings.ollamaEndpoint}/api/tags`,
        method: 'GET',
        throw: false
      });

      if (tagsResponse.status !== 200) {
        loadingNotice.hide();
        new Notice(`Ollama not reachable at ${this.settings.ollamaEndpoint}\nStatus: ${tagsResponse.status}`, 10000);
        return;
      }

      const models = (tagsResponse.json.models || []).map((m: { name: string }) => m.name);

      loadingNotice.setMessage('Testing model response...');

      // Quick generation test
      const testStart = Date.now();
      const testResponse = await requestUrl({
        url: `${this.settings.ollamaEndpoint}/api/generate`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        new Notice(
          `✓ Connection OK\n` +
          `✓ Model: ${this.settings.ollamaModel}\n` +
          `✓ Response time: ${testDuration}ms\n` +
          `✓ Available models: ${models.length}`,
          5000
        );
      } else if (testResponse.status === 404) {
        new Notice(
          `✓ Ollama connected\n` +
          `✗ Model not found: ${this.settings.ollamaModel}\n` +
          `Available: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}`,
          10000
        );
      } else {
        new Notice(`Ollama error: status ${testResponse.status}`, 10000);
      }

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Connection test failed: ${errorMsg}`, 10000);
    }
  }

  // Batch summarize notes that are missing summaries
  async batchSummarize() {
    const loadingNotice = new Notice('Scanning for notes without summaries...', 0);

    try {
      // Get all files in daily notes folder
      const folder = this.app.vault.getAbstractFileByPath(this.settings.dailyNotesFolder);
      if (!folder || !('children' in folder)) {
        loadingNotice.hide();
        new Notice(`Daily notes folder not found: ${this.settings.dailyNotesFolder}`);
        return;
      }

      const files = (folder as { children: TFile[] }).children
        .filter((f): f is TFile => f instanceof TFile && f.extension === 'md')
        .sort((a, b) => b.basename.localeCompare(a.basename)); // Newest first

      // Find notes without summaries (last 30 days)
      const notesNeedingSummary: TFile[] = [];
      const targetSection = this.settings.targetSection;

      for (const file of files.slice(0, 30)) { // Limit to last 30 to prevent runaway
        const dateMatch = this.extractDateFromFilename(file.basename);
        if (!dateMatch) continue;

        const content = await this.app.vault.read(file);
        const sectionIndex = content.indexOf(targetSection);

        if (sectionIndex === -1) continue; // No target section

        // Check if section has content
        const afterSection = content.substring(sectionIndex + targetSection.length);
        const nextNewline = afterSection.indexOf('\n');
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
        new Notice('All recent notes have summaries!');
        return;
      }

      loadingNotice.setMessage(`Found ${notesNeedingSummary.length} notes without summaries. Starting batch...`);

      let processed = 0;
      let errors = 0;

      for (const file of notesNeedingSummary) {
        const dateMatch = this.extractDateFromFilename(file.basename);
        if (!dateMatch) continue;

        const yesterdayDate = this.getDayBefore(dateMatch);
        loadingNotice.setMessage(`[${processed + 1}/${notesNeedingSummary.length}] Summarizing ${yesterdayDate}...`);

        try {
          // Read yesterday's note
          const result = await this.readDailyNote(yesterdayDate);
          if (!result) {
            errors++;
            continue;
          }

          const { date, content: yesterdayContent } = result;

          // Build prompt and summarize
          const detailMod = DETAIL_MODIFIERS[this.settings.detailLevel];
          const contextHints = buildContextHints(yesterdayContent);
          const fullPrompt = `Summarizing daily note from ${date}:${contextHints}\n\n${SUMMARIZE_PROMPT}${detailMod}\n\n---\n${yesterdayContent}`;
          const tokenLimit = calculateTokenLimit(yesterdayContent);

          const summary = await callOllama(
            this.settings.ollamaEndpoint,
            this.settings.ollamaModel,
            fullPrompt,
            tokenLimit
          );

          // Insert into the file
          await this.insertAtSection(file, targetSection, summary);

          // Update cache
          const contentHash = simpleHash(yesterdayContent + this.settings.detailLevel);
          this.settings.summaryCache[date] = contentHash;

          await this.incrementStats('daily');
          processed++;

        } catch (error) {
          console.error(`[Batch] Error processing ${file.basename}:`, error);
          errors++;
        }
      }

      // Save cache after batch
      this.cleanSummaryCache();
      await this.saveSettings();

      loadingNotice.hide();
      new Notice(`Batch complete: ${processed} summarized, ${errors} errors`);

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Batch error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Batch error:', error);
    }
  }

  // Export all summaries to a single file
  async exportSummaries() {
    const loadingNotice = new Notice('Scanning daily notes for summaries...', 0);

    try {
      // Get all files in daily notes folder
      const folder = this.app.vault.getAbstractFileByPath(this.settings.dailyNotesFolder);
      if (!folder || !('children' in folder)) {
        loadingNotice.hide();
        new Notice(`Daily notes folder not found: ${this.settings.dailyNotesFolder}`);
        return;
      }

      const files = (folder as { children: TFile[] }).children
        .filter((f): f is TFile => f instanceof TFile && f.extension === 'md')
        .sort((a, b) => b.basename.localeCompare(a.basename)); // Newest first

      loadingNotice.setMessage(`Scanning ${files.length} daily notes...`);

      const summaries: Array<{ date: string; summary: string }> = [];

      for (const file of files) {
        const dateMatch = this.extractDateFromFilename(file.basename);
        if (!dateMatch) continue;

        const content = await this.app.vault.read(file);

        // Extract summary sections
        const summaryPatterns = [
          /## Summary of \d{4}-\d{2}-\d{2}\n\n([\s\S]*?)(?=\n## |\n---|$)/g,
          /## Yesterday's Highlights\n\n([\s\S]*?)(?=\n## |\n---|$)/g,
          /## Week Summary[^\n]*\n\n([\s\S]*?)(?=\n## |\n---|$)/g,
          /## Monthly Summary[^\n]*\n\n([\s\S]*?)(?=\n## |\n---|$)/g,
          /## Today's Summary[^\n]*\n\n([\s\S]*?)(?=\n## |\n---|$)/g
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
        new Notice('No summaries found in daily notes');
        return;
      }

      // Sort by date (newest first) and deduplicate
      const seenDates = new Set<string>();
      const uniqueSummaries = summaries
        .sort((a, b) => b.date.localeCompare(a.date))
        .filter(s => {
          if (seenDates.has(s.date)) return false;
          seenDates.add(s.date);
          return true;
        });

      // Build export content
      let exportContent = `# Journal Summaries Export\n\n`;
      exportContent += `*Exported ${uniqueSummaries.length} summaries on ${new Date().toISOString().split('T')[0]}*\n\n`;
      exportContent += `---\n\n`;

      for (const { date, summary } of uniqueSummaries) {
        exportContent += `## ${date}\n\n${summary}\n\n---\n\n`;
      }

      // Write to file
      const exportPath = `${this.settings.dailyNotesFolder}/summaries-export.md`;
      const existingFile = this.app.vault.getAbstractFileByPath(exportPath);

      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, exportContent);
      } else {
        await this.app.vault.create(exportPath, exportContent);
      }

      loadingNotice.hide();
      new Notice(`Exported ${uniqueSummaries.length} summaries to ${exportPath}`);

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Export error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Export error:', error);
    }
  }

  // Insert content after a section header
  async insertAtSection(file: TFile, sectionHeader: string, content: string) {
    const fileContent = await this.app.vault.read(file);
    const sectionIndex = fileContent.indexOf(sectionHeader);

    if (sectionIndex === -1) {
      throw new Error(`Section "${sectionHeader}" not found`);
    }

    // Find the end of the section header line
    const headerEnd = fileContent.indexOf('\n', sectionIndex);
    if (headerEnd === -1) {
      // Section header is at end of file
      const newContent = fileContent + '\n\n' + content + '\n';
      await this.app.vault.modify(file, newContent);
    } else {
      // Insert after header
      const before = fileContent.substring(0, headerEnd + 1);
      const after = fileContent.substring(headerEnd + 1);
      const newContent = before + '\n' + content + '\n' + after;
      await this.app.vault.modify(file, newContent);
    }
  }
}

// ============================================================================
// Settings Tab
// ============================================================================

// Fetch available models from Ollama
async function fetchAvailableModels(endpoint: string): Promise<string[]> {
  try {
    const response = await requestUrl({
      url: `${endpoint}/api/tags`,
      method: 'GET',
      throw: false
    });

    if (response.status === 200) {
      const data = response.json;
      const models = (data.models || [])
        .map((m: { name: string }) => m.name)
        .sort((a: string, b: string) => a.localeCompare(b));
      return models;
    }
    return [];
  } catch {
    return [];
  }
}

class YesterdaySummarizerSettingTab extends PluginSettingTab {
  plugin: YesterdaySummarizerPlugin;
  availableModels: string[] = [];

  constructor(app: App, plugin: YesterdaySummarizerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Fetch available models in background
    void fetchAvailableModels(this.plugin.settings.ollamaEndpoint).then(models => { this.availableModels = models; }).catch(() => { /* ignore */ });

    // Ollama endpoint
    new Setting(containerEl)
      .setName('Ollama endpoint')
      .setDesc('Server address.')
      .addText(text => text
        .setValue(this.plugin.settings.ollamaEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.ollamaEndpoint = value;
          await this.plugin.saveSettings();
          // Refresh models when endpoint changes
          this.availableModels = await fetchAvailableModels(value);
          this.display();
        }));

    // Ollama model
    const modelSetting = new Setting(containerEl)
      .setName('Ollama model')
      .setDesc(this.availableModels.length > 0
        ? `${this.availableModels.length} models detected. Recommended: gemma3:12b (best balance)`
        : 'Could not detect models. Enter manually or check if Ollama is running.');

    if (this.availableModels.length > 0) {
      // Dynamic dropdown from detected models
      modelSetting.addDropdown(dropdown => {
        // Add recommended models first if available
        // Benchmark v2 rankings: deepseek-r1:latest (91), gemma3:12b (82), qwen2.5-coder:7b (58)
        const recommended = ['gemma3:12b', 'deepseek-r1:latest', 'deepseek-r1:8b', 'qwen2.5-coder:7b'];
        const availableRecommended = recommended.filter(m => this.availableModels.includes(m));
        const otherModels = this.availableModels.filter(m => !recommended.includes(m));

        availableRecommended.forEach(model => {
          const label = model === 'gemma3:12b' ? `${model} (Recommended - best balance)`
            : model === 'deepseek-r1:latest' ? `${model} (Best quality)`
            : model === 'qwen2.5-coder:7b' ? `${model} (Fastest)`
            : model;
          dropdown.addOption(model, label);
        });

        if (availableRecommended.length > 0 && otherModels.length > 0) {
          dropdown.addOption('---', '──────────');
        }

        otherModels.forEach(model => {
          dropdown.addOption(model, model);
        });

        // Set current value, defaulting to first option if current not available
        const currentModel = this.plugin.settings.ollamaModel;
        if (this.availableModels.includes(currentModel)) {
          dropdown.setValue(currentModel);
        } else if (this.availableModels.length > 0) {
          dropdown.setValue(this.availableModels[0]);
        }

        dropdown.onChange(async (value) => {
          if (value !== '---') {
            this.plugin.settings.ollamaModel = value;
            await this.plugin.saveSettings();
          }
        });

        return dropdown;
      });
    }

    // Always allow custom model entry
    modelSetting.addText(text => text
      .setPlaceholder('Or enter custom model...')
      .setValue(this.availableModels.includes(this.plugin.settings.ollamaModel) ? '' : this.plugin.settings.ollamaModel)
      .onChange(async (value) => {
        if (value.trim()) {
          this.plugin.settings.ollamaModel = value.trim();
          await this.plugin.saveSettings();
        }
      }));

    // Daily notes folder
    new Setting(containerEl)
      .setName('Daily notes folder')
      .setDesc('Folder containing your daily notes.')
      .addText(text => text
        .setPlaceholder('10_daily')
        .setValue(this.plugin.settings.dailyNotesFolder)
        .onChange(async (value) => {
          this.plugin.settings.dailyNotesFolder = value;
          await this.plugin.saveSettings();
        }));

    // Output mode
    new Setting(containerEl)
      .setName('Output mode')
      .setDesc('Where to put the generated summary.')
      .addDropdown(dropdown => dropdown
        .addOption('cursor', 'Insert at cursor')
        .addOption('clipboard', 'Copy to clipboard')
        .setValue(this.plugin.settings.outputMode)
        .onChange(async (value: 'cursor' | 'clipboard') => {
          this.plugin.settings.outputMode = value;
          await this.plugin.saveSettings();
        }));

    // Detail level
    new Setting(containerEl)
      .setName('Detail level')
      .setDesc('How much detail to include in summaries.')
      .addDropdown(dropdown => dropdown
        .addOption('concise', 'Concise (minimal, fast)')
        .addOption('standard', 'Standard (balanced)')
        .addOption('detailed', 'Detailed (comprehensive)')
        .setValue(this.plugin.settings.detailLevel)
        .onChange(async (value: 'concise' | 'standard' | 'detailed') => {
          this.plugin.settings.detailLevel = value;
          await this.plugin.saveSettings();
        }));

    // Auto-summarization heading
    new Setting(containerEl)
      .setName('Auto-summarization')
      .setHeading();

    // Auto-summarize toggle
    new Setting(containerEl)
      .setName('Auto-summarize on file open')
      .setDesc('Automatically summarize yesterday when opening a daily note.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSummarize)
        .onChange(async (value) => {
          this.plugin.settings.autoSummarize = value;
          await this.plugin.saveSettings();
        }));

    // Target section
    new Setting(containerEl)
      .setName('Target section')
      .setDesc('Section header where the auto-summary will be inserted.')
      .addText(text => text
        .setValue(this.plugin.settings.targetSection)
        .onChange(async (value) => {
          this.plugin.settings.targetSection = value;
          await this.plugin.saveSettings();
        }));

    // Weekly summarization heading
    new Setting(containerEl)
      .setName('Weekly summarization')
      .setHeading();

    // Week start day
    new Setting(containerEl)
      .setName('Week starts on')
      .setDesc('First day of the week for weekly summaries.')
      .addDropdown(dropdown => dropdown
        .addOption('monday', 'Monday')
        .addOption('sunday', 'Sunday')
        .setValue(this.plugin.settings.weekStartDay)
        .onChange(async (value: 'monday' | 'sunday') => {
          this.plugin.settings.weekStartDay = value;
          await this.plugin.saveSettings();
        }));

    // Weekly target section
    new Setting(containerEl)
      .setName('Weekly target section')
      .setDesc('Section header for weekly summary output.')
      .addText(text => text
        .setValue(this.plugin.settings.weeklyTargetSection)
        .onChange(async (value) => {
          this.plugin.settings.weeklyTargetSection = value;
          await this.plugin.saveSettings();
        }));

    // Statistics heading
    new Setting(containerEl)
      .setName('Statistics')
      .setHeading();

    // Initialize stats if missing
    const stats = this.plugin.settings.stats || DEFAULT_SETTINGS.stats;
    const cacheSize = Object.keys(this.plugin.settings.summaryCache || {}).length;

    // Stats display
    new Setting(containerEl)
      .setName('Summary statistics')
      .setDesc(
        `Total: ${stats.totalSummaries} summaries\n` +
        `Daily: ${stats.dailySummaries} | Weekly: ${stats.weeklySummaries} | Monthly: ${stats.monthlySummaries}\n` +
        `Last summary: ${stats.lastSummaryDate || 'Never'}\n` +
        `Cache entries: ${cacheSize}/30`
      );

    // Reset stats button
    new Setting(containerEl)
      .setName('Reset statistics')
      .setDesc('Clear all summary statistics.')
      .addButton(button => button
        .setButtonText('Reset')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.stats = { ...DEFAULT_SETTINGS.stats };
          await this.plugin.saveSettings();
          this.display(); // Refresh the display
          new Notice('Statistics reset');
        }));
  }
}
