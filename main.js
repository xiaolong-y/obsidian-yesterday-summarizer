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
      name: "Summarize yesterday",
      editorCallback: async (editor, view) => {
        await this.summarizeYesterday(editor, view);
      }
    });
    this.addSettingTab(new YesterdaySummarizerSettingTab(this.app, this));
    if (this.settings.autoSummarize) {
      this.registerEvent(
        this.app.workspace.on("file-open", (file) => {
          if (file) {
            void this.handleFileOpen(file);
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
    new import_obsidian.Setting(containerEl).setName("Ollama endpoint").setDesc("Server address.").addText((text) => text.setValue(this.plugin.settings.ollamaEndpoint).onChange(async (value) => {
      this.plugin.settings.ollamaEndpoint = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Ollama model").setDesc("Name of the model to use.").addText((text) => text.setValue(this.plugin.settings.ollamaModel).onChange(async (value) => {
      this.plugin.settings.ollamaModel = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Daily notes folder").setDesc("Folder containing your daily notes.").addText((text) => text.setPlaceholder("10_daily").setValue(this.plugin.settings.dailyNotesFolder).onChange(async (value) => {
      this.plugin.settings.dailyNotesFolder = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Output mode").setDesc("Where to put the generated summary.").addDropdown((dropdown) => dropdown.addOption("cursor", "Insert at cursor").addOption("clipboard", "Copy to clipboard").setValue(this.plugin.settings.outputMode).onChange(async (value) => {
      this.plugin.settings.outputMode = value;
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
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgQXBwLCBFZGl0b3IsIE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIHJlcXVlc3RVcmwsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXR0aW5nc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pbnRlcmZhY2UgWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdzIHtcbiAgb2xsYW1hRW5kcG9pbnQ6IHN0cmluZztcbiAgb2xsYW1hTW9kZWw6IHN0cmluZztcbiAgZGFpbHlOb3Rlc0ZvbGRlcjogc3RyaW5nO1xuICBvdXRwdXRNb2RlOiAnY3Vyc29yJyB8ICdjbGlwYm9hcmQnO1xuICBhdXRvU3VtbWFyaXplOiBib29sZWFuO1xuICB0YXJnZXRTZWN0aW9uOiBzdHJpbmc7XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFllc3RlcmRheVN1bW1hcml6ZXJTZXR0aW5ncyA9IHtcbiAgb2xsYW1hRW5kcG9pbnQ6ICdodHRwOi8vbG9jYWxob3N0OjExNDM0JyxcbiAgb2xsYW1hTW9kZWw6ICdsbGFtYTMuMicsXG4gIGRhaWx5Tm90ZXNGb2xkZXI6ICcxMF9kYWlseScsXG4gIG91dHB1dE1vZGU6ICdjdXJzb3InLFxuICBhdXRvU3VtbWFyaXplOiB0cnVlLFxuICB0YXJnZXRTZWN0aW9uOiBcIiMjIFllc3RlcmRheSdzIEhpZ2hsaWdodHNcIlxufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJvbXB0IFRlbXBsYXRlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IFNVTU1BUklaRV9QUk9NUFQgPSBgU3VtbWFyaXplIHRoaXMgam91cm5hbCBlbnRyeSB1c2luZyB0aGlzIG1hcmtkb3duIGZvcm1hdDpcblxuKipDb21wbGV0ZWQqKjpcbi0gKGxpc3QgYWN0dWFsIGNvbXBsZXRlZCB0YXNrcyBmcm9tIHRoZSBlbnRyeSlcblxuKipJbmNvbXBsZXRlKio6XG4tIChsaXN0IGFjdHVhbCBpbmNvbXBsZXRlIHRhc2tzKVxuXG4qKkJsb2NrZWQqKjpcbi0gKGxpc3QgYmxvY2tlcnMsIG9yIFwiTm9uZVwiIGlmIG5vbmUgbWVudGlvbmVkKVxuXG4qKkluc2lnaHRzKio6XG4tIChleHRyYWN0IGxlYXJuaW5ncy9wYXR0ZXJucyBmcm9tIHRoZSBlbnRyeSlcblxuKipUb2RheSdzIEZvY3VzKio6XG4xLiAodG9wIHByaW9yaXR5IGJhc2VkIG9uIGluY29tcGxldGUgaXRlbXMpXG4yLiAoc2Vjb25kIHByaW9yaXR5KVxuMy4gKHRoaXJkIHByaW9yaXR5KVxuXG5SdWxlczogVXNlICoqYm9sZCoqIGhlYWRlcnMuIE5vIGludHJvIHRleHQuIEJlIHNwZWNpZmljIHRvIHRoZSBhY3R1YWwgY29udGVudC5cblxuLS0tXG5gO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMTE0gQmFja2VuZHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gY2FsbE9sbGFtYShcbiAgZW5kcG9pbnQ6IHN0cmluZyxcbiAgbW9kZWw6IHN0cmluZyxcbiAgcHJvbXB0OiBzdHJpbmdcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7ZW5kcG9pbnR9L2FwaS9nZW5lcmF0ZWAsXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbDogbW9kZWwsXG4gICAgICAgIHByb21wdDogcHJvbXB0LFxuICAgICAgICBzdHJlYW06IGZhbHNlXG4gICAgICB9KVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9sbGFtYSByZXR1cm5lZCBzdGF0dXMgJHtyZXNwb25zZS5zdGF0dXN9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgcmV0dXJuIGRhdGEucmVzcG9uc2UgfHwgJyc7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1haW4gUGx1Z2luXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFllc3RlcmRheVN1bW1hcml6ZXJQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcblxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcblxuICAgIC8vIENvbW1hbmQ6IFN1bW1hcml6ZSBZZXN0ZXJkYXkgKHVzZXMgT2xsYW1hKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N1bW1hcml6ZS15ZXN0ZXJkYXknLFxuICAgICAgbmFtZTogJ1N1bW1hcml6ZSB5ZXN0ZXJkYXknLFxuICAgICAgZWRpdG9yQ2FsbGJhY2s6IGFzeW5jIChlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VtbWFyaXplWWVzdGVyZGF5KGVkaXRvciwgdmlldyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgc2V0dGluZ3MgdGFiXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBZZXN0ZXJkYXlTdW1tYXJpemVyU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuXG4gICAgLy8gQXV0by1zdW1tYXJpemUgd2hlbiBkYWlseSBub3RlIGlzIG9wZW5lZFxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9TdW1tYXJpemUpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCAoZmlsZTogVEZpbGUgfCBudWxsKSA9PiB7XG4gICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5oYW5kbGVGaWxlT3BlbihmaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIG9udW5sb2FkKCkge1xuICAgIC8vIFBsdWdpbiB1bmxvYWRlZFxuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICAvLyBFeHRyYWN0IGRhdGUgZnJvbSBmaWxlbmFtZSAoZS5nLiwgXCIyMDI2LTAxLTE1Lm1kXCIgLT4gXCIyMDI2LTAxLTE1XCIpXG4gIGV4dHJhY3REYXRlRnJvbUZpbGVuYW1lKGZpbGVuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAvLyBNYXRjaCBZWVlZLU1NLUREIHBhdHRlcm5cbiAgICBjb25zdCBtYXRjaCA9IGZpbGVuYW1lLm1hdGNoKC8oXFxkezR9LVxcZHsyfS1cXGR7Mn0pLyk7XG4gICAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiBudWxsO1xuICB9XG5cbiAgLy8gQ2FsY3VsYXRlIHRoZSBkYXkgYmVmb3JlIGEgZ2l2ZW4gZGF0ZVxuICBnZXREYXlCZWZvcmUoZGF0ZVN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBbeWVhciwgbW9udGgsIGRheV0gPSBkYXRlU3RyLnNwbGl0KCctJykubWFwKE51bWJlcik7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoIC0gMSwgZGF5KTtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSAxKTtcblxuICAgIGNvbnN0IHkgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgY29uc3QgbSA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgIGNvbnN0IGQgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG5cbiAgICByZXR1cm4gYCR7eX0tJHttfS0ke2R9YDtcbiAgfVxuXG4gIC8vIFJlYWQgYSBzcGVjaWZpYyBkYXRlJ3MgZGFpbHkgbm90ZSAtIHJldHVybnMgeyBkYXRlLCBjb250ZW50IH0gb3IgbnVsbFxuICBhc3luYyByZWFkRGFpbHlOb3RlKHRhcmdldERhdGU6IHN0cmluZyk6IFByb21pc2U8eyBkYXRlOiBzdHJpbmc7IGNvbnRlbnQ6IHN0cmluZyB9IHwgbnVsbD4ge1xuICAgIC8vIFRyeSBib3RoIGZpbGVuYW1lIGZvcm1hdHM6XG4gICAgLy8gMS4gWVlZWS1NTS1ERCBcdTIwMTMgSm91cm5hbC5tZCAob2xkIGZvcm1hdClcbiAgICAvLyAyLiBZWVlZLU1NLURELm1kIChuZXcgZm9ybWF0KVxuICAgIGNvbnN0IGZvcm1hdHMgPSBbXG4gICAgICBgJHt0aGlzLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXJ9LyR7dGFyZ2V0RGF0ZX0gXHUyMDEzIEpvdXJuYWwubWRgLFxuICAgICAgYCR7dGhpcy5zZXR0aW5ncy5kYWlseU5vdGVzRm9sZGVyfS8ke3RhcmdldERhdGV9Lm1kYFxuICAgIF07XG5cbiAgICBsZXQgbm90ZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBmb3JtYXRzKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgbm90ZVBhdGggPSBwYXRoO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIW5vdGVQYXRoKSB7XG4gICAgICBuZXcgTm90aWNlKGBOb3RlIG5vdCBmb3VuZCBmb3IgJHt0YXJnZXREYXRlfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQobm90ZVBhdGgpO1xuICAgICAgLy8gU3RyaXAgZnJvbnRtYXR0ZXIgKGV2ZXJ5dGhpbmcgYmV0d2VlbiBmaXJzdCB0d28gLS0tKVxuICAgICAgY29uc3QgZnJvbnRtYXR0ZXJFbmQgPSBjb250ZW50LmluZGV4T2YoJy0tLScsIDMpO1xuICAgICAgbGV0IGJvZHlDb250ZW50OiBzdHJpbmc7XG4gICAgICBpZiAoZnJvbnRtYXR0ZXJFbmQgIT09IC0xKSB7XG4gICAgICAgIGJvZHlDb250ZW50ID0gY29udGVudC5zdWJzdHJpbmcoZnJvbnRtYXR0ZXJFbmQgKyAzKS50cmltKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBib2R5Q29udGVudCA9IGNvbnRlbnQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IGRhdGU6IHRhcmdldERhdGUsIGNvbnRlbnQ6IGJvZHlDb250ZW50IH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEVycm9yIHJlYWRpbmcgbm90ZTogJHtlcnJvcn1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIE1haW4gc3VtbWFyaXphdGlvbiBmdW5jdGlvblxuICBhc3luYyBzdW1tYXJpemVZZXN0ZXJkYXkoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykge1xuICAgIC8vIFN0ZXAgMTogR2V0IGN1cnJlbnQgZmlsZSBhbmQgZXh0cmFjdCBpdHMgZGF0ZVxuICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdmlldy5maWxlO1xuICAgIGlmICghY3VycmVudEZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ05vIGZpbGUgaXMgY3VycmVudGx5IG9wZW4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50RmlsZW5hbWUgPSBjdXJyZW50RmlsZS5iYXNlbmFtZTtcbiAgICBjb25zdCBjdXJyZW50RGF0ZSA9IHRoaXMuZXh0cmFjdERhdGVGcm9tRmlsZW5hbWUoY3VycmVudEZpbGVuYW1lKTtcblxuICAgIGlmICghY3VycmVudERhdGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCBleHRyYWN0IGRhdGUgZnJvbSBmaWxlbmFtZTogJHtjdXJyZW50RmlsZW5hbWV9XFxuRXhwZWN0ZWQgZm9ybWF0OiBZWVlZLU1NLUREYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU3RlcCAyOiBDYWxjdWxhdGUgXCJ5ZXN0ZXJkYXlcIiByZWxhdGl2ZSB0byBjdXJyZW50IGZpbGUncyBkYXRlXG4gICAgY29uc3QgeWVzdGVyZGF5RGF0ZSA9IHRoaXMuZ2V0RGF5QmVmb3JlKGN1cnJlbnREYXRlKTtcblxuICAgIGNvbnN0IGxvYWRpbmdOb3RpY2UgPSBuZXcgTm90aWNlKGBSZWFkaW5nICR7eWVzdGVyZGF5RGF0ZX0uLi5gLCAwKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBTdGVwIDM6IFJlYWQgeWVzdGVyZGF5J3Mgbm90ZVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZWFkRGFpbHlOb3RlKHllc3RlcmRheURhdGUpO1xuICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBkYXRlLCBjb250ZW50IH0gPSByZXN1bHQ7XG4gICAgICBsb2FkaW5nTm90aWNlLnNldE1lc3NhZ2UoYFN1bW1hcml6aW5nICR7ZGF0ZX0gdmlhIE9sbGFtYS4uLmApO1xuXG4gICAgICAvLyBTdGVwIDQ6IEJ1aWxkIHByb21wdCB3aXRoIGRhdGUgY29udGV4dFxuICAgICAgY29uc3QgZnVsbFByb21wdCA9IGBTdW1tYXJpemluZyBkYWlseSBub3RlIGZyb20gJHtkYXRlfTpcXG5cXG4ke1NVTU1BUklaRV9QUk9NUFR9JHtjb250ZW50fWA7XG5cbiAgICAgIC8vIFN0ZXAgNTogQ2FsbCBPbGxhbWFcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCBjYWxsT2xsYW1hKFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYUVuZHBvaW50LFxuICAgICAgICB0aGlzLnNldHRpbmdzLm9sbGFtYU1vZGVsLFxuICAgICAgICBmdWxsUHJvbXB0XG4gICAgICApO1xuXG4gICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcblxuICAgICAgLy8gU3RlcCA2OiBPdXRwdXQgd2l0aCBkYXRlIHJlZmVyZW5jZVxuICAgICAgaWYgKHRoaXMuc2V0dGluZ3Mub3V0cHV0TW9kZSA9PT0gJ2N1cnNvcicpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gYFxcbiMjIFN1bW1hcnkgb2YgJHtkYXRlfVxcblxcbiR7c3VtbWFyeX1cXG5gO1xuICAgICAgICBlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihmb3JtYXR0ZWQpO1xuICAgICAgICBuZXcgTm90aWNlKGBTdW1tYXJ5IG9mICR7ZGF0ZX0gaW5zZXJ0ZWQhYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChzdW1tYXJ5KTtcbiAgICAgICAgbmV3IE5vdGljZShgU3VtbWFyeSBvZiAke2RhdGV9IGNvcGllZCB0byBjbGlwYm9hcmQhYCk7XG4gICAgICB9XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9hZGluZ05vdGljZS5oaWRlKCk7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIG5ldyBOb3RpY2UoYEVycm9yOiAke2Vycm9yTXNnfWAsIDEwMDAwKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tZZXN0ZXJkYXkgU3VtbWFyaXplcl0gRXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBmaWxlIG9wZW4gZXZlbnQgZm9yIGF1dG8tc3VtbWFyaXphdGlvblxuICBhc3luYyBoYW5kbGVGaWxlT3BlbihmaWxlOiBURmlsZSkge1xuICAgIC8vIENoZWNrIGlmIGl0J3MgaW4gdGhlIGRhaWx5IG5vdGVzIGZvbGRlclxuICAgIGlmICghZmlsZS5wYXRoLnN0YXJ0c1dpdGgodGhpcy5zZXR0aW5ncy5kYWlseU5vdGVzRm9sZGVyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGZpbGVuYW1lIG1hdGNoZXMgZGF0ZSBwYXR0ZXJuXG4gICAgY29uc3QgZGF0ZU1hdGNoID0gdGhpcy5leHRyYWN0RGF0ZUZyb21GaWxlbmFtZShmaWxlLmJhc2VuYW1lKTtcbiAgICBpZiAoIWRhdGVNYXRjaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIGZpbGUgY29udGVudFxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGFyZ2V0IHNlY3Rpb24gZXhpc3RzXG4gICAgY29uc3QgdGFyZ2V0U2VjdGlvbiA9IHRoaXMuc2V0dGluZ3MudGFyZ2V0U2VjdGlvbjtcbiAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBjb250ZW50LmluZGV4T2YodGFyZ2V0U2VjdGlvbik7XG4gICAgaWYgKHNlY3Rpb25JbmRleCA9PT0gLTEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBzZWN0aW9uIGlzIGVtcHR5IChuZXh0IGxpbmUgYWZ0ZXIgc2VjdGlvbiBoZWFkZXIgc2hvdWxkIGJlIGVtcHR5IG9yIGFub3RoZXIgaGVhZGVyKVxuICAgIGNvbnN0IGFmdGVyU2VjdGlvbiA9IGNvbnRlbnQuc3Vic3RyaW5nKHNlY3Rpb25JbmRleCArIHRhcmdldFNlY3Rpb24ubGVuZ3RoKTtcbiAgICBjb25zdCBuZXh0TmV3bGluZSA9IGFmdGVyU2VjdGlvbi5pbmRleE9mKCdcXG4nKTtcbiAgICBpZiAobmV4dE5ld2xpbmUgPT09IC0xKSB7XG4gICAgICAvLyBTZWN0aW9uIGlzIGF0IGVuZCBvZiBmaWxlIHdpdGggbm8gbmV3bGluZSAtIGl0J3MgZW1wdHlcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29udGVudEFmdGVySGVhZGVyID0gYWZ0ZXJTZWN0aW9uLnN1YnN0cmluZyhuZXh0TmV3bGluZSArIDEpO1xuICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhbHJlYWR5IGNvbnRlbnQgKG5vdCBqdXN0IHdoaXRlc3BhY2Ugb3IgbmV4dCBzZWN0aW9uKVxuICAgICAgY29uc3QgbmV4dFNlY3Rpb25NYXRjaCA9IGNvbnRlbnRBZnRlckhlYWRlci5tYXRjaCgvXihcXHMqKSgjI3xcXG4jI3wkKS8pO1xuICAgICAgaWYgKCFuZXh0U2VjdGlvbk1hdGNoKSB7XG4gICAgICAgIC8vIFRoZXJlJ3MgY29udGVudCBhZnRlciB0aGUgaGVhZGVyIHRoYXQgaXNuJ3QgYW5vdGhlciBzZWN0aW9uXG4gICAgICAgIGNvbnN0IGZpcnN0Tm9uV2hpdGVzcGFjZSA9IGNvbnRlbnRBZnRlckhlYWRlci50cmltKCk7XG4gICAgICAgIGlmIChmaXJzdE5vbldoaXRlc3BhY2UgJiYgIWZpcnN0Tm9uV2hpdGVzcGFjZS5zdGFydHNXaXRoKCcjIycpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR2V0IHllc3RlcmRheSdzIGRhdGUgYmFzZWQgb24gdGhpcyBmaWxlXG4gICAgY29uc3QgeWVzdGVyZGF5RGF0ZSA9IHRoaXMuZ2V0RGF5QmVmb3JlKGRhdGVNYXRjaCk7XG5cbiAgICBjb25zdCBsb2FkaW5nTm90aWNlID0gbmV3IE5vdGljZShgQXV0by1zdW1tYXJpemluZyAke3llc3RlcmRheURhdGV9Li4uYCwgMCk7XG5cbiAgICB0cnkge1xuICAgICAgLy8gUmVhZCB5ZXN0ZXJkYXkncyBub3RlXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnJlYWREYWlseU5vdGUoeWVzdGVyZGF5RGF0ZSk7XG4gICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICBsb2FkaW5nTm90aWNlLmhpZGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IGRhdGUsIGNvbnRlbnQ6IHllc3RlcmRheUNvbnRlbnQgfSA9IHJlc3VsdDtcbiAgICAgIGxvYWRpbmdOb3RpY2Uuc2V0TWVzc2FnZShgU3VtbWFyaXppbmcgJHtkYXRlfSB2aWEgT2xsYW1hLi4uYCk7XG5cbiAgICAgIC8vIEJ1aWxkIHByb21wdCBhbmQgY2FsbCBPbGxhbWFcbiAgICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgU3VtbWFyaXppbmcgZGFpbHkgbm90ZSBmcm9tICR7ZGF0ZX06XFxuXFxuJHtTVU1NQVJJWkVfUFJPTVBUfSR7eWVzdGVyZGF5Q29udGVudH1gO1xuICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGNhbGxPbGxhbWEoXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hRW5kcG9pbnQsXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mub2xsYW1hTW9kZWwsXG4gICAgICAgIGZ1bGxQcm9tcHRcbiAgICAgICk7XG5cbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuXG4gICAgICAvLyBJbnNlcnQgc3VtbWFyeSBhZnRlciB0aGUgdGFyZ2V0IHNlY3Rpb24gaGVhZGVyXG4gICAgICBhd2FpdCB0aGlzLmluc2VydEF0U2VjdGlvbihmaWxlLCB0YXJnZXRTZWN0aW9uLCBzdW1tYXJ5KTtcbiAgICAgIG5ldyBOb3RpY2UoYEF1dG8tc3VtbWFyaXplZCAke2RhdGV9IWApO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvYWRpbmdOb3RpY2UuaGlkZSgpO1xuICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBuZXcgTm90aWNlKGBBdXRvLXN1bW1hcml6ZSBlcnJvcjogJHtlcnJvck1zZ31gLCAxMDAwMCk7XG4gICAgICBjb25zb2xlLmVycm9yKCdbWWVzdGVyZGF5IFN1bW1hcml6ZXJdIEF1dG8tc3VtbWFyaXplIGVycm9yOicsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBJbnNlcnQgY29udGVudCBhZnRlciBhIHNlY3Rpb24gaGVhZGVyXG4gIGFzeW5jIGluc2VydEF0U2VjdGlvbihmaWxlOiBURmlsZSwgc2VjdGlvbkhlYWRlcjogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgICBjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZmlsZUNvbnRlbnQuaW5kZXhPZihzZWN0aW9uSGVhZGVyKTtcblxuICAgIGlmIChzZWN0aW9uSW5kZXggPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlY3Rpb24gXCIke3NlY3Rpb25IZWFkZXJ9XCIgbm90IGZvdW5kYCk7XG4gICAgfVxuXG4gICAgLy8gRmluZCB0aGUgZW5kIG9mIHRoZSBzZWN0aW9uIGhlYWRlciBsaW5lXG4gICAgY29uc3QgaGVhZGVyRW5kID0gZmlsZUNvbnRlbnQuaW5kZXhPZignXFxuJywgc2VjdGlvbkluZGV4KTtcbiAgICBpZiAoaGVhZGVyRW5kID09PSAtMSkge1xuICAgICAgLy8gU2VjdGlvbiBoZWFkZXIgaXMgYXQgZW5kIG9mIGZpbGVcbiAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBmaWxlQ29udGVudCArICdcXG5cXG4nICsgY29udGVudCArICdcXG4nO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIG5ld0NvbnRlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbnNlcnQgYWZ0ZXIgaGVhZGVyXG4gICAgICBjb25zdCBiZWZvcmUgPSBmaWxlQ29udGVudC5zdWJzdHJpbmcoMCwgaGVhZGVyRW5kICsgMSk7XG4gICAgICBjb25zdCBhZnRlciA9IGZpbGVDb250ZW50LnN1YnN0cmluZyhoZWFkZXJFbmQgKyAxKTtcbiAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBiZWZvcmUgKyAnXFxuJyArIGNvbnRlbnQgKyAnXFxuJyArIGFmdGVyO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIG5ld0NvbnRlbnQpO1xuICAgIH1cbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXR0aW5ncyBUYWJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY2xhc3MgWWVzdGVyZGF5U3VtbWFyaXplclNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBZZXN0ZXJkYXlTdW1tYXJpemVyUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFllc3RlcmRheVN1bW1hcml6ZXJQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcblxuICAgIC8vIE9sbGFtYSBlbmRwb2ludFxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ09sbGFtYSBlbmRwb2ludCcpXG4gICAgICAuc2V0RGVzYygnU2VydmVyIGFkZHJlc3MuJylcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mub2xsYW1hRW5kcG9pbnQpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFFbmRwb2ludCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG5cbiAgICAvLyBPbGxhbWEgbW9kZWxcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdPbGxhbWEgbW9kZWwnKVxuICAgICAgLnNldERlc2MoJ05hbWUgb2YgdGhlIG1vZGVsIHRvIHVzZS4nKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbGxhbWFNb2RlbClcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm9sbGFtYU1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIERhaWx5IG5vdGVzIGZvbGRlclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ0RhaWx5IG5vdGVzIGZvbGRlcicpXG4gICAgICAuc2V0RGVzYygnRm9sZGVyIGNvbnRhaW5pbmcgeW91ciBkYWlseSBub3Rlcy4nKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgIC5zZXRQbGFjZWhvbGRlcignMTBfZGFpbHknKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlOb3Rlc0ZvbGRlcilcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZXNGb2xkZXIgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuXG4gICAgLy8gT3V0cHV0IG1vZGVcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdPdXRwdXQgbW9kZScpXG4gICAgICAuc2V0RGVzYygnV2hlcmUgdG8gcHV0IHRoZSBnZW5lcmF0ZWQgc3VtbWFyeS4nKVxuICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXG4gICAgICAgIC5hZGRPcHRpb24oJ2N1cnNvcicsICdJbnNlcnQgYXQgY3Vyc29yJylcbiAgICAgICAgLmFkZE9wdGlvbignY2xpcGJvYXJkJywgJ0NvcHkgdG8gY2xpcGJvYXJkJylcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm91dHB1dE1vZGUpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWU6ICdjdXJzb3InIHwgJ2NsaXBib2FyZCcpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vdXRwdXRNb2RlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIEF1dG8tc3VtbWFyaXphdGlvbiBoZWFkaW5nXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnQXV0by1zdW1tYXJpemF0aW9uJylcbiAgICAgIC5zZXRIZWFkaW5nKCk7XG5cbiAgICAvLyBBdXRvLXN1bW1hcml6ZSB0b2dnbGVcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdBdXRvLXN1bW1hcml6ZSBvbiBmaWxlIG9wZW4nKVxuICAgICAgLnNldERlc2MoJ0F1dG9tYXRpY2FsbHkgc3VtbWFyaXplIHllc3RlcmRheSB3aGVuIG9wZW5pbmcgYSBkYWlseSBub3RlLicpXG4gICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TdW1tYXJpemUpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvU3VtbWFyaXplID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIFRhcmdldCBzZWN0aW9uXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnVGFyZ2V0IHNlY3Rpb24nKVxuICAgICAgLnNldERlc2MoJ1NlY3Rpb24gaGVhZGVyIHdoZXJlIHRoZSBhdXRvLXN1bW1hcnkgd2lsbCBiZSBpbnNlcnRlZC4nKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRTZWN0aW9uKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0U2VjdGlvbiA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0JBQXdHO0FBZXhHLElBQU0sbUJBQWdEO0FBQUEsRUFDcEQsZ0JBQWdCO0FBQUEsRUFDaEIsYUFBYTtBQUFBLEVBQ2Isa0JBQWtCO0FBQUEsRUFDbEIsWUFBWTtBQUFBLEVBQ1osZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUNqQjtBQU1BLElBQU0sbUJBQW1CO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUE0QnpCLGVBQWUsV0FDYixVQUNBLE9BQ0EsUUFDaUI7QUFDakIsTUFBSTtBQUNGLFVBQU0sV0FBVyxVQUFNLDRCQUFXO0FBQUEsTUFDaEMsS0FBSyxHQUFHLFFBQVE7QUFBQSxNQUNoQixRQUFRO0FB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
