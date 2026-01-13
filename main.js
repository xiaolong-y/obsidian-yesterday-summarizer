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
  ollamaModel: "llama3.2",
  dailyNotesFolder: "10_daily",
  outputMode: "cursor",
  autoSummarize: true,
  targetSection: "## Yesterday's Highlights"
};
var SUMMARIZE_PROMPT = `Summarize this journal entry using this markdown format:

**Completed**:
- (list actual completed tasks from the entry)

**Incomplete**:
- (list actual incomplete tasks)

**Blocked**:
- (list blockers, or "None" if none mentioned)

**Insights**:
- (extract learnings/patterns from the entry)

**Today's Focus**:
1. (top priority based on incomplete items)
2. (second priority)
3. (third priority)

Rules: Use **bold** headers. No intro text. Be specific to the actual content.

---
`;
async function callOllama(endpoint, model, prompt) {
  try {
    const response = await (0, import_obsidian.requestUrl)({
      url: `${endpoint}/api/generate`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });
    if (response.status !== 200) {
      throw new Error(`Ollama returned status ${response.status}`);
    }
    const data = response.json;
    return data.response || "";
  } catch (error) {
    throw new Error(`Ollama error: ${error instanceof Error ? error.message : String(error)}`);
  }
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
      name: "Summarize Yesterday",
      editorCallback: async (editor, view) => {
        await this.summarizeYesterday(editor, view);
      }
    });
    this.addSettingTab(new YesterdaySummarizerSettingTab(this.app, this));
    if (this.settings.autoSummarize) {
      this.registerEvent(
        this.app.workspace.on("file-open", (file) => {
          if (file) {
            this.handleFileOpen(file);
          }
        })
      );
    }
    console.log("Yesterday Summarizer plugin loaded");
  }
  onunload() {
    console.log("Yesterday Summarizer plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
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
  // Read a specific date's daily note - returns { date, content } or null
  async readDailyNote(targetDate) {
    const formats = [
      `${this.settings.dailyNotesFolder}/${targetDate} \u2013 Journal.md`,
      `${this.settings.dailyNotesFolder}/${targetDate}.md`
    ];
    let notePath = null;
    for (const path of formats) {
      console.log(`[Yesterday Summarizer] Trying: ${path}`);
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
    console.log(`[Yesterday Summarizer] Found: ${notePath}`);
    try {
      const content = await this.app.vault.adapter.read(notePath);
      const frontmatterEnd = content.indexOf("---", 3);
      let bodyContent;
      if (frontmatterEnd !== -1) {
        bodyContent = content.substring(frontmatterEnd + 3).trim();
      } else {
        bodyContent = content;
      }
      console.log(`[Yesterday Summarizer] Read ${bodyContent.length} chars from ${targetDate}`);
      return { date: targetDate, content: bodyContent };
    } catch (error) {
      new import_obsidian.Notice(`Error reading note: ${error}`);
      return null;
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
    console.log(`[Yesterday Summarizer] Current file: ${currentFilename} (${currentDate})`);
    console.log(`[Yesterday Summarizer] Yesterday: ${yesterdayDate}`);
    const loadingNotice = new import_obsidian.Notice(`Reading ${yesterdayDate}...`, 0);
    try {
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        loadingNotice.hide();
        return;
      }
      const { date, content } = result;
      loadingNotice.setMessage(`Summarizing ${date} via Ollama...`);
      const fullPrompt = `Summarizing daily note from ${date}:

${SUMMARIZE_PROMPT}${content}`;
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt
      );
      loadingNotice.hide();
      if (this.settings.outputMode === "cursor") {
        const formatted = `
## Summary of ${date}

${summary}
`;
        editor.replaceSelection(formatted);
        new import_obsidian.Notice(`Summary of ${date} inserted!`);
      } else {
        await navigator.clipboard.writeText(summary);
        new import_obsidian.Notice(`Summary of ${date} copied to clipboard!`);
      }
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Error:", error);
    }
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
    console.log(`[Yesterday Summarizer] Daily note opened: ${file.path}`);
    const content = await this.app.vault.read(file);
    const targetSection = this.settings.targetSection;
    const sectionIndex = content.indexOf(targetSection);
    if (sectionIndex === -1) {
      console.log(`[Yesterday Summarizer] Target section "${targetSection}" not found`);
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
          console.log(`[Yesterday Summarizer] Section already has content, skipping auto-summarize`);
          return;
        }
      }
    }
    console.log(`[Yesterday Summarizer] Section is empty, triggering auto-summarize`);
    const yesterdayDate = this.getDayBefore(dateMatch);
    const loadingNotice = new import_obsidian.Notice(`Auto-summarizing ${yesterdayDate}...`, 0);
    try {
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        loadingNotice.hide();
        return;
      }
      const { date, content: yesterdayContent } = result;
      loadingNotice.setMessage(`Summarizing ${date} via Ollama...`);
      const fullPrompt = `Summarizing daily note from ${date}:

${SUMMARIZE_PROMPT}${yesterdayContent}`;
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt
      );
      loadingNotice.hide();
      await this.insertAtSection(file, targetSection, summary);
      new import_obsidian.Notice(`Auto-summarized ${date}!`);
    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`Auto-summarize error: ${errorMsg}`, 1e4);
      console.error("[Yesterday Summarizer] Auto-summarize error:", error);
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
var YesterdaySummarizerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Yesterday Summarizer Settings" });
    new import_obsidian.Setting(containerEl).setName("Ollama Endpoint").setDesc("Ollama API endpoint (default: http://localhost:11434)").addText((text) => text.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.ollamaEndpoint).onChange(async (value) => {
      this.plugin.settings.ollamaEndpoint = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Ollama Model").setDesc("Model to use with Ollama (e.g., llama3.2, mistral, phi3)").addText((text) => text.setPlaceholder("llama3.2").setValue(this.plugin.settings.ollamaModel).onChange(async (value) => {
      this.plugin.settings.ollamaModel = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Daily Notes Folder").setDesc("Folder containing your daily notes").addText((text) => text.setPlaceholder("10_daily").setValue(this.plugin.settings.dailyNotesFolder).onChange(async (value) => {
      this.plugin.settings.dailyNotesFolder = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Output Mode").setDesc("Where to put the generated summary (for manual command)").addDropdown((dropdown) => dropdown.addOption("cursor", "Insert at cursor").addOption("clipboard", "Copy to clipboard").setValue(this.plugin.settings.outputMode).onChange(async (value) => {
      this.plugin.settings.outputMode = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Auto-Summarization" });
    new import_obsidian.Setting(containerEl).setName("Auto-Summarize on File Open").setDesc("Automatically summarize yesterday when opening a daily note (requires restart)").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSummarize).onChange(async (value) => {
      this.plugin.settings.autoSummarize = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Target Section").setDesc(`Section header where auto-summary will be inserted (e.g., "## Yesterday's Highlights")`).addText((text) => text.setPlaceholder("## Yesterday's Highlights").setValue(this.plugin.settings.targetSection).onChange(async (value) => {
      this.plugin.settings.targetSection = value;
      await this.plugin.saveSettings();
    }));
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgQXBwLCBFZGl0b3IsIE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIHJlcXVlc3RVcmwsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXR0aW5nc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pbnRlcmZhY2UgWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdzIHtcbiAgb2xsYW1hRW5kcG9pbnQ6IHN0cmluZztcbiAgb2xsYW1hTW9kZWw6IHN0cmluZztcbiAgZGFpbHlOb3Rlc0ZvbGRlcjogc3RyaW5nO1xuICBvdXRwdXRNb2RlOiAnY3Vyc29yJyB8ICdjbGlwYm9hcmQnO1xuICBhdXRvU3VtbWFyaXplOiBib29sZWFuO1xuICB0YXJnZXRTZWN0aW9uOiBzdHJpbmc7XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFllc3RlcmRheVN1bW1hcml6ZXJTZXR0aW5ncyA9IHtcbiAgb2xsYW1hRW5kcG9pbnQ6ICdodHRwOi8vbG9jYWxob3N0OjExNDM0JyxcbiAgb2xsYW1hTW9kZWw6ICdsbGFtYTMuMicsXG4gIGRhaWx5Tm90ZXNGb2xkZXI6ICcxMF9kYWlseScsXG4gIG91dHB1dE1vZGU6ICdjdXJzb3InLFxuICBhdXRvU3VtbWFyaXplOiB0cnVlLFxuICB0YXJnZXRTZWN0aW9uOiBcIiMjIFllc3RlcmRheSdzIEhpZ2hsaWdodHNcIlxufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJvbXB0IFRlbXBsYXRlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IFNVTU1BUklaRV9QUk9NUFQgPSBgU3VtbWFyaXplIHRoaXMgam91cm5hbCBlbnRyeSB1c2luZyB0aGlzIG1hcmtkb3duIGZvcm1hdDpcblxuKipDb21wbGV0ZWQqKjpcbi0gKGxpc3QgYWN0dWFsIGNvbXBsZXRlZCB0YXNrcyBmcm9tIHRoZSBlbnRyeSlcblxuKipJbmNvbXBsZXRlKio6XG4tIChsaXN0IGFjdHVhbCBpbmNvbXBsZXRlIHRhc2tzKVxuXG4qKkJsb2NrZWQqKjpcbi0gKGxpc3QgYmxvY2tlcnMsIG9yIFwiTm9uZVwiIGlmIG5vbmUgbWVudGlvbmVkKVxuXG4qKkluc2lnaHRzKio6XG4tIChleHRyYWN0IGxlYXJuaW5ncy9wYXR0ZXJucyBmcm9tIHRoZSBlbnRyeSlcblxuKipUb2RheSdzIEZvY3VzKio6XG4xLiAodG9wIHByaW9yaXR5IGJhc2VkIG9uIGluY29tcGxldGUgaXRlbXMpXG4yLiAoc2Vjb25kIHByaW9yaXR5KVxuMy4gKHRoaXJkIHByaW9yaXR5KVxuXG5SdWxlczogVXNlICoqYm9sZCoqIGhlYWRlcnMuIE5vIGludHJvIHRleHQuIEJlIHNwZWNpZmljIHRvIHRoZSBhY3R1YWwgY29udGVudC5cblxuLS0tXG5gO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMTE0gQmFja2VuZHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gY2FsbE9sbGFtYShcbiAgZW5kcG9pbnQ6IHN0cmluZyxcbiAgbW9kZWw6IHN0cmluZyxcbiAgcHJvbXB0OiBzdHJpbmdcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7ZW5kcG9pbnR9L2FwaS9nZW5lcmF0ZWAsXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbDogbW9kZWwsXG4gICAgICAgIHByb21wdDogcHJvbXB0LFxuICAgICAgICBzdHJlYW06IGZhbHNlXG4gICAgICB9KVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9sbGFtYSByZXR1cm5lZCBzdGF0dXMgJHtyZXNwb25zZS5zdGF0dXN9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgcmV0dXJuIGRhdGEucmVzcG9uc2UgfHwgJyc7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1haW4gUGx1Z2luXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFllc3RlcmRheVN1bW1hcml6ZXJQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcblxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcblxuICAgIC8vIENvbW1hbmQ6IFN1bW1hcml6ZSBZZXN0ZXJkYXkgKHVzZXMgT2xsYW1hKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N1bW1hcml6ZS15ZXN0ZXJkYXknLFxuICAgICAgbmFtZTogJ1N1bW1hcml6ZSBZZXN0ZXJkYXknLFxuICAgICAgZWRpdG9yQ2FsbGJhY2s6IGFzeW5jIChlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VtbWFyaXplWWVzdGVyZGF5KGVkaXRvciwgdmlldyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgc2V0dGluZ3MgdGFiXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBZZXN0ZXJkYXlTdW1tYXJpemVyU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuXG4gICAgLy8gQXV0by1zdW1tYXJpemUgd2hlbiBkYWlseSBub3RlIGlzIG9wZW5lZFxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9TdW1tYXJpemUpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCAoZmlsZTogVEZpbGUgfCBudWxsKSA9PiB7XG4gICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlRmlsZU9wZW4oZmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnWWVzdGVyZGF5IFN1bW1hcml6ZXIgcGx1Z2luIGxvYWRlZCcpO1xuICB9XG5cbiAgb251bmxvYWQoKSB7XG4gICAgY29uc29sZS5sb2coJ1llc3RlcmRheSBTdW1tYXJpemVyIHBsdWdpbiB1bmxvYWRlZCcpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICAvLyBFeHRyYWN0IGRhdGUgZnJvbSBmaWxlbmFtZSAoZS5nLiwgXCIyMDI2LTAxLTE1Lm1kXCIgLT4gXCIyMDI2LTAxLTE1XCIpXG4gIGV4dHJhY3REYXRlRnJvbUZpbGVuYW1lKGZpbGVuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAvLyBNYXRjaCBZWVlZLU1NLUREIHBhdHRlcm5cbiAgICBjb25zdCBtYXRjaCA9IGZpbGVuYW1lLm1hdGNoKC8oXFxkezR9LVxcZHsyfS1cXGR7Mn0pLyk7XG4gICAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiBudWxsO1xuICB9XG5cbiAgLy8gQ2FsY3VsYXRlIHRoZSBkYXkgYmVmb3JlIGEgZ2l2ZW4gZGF0ZVxuICBnZXREYXlCZWZvcmUoZGF0ZVN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBbeWVhciwgbW9udGgsIGRheV0gPSBkYXRlU3RyLnNwbGl0KCctJykubWFwKE51bWJlcik7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoIC0gMSwgZGF5KTtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSAxKTtcblxuICAgIGNvbnN0IHkgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgY29uc3QgbSA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgIGNvbnN0IGQgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG5cbiAgICByZXR1cm4gYCR7eX0tJHttfS0ke2R9YDtcbiAgfVxuXG4gIC8vIFJlYWQgYSBzcGVjaWZpYyBkYXRlJ3MgZGFpbHkgbm90ZSAtIHJldHVybnMgeyBkYXRlLCBjb250ZW50IH0gb3IgbnVsbFxuICBhc3luYyByZWFkRGFpbHlOb3RlKHRhcmdldERhdGU6IHN0cmluZyk6IFByb21pc2U8eyBkYXRlOiBzdHJpbmc7IGNvbnRlbnQ6IHN0cmluZyB9IHwgbnVsbD4ge1xuICAgIC8vIFRyeSBib3RoIGZpbGVuYW1lIGZvcm1hdHM6XG4gICAgLy8gMS4gWVlZWS1NTS1ERCBcdTIwMTMgSm91cm5hbC5tZCAob2xkIGZvcm1hdClcbiAgICAvLyAyLiBZWVlZLU1NLURELm1kIChuZXcgZm9ybWF0KVxuICAgIGNvbnN0IGZvcm1hdHMgPSBbXG4gICAgICBgJHt0aGlzLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXJ9LyR7dGFyZ2V0RGF0ZX0gXHUyMDEzIEpvdXJuYWwubWRgLFxuICAgICAgYCR7dGhpcy5zZXR0aW5ncy5kYWlseU5vdGVzRm9sZGVyfS8ke3RhcmdldERhdGV9Lm1kYFxuICAgIF07XG5cbiAgICBsZXQgbm90ZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBmb3JtYXRzKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1llc3RlcmRheSBTdW1tYXJpemVyXSBUcnlpbmc6ICR7cGF0aH1gKTtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICBpZiAoZmlsZSkge1xuICAgICAgICBub3RlUGF0aCA9IHBhdGg7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbm90ZVBhdGgpIHtcbiAgICAgIG5ldyBOb3RpY2UoYE5vdGUgbm90IGZvdW5kIGZvciAke3RhcmdldERhdGV9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW1llc3RlcmRheSBTdW1tYXJpemVyXSBGb3VuZDogJHtub3RlUGF0aH1gKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKG5vdGVQYXRoKTtcbiAgICAgIC8vIFN0cmlwIGZyb250bWF0dGVyIChldmVyeXRoaW5nIGJldHdlZW4gZmlyc3QgdHdvIC0tLSlcbiAgICAgIGNvbnN0IGZyb250bWF0dGVyRW5kID0gY29udGVudC5pbmRleE9mKCctLS0nLCAzKTtcbiAgICAgIGxldCBib2R5Q29udGVudDogc3RyaW5nO1xuICAgICAgaWYgKGZyb250bWF0dGVyRW5kICE9PSAtMSkge1xuICAgICAgICBib2R5Q29udGVudCA9IGNvbnRlbnQuc3Vic3RyaW5nKGZyb250bWF0dGVyRW5kICsgMykudHJpbSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYm9keUNvbnRlbnQgPSBjb250ZW50O1xuICAgICAgfVxuXG4gICAgICBjb25zb2xlLmxvZyhgW1llc3RlcmRheSBTdW1tYXJpemVyXSBSZWFkICR7Ym9keUNvbnRlbnQubGVuZ3RofSBjaGFycyBmcm9tICR7dGFyZ2V0RGF0ZX1gKTtcbiAgICAgIHJldHVybiB7IGRhdGU6IHRhcmdldERhdGUsIGNvbnRlbnQ6IGJvZHlDb250ZW50IH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEVycm9yIHJlYWRpbmcgbm90ZTogJHtlcnJvcn1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIE1haW4gc3VtbWFyaXphdGlvbiBmdW5jdGlvblxuICBhc3luYyBzdW1tYXJpemVZZXN0ZXJkYXkoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykge1xuICAgIC8vIFN0ZXAgMTogR2V0IGN1cnJlbnQgZmlsZSBhbmQgZXh0cmFjdCBpdHMgZGF0ZVxuICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdmlldy5maWxlO1xuICAgIGlmICghY3VycmVudEZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ05vIGZpbGUgaXMgY3VycmVudGx5IG9wZW4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50RmlsZW5hbWUgPSBjdXJyZW50RmlsZS5iYXNlbmFtZTtcbiAgICBjb25zdCBjdXJyZW50RGF0ZSA9IHRoaXMuZXh0cmFjdERhdGVGcm9tRmlsZW5hbWUoY3VycmVudEZpbGVuYW1lKTtcblxuICAgIGlmICghY3VycmVudERhdGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCBleHRyYWN0IGRhdGUgZnJvbSBmaWxlbmFtZTogJHtjdXJyZW50RmlsZW5hbWV9XFxuRXhwZWN0ZWQgZm9ybWF0OiBZWVlZLU1NLUREYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU3RlcCAyOiBDYWxjdWxhdGUgXCJ5ZXN0ZXJkYXlcIiByZWxhdGl2ZSB0byBjdXJyZW50IGZpbGUncyBkYXRlXG4gICAgY29uc3QgeWVzdGVyZGF5RGF0ZSA9IHRoaXMuZ2V0RGF5QmVmb3JlKGN1cnJlbnREYXRlKTtcblxuICAgIGNvbnNvbGUubG9nKGBbWWVzdGVyZGF5IFN1bW1hcml6ZXJdIEN1cnJlbnQgZmlsZTogJHtjdXJyZW50RmlsZW5hbWV9ICgke2N1cnJlbnREYXRlfSlgKTtcbiAgICBjb25zb2xlLmxvZyhgW1llc3RlcmRheSBTdW1tYXJpemVyXSBZZXN0ZXJkYXk6ICR7eWVzdGVyZGF5RGF0ZX1gKTtcblxuICAgIGNvbnN0IGxvYWRpbmdOb3RpY2UgPSBuZXcgTm90aWNlKGBSZWFkaW5nICR7eWVzdGVyZGF5RGF0ZX0uLi5gLCAwKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBTdGVwIDM6IFJlYWQgeWVzdGVyZGF5J3Mgbm90ZVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZWFkRGFpbHlOb3RlKHllc3RlcmRheURhdGUpO1xuICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBkYXRlLCBjb250ZW50IH0gPSByZXN1bHQ7XG4gICAgICBsb2FkaW5nTm90aWNlLnNldE1lc3NhZ2UoYFN1bW1hcml6aW5nICR7ZGF0ZX0gdmlhIE9sbGFtYS4uLmApO1xuXG4gICAgICAvLyBTdGVwIDQ6IEJ1aWxkIHByb21wdCB3aXRoIGRhdGUgY29udGV4dFxuICAgICAgY29uc3QgZnVsbFByb21wdCA9IGBTdW1tYXJpemluZyBkYWlseSBub3RlIGZyb20gJHtkYXRlfTpcXG5cXG4ke1NVTU1BUklaRV9QUk9NUFR9JHtjb250ZW50fWA7XG5cbiAgICAgIC8vIFN0ZXAgNTogQ2FsbCBPbGxhbWFcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCBjYWxsT2xsYW1hKFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50LFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYU1vZGVsLFxuICAgICAgICBmdWxsUHJvbXB0XG4gICAgICApO1xuXG4gICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcblxuICAgICAgLy8gU3RlcCA2OiBPdXRwdXQgd2l0aCBkYXRlIHJlZmVyZW5jZVxuICAgICAgaWYgKHRoaXMuc2V0dGluZ3Mub3V0cHV0TW9kZSA9PT0gJ2N1cnNvcicpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gYFxcbiMjIFN1bW1hcnkgb2YgJHtkYXRlfVxcblxcbiR7c3VtbWFyeX1cXG5gO1xuICAgICAgICBlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihmb3JtYXR0ZWQpO1xuICAgICAgICBuZXcgTm90aWNlKGBTdW1tYXJ5IG9mICR7ZGF0ZX0gaW5zZXJ0ZWQhYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChzdW1tYXJ5KTtcbiAgICAgICAgbmV3IE5vdGljZShgU3VtbWFyeSBvZiAke2RhdGV9IGNvcGllZCB0byBjbGlwYm9hcmQhYCk7XG4gICAgICB9XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIG5ldyBOb3RpY2UoYEVycm9yOiAke2Vycm9yTXNnfWAsIDEwMDAwKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tZZXN0ZXJkYXkgU3VtbWFyaXplcl0gRXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBmaWxlIG9wZW4gZXZlbnQgZm9yIGF1dG8tc3VtbWFyaXphdGlvblxuICBhc3luYyBoYW5kbGVGaWxlT3BlbihmaWxlOiBURmlsZSkge1xuICAgIC8vIENoZWNrIGlmIGl0J3MgaW4gdGhlIGRhaWx5IG5vdGVzIGZvbGRlclxuICAgIGlmICghZmlsZS5wYXRoLnN0YXJ0c1dpdGgodGhpcy5zZXR0aW5ncy5kYWlseU5vdGVzRm9sZGVyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGZpbGVuYW1lIG1hdGNoZXMgZGF0ZSBwYXR0ZXJuXG4gICAgY29uc3QgZGF0ZU1hdGNoID0gdGhpcy5leHRyYWN0RGF0ZUZyb21GaWxlbmFtZShmaWxlLmJhc2VuYW1lKTtcbiAgICBpZiAoIWRhdGVNYXRjaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKGBbWWVzdGVyZGF5IFN1bW1hcml6ZXJdIERhaWx5IG5vdGUgb3BlbmVkOiAke2ZpbGUucGF0aH1gKTtcblxuICAgIC8vIFJlYWQgdGhlIGZpbGUgY29udGVudFxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGFyZ2V0IHNlY3Rpb24gZXhpc3RzXG4gICAgY29uc3QgdGFyZ2V0U2VjdGlvbiA9IHRoaXMuc2V0dGluZ3MudGFyZ2V0U2VjdGlvbjtcbiAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBjb250ZW50LmluZGV4T2YodGFyZ2V0U2VjdGlvbik7XG4gICAgaWYgKHNlY3Rpb25JbmRleCA9PT0gLTEpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbWWVzdGVyZGF5IFN1bW1hcml6ZXJdIFRhcmdldCBzZWN0aW9uIFwiJHt0YXJnZXRTZWN0aW9ufVwiIG5vdCBmb3VuZGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHNlY3Rpb24gaXMgZW1wdHkgKG5leHQgbGluZSBhZnRlciBzZWN0aW9uIGhlYWRlciBzaG91bGQgYmUgZW1wdHkgb3IgYW5vdGhlciBoZWFkZXIpXG4gICAgY29uc3QgYWZ0ZXJTZWN0aW9uID0gY29udGVudC5zdWJzdHJpbmcoc2VjdGlvbkluZGV4ICsgdGFyZ2V0U2VjdGlvbi5sZW5ndGgpO1xuICAgIGNvbnN0IG5leHROZXdsaW5lID0gYWZ0ZXJTZWN0aW9uLmluZGV4T2YoJ1xcbicpO1xuICAgIGlmIChuZXh0TmV3bGluZSA9PT0gLTEpIHtcbiAgICAgIC8vIFNlY3Rpb24gaXMgYXQgZW5kIG9mIGZpbGUgd2l0aCBubyBuZXdsaW5lIC0gaXQncyBlbXB0eVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb250ZW50QWZ0ZXJIZWFkZXIgPSBhZnRlclNlY3Rpb24uc3Vic3RyaW5nKG5leHROZXdsaW5lICsgMSk7XG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSdzIGFscmVhZHkgY29udGVudCAobm90IGp1c3Qgd2hpdGVzcGFjZSBvciBuZXh0IHNlY3Rpb24pXG4gICAgICBjb25zdCBuZXh0U2VjdGlvbk1hdGNoID0gY29udGVudEFmdGVySGVhZGVyLm1hdGNoKC9eKFxccyopKCMjfFxcbiMjfCQpLyk7XG4gICAgICBpZiAoIW5leHRTZWN0aW9uTWF0Y2gpIHtcbiAgICAgICAgLy8gVGhlcmUncyBjb250ZW50IGFmdGVyIHRoZSBoZWFkZXIgdGhhdCBpc24ndCBhbm90aGVyIHNlY3Rpb25cbiAgICAgICAgY29uc3QgZmlyc3ROb25XaGl0ZXNwYWNlID0gY29udGVudEFmdGVySGVhZGVyLnRyaW0oKTtcbiAgICAgICAgaWYgKGZpcnN0Tm9uV2hpdGVzcGFjZSAmJiAhZmlyc3ROb25XaGl0ZXNwYWNlLnN0YXJ0c1dpdGgoJyMjJykpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgW1llc3RlcmRheSBTdW1tYXJpemVyXSBTZWN0aW9uIGFscmVhZHkgaGFzIGNvbnRlbnQsIHNraXBwaW5nIGF1dG8tc3VtbWFyaXplYCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYFtZZXN0ZXJkYXkgU3VtbWFyaXplcl0gU2VjdGlvbiBpcyBlbXB0eSwgdHJpZ2dlcmluZyBhdXRvLXN1bW1hcml6ZWApO1xuXG4gICAgLy8gR2V0IHllc3RlcmRheSdzIGRhdGUgYmFzZWQgb24gdGhpcyBmaWxlXG4gICAgY29uc3QgeWVzdGVyZGF5RGF0ZSA9IHRoaXMuZ2V0RGF5QmVmb3JlKGRhdGVNYXRjaCk7XG5cbiAgICBjb25zdCBsb2FkaW5nTm90aWNlID0gbmV3IE5vdGljZShgQXV0by1zdW1tYXJpemluZyAke3llc3RlcmRheURhdGV9Li4uYCwgMCk7XG5cbiAgICB0cnkge1xuICAgICAgLy8gUmVhZCB5ZXN0ZXJkYXkncyBub3RlXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnJlYWREYWlseU5vdGUoeWVzdGVyZGF5RGF0ZSk7XG4gICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IGRhdGUsIGNvbnRlbnQ6IHllc3RlcmRheUNvbnRlbnQgfSA9IHJlc3VsdDtcbiAgICAgIGxvYWRpbmdOb3RpY2Uuc2V0TWVzc2FnZShgU3VtbWFyaXppbmcgJHtkYXRlfSB2aWEgT2xsYW1hLi4uYCk7XG5cbiAgICAgIC8vIEJ1aWxkIHByb21wdCBhbmQgY2FsbCBPbGxhbWFcbiAgICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgU3VtbWFyaXppbmcgZGFpbHkgbm90ZSBmcm9tICR7ZGF0ZX06XFxuXFxuJHtTVU1NQVJJWkVfUFJPTVBUfSR7eWVzdGVyZGF5Q29udGVudH1gO1xuICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGNhbGxPbGxhbWEoXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hRW5kcG9pbnQsXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hTW9kZWwsXG4gICAgICAgIGZ1bGxQcm9tcHRcbiAgICAgICk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuXG4gICAgICAvLyBJbnNlcnQgc3VtbWFyeSBhZnRlciB0aGUgdGFyZ2V0IHNlY3Rpb24gaGVhZGVyXG4gICAgICBhd2FpdCB0aGlzLmluc2VydEF0U2VjdGlvbihmaWxlLCB0YXJnZXRTZWN0aW9uLCBzdW1tYXJ5KTtcbiAgICAgIG5ldyBOb3RpY2UoYEF1dG8tc3VtbWFyaXplZCAke2RhdGV9IWApO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBuZXcgTm90aWNlKGBBdXRvLXN1bW1hcml6ZSBlcnJvcjogJHtlcnJvck1zZ31gLCAxMDAwMCk7XG4gICAgICBjb25zb2xlLmVycm9yKCdbWWVzdGVyZGF5IFN1bW1hcml6ZXJdIEF1dG8tc3VtbWFyaXplIGVycm9yOicsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBJbnNlcnQgY29udGVudCBhZnRlciBhIHNlY3Rpb24gaGVhZGVyXG4gIGFzeW5jIGluc2VydEF0U2VjdGlvbihmaWxlOiBURmlsZSwgc2VjdGlvbkhlYWRlcjogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgICBjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZmlsZUNvbnRlbnQuaW5kZXhPZihzZWN0aW9uSGVhZGVyKTtcblxuICAgIGlmIChzZWN0aW9uSW5kZXggPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlY3Rpb24gXCIke3NlY3Rpb25IZWFkZXJ9XCIgbm90IGZvdW5kYCk7XG4gICAgfVxuXG4gICAgLy8gRmluZCB0aGUgZW5kIG9mIHRoZSBzZWN0aW9uIGhlYWRlciBsaW5lXG4gICAgY29uc3QgaGVhZGVyRW5kID0gZmlsZUNvbnRlbnQuaW5kZXhPZignXFxuJywgc2VjdGlvbkluZGV4KTtcbiAgICBpZiAoaGVhZGVyRW5kID09PSAtMSkge1xuICAgICAgLy8gU2VjdGlvbiBoZWFkZXIgaXMgYXQgZW5kIG9mIGZpbGVcbiAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBmaWxlQ29udGVudCArICdcXG5cXG4nICsgY29udGVudCArICdcXG4nO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIG5ld0NvbnRlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbnNlcnQgYWZ0ZXIgaGVhZGVyXG4gICAgICBjb25zdCBiZWZvcmUgPSBmaWxlQ29udGVudC5zdWJzdHJpbmcoMCwgaGVhZGVyRW5kICsgMSk7XG4gICAgICBjb25zdCBhZnRlciA9IGZpbGVDb250ZW50LnN1YnN0cmluZyhoZWFkZXJFbmQgKyAxKTtcbiAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBiZWZvcmUgKyAnXFxuJyArIGNvbnRlbnQgKyAnXFxuJyArIGFmdGVyO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIG5ld0NvbnRlbnQpO1xuICAgIH1cbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXR0aW5ncyBUYWJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY2xhc3MgWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBZZXN0ZXJkYXlTdW1tYXJpemVyUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFllc3RlcmRheVN1bW1hcml6ZXJQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcblxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ1llc3RlcmRheSBTdW1tYXJpemVyIFNldHRpbmdzJyB9KTtcblxuICAgIC8vIE9sbGFtYSBFbmRwb2ludFxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ09sbGFtYSBFbmRwb2ludCcpXG4gICAgICAuc2V0RGVzYygnT2xsYW1hIEFQSSBlbmRwb2ludCAoZGVmYXVsdDogaHR0cDovL2xvY2FsaG9zdDoxMTQzNCknKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgIC5zZXRQbGFjZWhvbGRlcignaHR0cDovL2xvY2FsaG9zdDoxMTQzNCcpXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFFbmRwb2ludClcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIE9sbGFtYSBNb2RlbFxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ09sbGFtYSBNb2RlbCcpXG4gICAgICAuc2V0RGVzYygnTW9kZWwgdG8gdXNlIHdpdGggT2xsYW1hIChlLmcuLCBsbGFtYTMuMiwgbWlzdHJhbCwgcGhpMyknKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgIC5zZXRQbGFjZWhvbGRlcignbGxhbWEzLjInKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mub2xsYW1hTW9kZWwpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG5cbiAgICAvLyBEYWlseSBOb3RlcyBGb2xkZXJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdEYWlseSBOb3RlcyBGb2xkZXInKVxuICAgICAgLnNldERlc2MoJ0ZvbGRlciBjb250YWluaW5nIHlvdXIgZGFpbHkgbm90ZXMnKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgIC5zZXRQbGFjZWhvbGRlcignMTBfZGFpbHknKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlOb3Rlc0ZvbGRlcilcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXIgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuXG4gICAgLy8gT3V0cHV0IE1vZGVcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdPdXRwdXQgTW9kZScpXG4gICAgICAuc2V0RGVzYygnV2hlcmUgdG8gcHV0IHRoZSBnZW5lcmF0ZWQgc3VtbWFyeSAoZm9yIG1hbnVhbCBjb21tYW5kKScpXG4gICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4gZHJvcGRvd25cbiAgICAgICAgLmFkZE9wdGlvbignY3Vyc29yJywgJ0luc2VydCBhdCBjdXJzb3InKVxuICAgICAgICAuYWRkT3B0aW9uKCdjbGlwYm9hcmQnLCAnQ29weSB0byBjbGlwYm9hcmQnKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mub3V0cHV0TW9kZSlcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogJ2N1cnNvcicgfCAnY2xpcGJvYXJkJykgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm91dHB1dE1vZGUgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnQXV0by1TdW1tYXJpemF0aW9uJyB9KTtcblxuICAgIC8vIEF1dG8tU3VtbWFyaXplIFRvZ2dsZVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ0F1dG8tU3VtbWFyaXplIG9uIEZpbGUgT3BlbicpXG4gICAgICAuc2V0RGVzYygnQXV0b21hdGljYWxseSBzdW1tYXJpemUgeWVzdGVyZGF5IHdoZW4gb3BlbmluZyBhIGRhaWx5IG5vdGUgKHJlcXVpcmVzIHJlc3RhcnQpJylcbiAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b1N1bW1hcml6ZSlcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TdW1tYXJpemUgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuXG4gICAgLy8gVGFyZ2V0IFNlY3Rpb25cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdUYXJnZXQgU2VjdGlvbicpXG4gICAgICAuc2V0RGVzYygnU2VjdGlvbiBoZWFkZXIgd2hlcmUgYXV0by1zdW1tYXJ5IHdpbGwgYmUgaW5zZXJ0ZWQgKGUuZy4sIFwiIyMgWWVzdGVyZGF5XFwncyBIaWdobGlnaHRzXCIpJylcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAuc2V0UGxhY2Vob2xkZXIoXCIjIyBZZXN0ZXJkYXkncyBIaWdobGlnaHRzXCIpXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRTZWN0aW9uKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0U2VjdGlvbiA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0JBQXdHO0FBZXhHLElBQU0sbUJBQWdEO0FBQUEsRUFDcEQsZ0JBQWdCO0FBQUEsRUFDaEIsYUFBYTtBQUFBLEVBQ2Isa0JBQWtCO0FBQUEsRUFDbEIsWUFBWTtBQUFBLEVBQ1osZUFBZTtBQUFBLEVBQ2YsZUFBZTtB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
