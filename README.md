# Yesterday Summarizer

An Obsidian plugin that summarizes yesterday's daily note using a local LLM (Ollama) to generate actionable insights for today's planning.

## Features

- **Manual Summarization**: Run command to summarize yesterday's note and insert at cursor or copy to clipboard
- **Auto-Summarization**: Automatically summarize when opening a daily note (configurable)
- **Privacy-First**: Uses local Ollama instance - your notes never leave your machine
- **Smart Date Detection**: Extracts date from filename, so "yesterday" is always relative to the note you're viewing

## Requirements

- [Ollama](https://ollama.ai/) installed and running locally
- A model pulled (default: `llama3.2`)

```bash
# Install Ollama, then pull a model
ollama pull llama3.2
```

## Installation

### From Community Plugins (Recommended)
1. Open Obsidian Settings > Community Plugins
2. Search for "Yesterday Summarizer"
3. Install and enable

### Manual Installation
1. Download `main.js`, `manifest.json` from the latest release
2. Create folder: `<vault>/.obsidian/plugins/yesterday-summarizer/`
3. Copy files into the folder
4. Enable plugin in Obsidian settings

## Usage

### Manual Command
1. Open today's daily note
2. Place cursor where you want the summary
3. Run command: `Cmd/Ctrl + P` → "Summarize Yesterday"

### Auto-Summarization
When enabled, opening a daily note will automatically:
1. Check if the target section exists (default: `## Yesterday's Highlights`)
2. If the section is empty, generate and insert yesterday's summary

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Ollama Endpoint | Ollama API URL | `http://localhost:11434` |
| Ollama Model | Model to use | `llama3.2` |
| Daily Notes Folder | Where your daily notes are stored | `10_daily` |
| Output Mode | Insert at cursor or copy to clipboard | `cursor` |
| Auto-Summarize | Auto-summarize on file open | `true` |
| Target Section | Section header for auto-summary | `## Yesterday's Highlights` |

## Daily Note Format

The plugin supports two filename formats:
- `YYYY-MM-DD.md` (e.g., `2024-01-15.md`)
- `YYYY-MM-DD – Journal.md` (e.g., `2024-01-15 – Journal.md`)

## Output Format

The summary is structured as:

```markdown
**Completed**:
- Tasks accomplished yesterday

**Incomplete**:
- Items started but not finished

**Blocked**:
- Things that got stuck

**Insights**:
- Patterns and learnings

**Today's Focus**:
1. Top priority
2. Second priority
3. Third priority
```

## Troubleshooting

### "Ollama error: fetch failed"
- Ensure Ollama is running: `ollama serve`
- Check endpoint in settings matches your Ollama URL

### "Note not found for YYYY-MM-DD"
- Verify your daily notes folder setting matches your vault structure
- Check that yesterday's note exists

### Summary not appearing
- Check Obsidian Developer Console (`Cmd+Option+I`) for error messages
- Verify the model is available: `ollama list`

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Report issues](https://github.com/xiaolong-y/obsidian-yesterday-summarizer/issues)
- [Source code](https://github.com/xiaolong-y/obsidian-yesterday-summarizer)
