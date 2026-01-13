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
}

const DEFAULT_SETTINGS: YesterdaySummarizerSettings = {
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  dailyNotesFolder: '10_daily',
  outputMode: 'cursor',
  autoSummarize: true,
  targetSection: "## Yesterday's Highlights"
};

// ============================================================================
// Prompt Template
// ============================================================================

const SUMMARIZE_PROMPT = `Summarize this journal entry using this markdown format:

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

// ============================================================================
// LLM Backends
// ============================================================================

async function callOllama(
  endpoint: string,
  model: string,
  prompt: string
): Promise<string> {
  try {
    const response = await requestUrl({
      url: `${endpoint}/api/generate`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });

    if (response.status !== 200) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = response.json;
    return data.response || '';
  } catch (error) {
    throw new Error(`Ollama error: ${error instanceof Error ? error.message : String(error)}`);
  }
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
      name: 'Summarize Yesterday',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.summarizeYesterday(editor, view);
      }
    });

    // Add settings tab
    this.addSettingTab(new YesterdaySummarizerSettingTab(this.app, this));

    // Auto-summarize when daily note is opened
    if (this.settings.autoSummarize) {
      this.registerEvent(
        this.app.workspace.on('file-open', (file: TFile | null) => {
          if (file) {
            this.handleFileOpen(file);
          }
        })
      );
    }

    console.log('Yesterday Summarizer plugin loaded');
  }

  onunload() {
    console.log('Yesterday Summarizer plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
      console.log(`[Yesterday Summarizer] Trying: ${path}`);
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

    console.log(`[Yesterday Summarizer] Found: ${notePath}`);

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

      console.log(`[Yesterday Summarizer] Read ${bodyContent.length} chars from ${targetDate}`);
      return { date: targetDate, content: bodyContent };
    } catch (error) {
      new Notice(`Error reading note: ${error}`);
      return null;
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

    console.log(`[Yesterday Summarizer] Current file: ${currentFilename} (${currentDate})`);
    console.log(`[Yesterday Summarizer] Yesterday: ${yesterdayDate}`);

    const loadingNotice = new Notice(`Reading ${yesterdayDate}...`, 0);

    try {
      // Step 3: Read yesterday's note
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        loadingNotice.hide();
        return;
      }

      const { date, content } = result;
      loadingNotice.setMessage(`Summarizing ${date} via Ollama...`);

      // Step 4: Build prompt with date context
      const fullPrompt = `Summarizing daily note from ${date}:\n\n${SUMMARIZE_PROMPT}${content}`;

      // Step 5: Call Ollama
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt
      );

      loadingNotice.hide();

      // Step 6: Output with date reference
      if (this.settings.outputMode === 'cursor') {
        const formatted = `\n## Summary of ${date}\n\n${summary}\n`;
        editor.replaceSelection(formatted);
        new Notice(`Summary of ${date} inserted!`);
      } else {
        await navigator.clipboard.writeText(summary);
        new Notice(`Summary of ${date} copied to clipboard!`);
      }

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Error:', error);
    }
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

    console.log(`[Yesterday Summarizer] Daily note opened: ${file.path}`);

    // Read the file content
    const content = await this.app.vault.read(file);

    // Check if target section exists
    const targetSection = this.settings.targetSection;
    const sectionIndex = content.indexOf(targetSection);
    if (sectionIndex === -1) {
      console.log(`[Yesterday Summarizer] Target section "${targetSection}" not found`);
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
          console.log(`[Yesterday Summarizer] Section already has content, skipping auto-summarize`);
          return;
        }
      }
    }

    console.log(`[Yesterday Summarizer] Section is empty, triggering auto-summarize`);

    // Get yesterday's date based on this file
    const yesterdayDate = this.getDayBefore(dateMatch);

    const loadingNotice = new Notice(`Auto-summarizing ${yesterdayDate}...`, 0);

    try {
      // Read yesterday's note
      const result = await this.readDailyNote(yesterdayDate);
      if (!result) {
        loadingNotice.hide();
        return;
      }

      const { date, content: yesterdayContent } = result;
      loadingNotice.setMessage(`Summarizing ${date} via Ollama...`);

      // Build prompt and call Ollama
      const fullPrompt = `Summarizing daily note from ${date}:\n\n${SUMMARIZE_PROMPT}${yesterdayContent}`;
      const summary = await callOllama(
        this.settings.ollamaEndpoint,
        this.settings.ollamaModel,
        fullPrompt
      );

      loadingNotice.hide();

      // Insert summary after the target section header
      await this.insertAtSection(file, targetSection, summary);
      new Notice(`Auto-summarized ${date}!`);

    } catch (error) {
      loadingNotice.hide();
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(`Auto-summarize error: ${errorMsg}`, 10000);
      console.error('[Yesterday Summarizer] Auto-summarize error:', error);
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

class YesterdaySummarizerSettingTab extends PluginSettingTab {
  plugin: YesterdaySummarizerPlugin;

  constructor(app: App, plugin: YesterdaySummarizerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Yesterday Summarizer Settings' });

    // Ollama Endpoint
    new Setting(containerEl)
      .setName('Ollama Endpoint')
      .setDesc('Ollama API endpoint (default: http://localhost:11434)')
      .addText(text => text
        .setPlaceholder('http://localhost:11434')
        .setValue(this.plugin.settings.ollamaEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.ollamaEndpoint = value;
          await this.plugin.saveSettings();
        }));

    // Ollama Model
    new Setting(containerEl)
      .setName('Ollama Model')
      .setDesc('Model to use with Ollama (e.g., llama3.2, mistral, phi3)')
      .addText(text => text
        .setPlaceholder('llama3.2')
        .setValue(this.plugin.settings.ollamaModel)
        .onChange(async (value) => {
          this.plugin.settings.ollamaModel = value;
          await this.plugin.saveSettings();
        }));

    // Daily Notes Folder
    new Setting(containerEl)
      .setName('Daily Notes Folder')
      .setDesc('Folder containing your daily notes')
      .addText(text => text
        .setPlaceholder('10_daily')
        .setValue(this.plugin.settings.dailyNotesFolder)
        .onChange(async (value) => {
          this.plugin.settings.dailyNotesFolder = value;
          await this.plugin.saveSettings();
        }));

    // Output Mode
    new Setting(containerEl)
      .setName('Output Mode')
      .setDesc('Where to put the generated summary (for manual command)')
      .addDropdown(dropdown => dropdown
        .addOption('cursor', 'Insert at cursor')
        .addOption('clipboard', 'Copy to clipboard')
        .setValue(this.plugin.settings.outputMode)
        .onChange(async (value: 'cursor' | 'clipboard') => {
          this.plugin.settings.outputMode = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Auto-Summarization' });

    // Auto-Summarize Toggle
    new Setting(containerEl)
      .setName('Auto-Summarize on File Open')
      .setDesc('Automatically summarize yesterday when opening a daily note (requires restart)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSummarize)
        .onChange(async (value) => {
          this.plugin.settings.autoSummarize = value;
          await this.plugin.saveSettings();
        }));

    // Target Section
    new Setting(containerEl)
      .setName('Target Section')
      .setDesc('Section header where auto-summary will be inserted (e.g., "## Yesterday\'s Highlights")')
      .addText(text => text
        .setPlaceholder("## Yesterday's Highlights")
        .setValue(this.plugin.settings.targetSection)
        .onChange(async (value) => {
          this.plugin.settings.targetSection = value;
          await this.plugin.saveSettings();
        }));
  }
}
