# Yesterday Summarizer

An Obsidian plugin that summarizes your daily notes using a local LLM (Ollama) to generate actionable insights. Supports daily, weekly, and monthly summaries with intelligent blocker detection and pattern recognition.

## Features

- **Daily Summary**: Extract completed tasks, blockers, energy/mood signals, and actionable focus items
- **Weekly Summary**: Synthesize patterns across 7 days with trajectory analysis
- **Monthly Summary**: Strategic overview with time investment analysis
- **Day Comparison**: Compare yesterday vs today for momentum tracking
- **Auto-Summarize**: Automatically generate summary when opening daily notes
- **Wikilink Preservation**: Maintains `[[links]]` to projects, people, and tools
- **Privacy-First**: Uses local Ollama - your notes never leave your machine
- **Smart Caching**: Skips unchanged content to save processing time

## Requirements

- [Ollama](https://ollama.ai/) installed and running locally
- A model pulled (recommended: `gemma3:12b`)

```bash
# Install Ollama, then pull a model
ollama pull gemma3:12b
```

### Recommended Models

| Model | Quality | Speed | Best For |
|-------|---------|-------|----------|
| `gemma3:12b` | 79/100 | 63s | Best balance (default) |
| `qwen2.5-coder:7b` | 77/100 | 38s | Fastest quality option |
| `deepseek-r1:latest` | 73/100 | 94s | Highest raw quality |

## Installation

### From Community Plugins (Recommended)
1. Open Obsidian Settings → Community Plugins
2. Search for "Yesterday Summarizer"
3. Install and enable

### Manual Installation
1. Download `main.js`, `manifest.json` from the [latest release](https://github.com/xiaolong-y/obsidian-yesterday-summarizer/releases)
2. Create folder: `<vault>/.obsidian/plugins/yesterday-summarizer/`
3. Copy files into the folder
4. Enable plugin in Obsidian settings

## Usage

### Commands

Open command palette (`Cmd/Ctrl + P`) and search for:

| Command | Description |
|---------|-------------|
| **Summarize yesterday** | Generate summary of previous day's note |
| **Summarize this week** | Synthesize patterns across 7 days |
| **Summarize this month** | Strategic monthly overview |
| **Compare yesterday vs today** | Track momentum between days |

### Auto-Summarization

When enabled, opening a daily note will automatically:
1. Check if the target section exists (default: `## Yesterday's Highlights`)
2. If the section is empty, generate and insert yesterday's summary
3. Skip if content hasn't changed since last summarization

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Ollama endpoint | Ollama API URL | `http://localhost:11434` |
| Ollama model | Model to use for summarization | `gemma3:12b` |
| Daily notes folder | Where your daily notes are stored | `10_daily` |
| Output mode | Insert at cursor or copy to clipboard | `cursor` |
| Detail level | Concise / Standard / Detailed | `standard` |
| Auto-summarize | Auto-summarize on file open | `true` |
| Target section | Section header for auto-summary | `## Yesterday's Highlights` |
| Week starts on | Monday or Sunday | `monday` |

## Daily Note Format

The plugin supports two filename formats:
- `YYYY-MM-DD.md` (e.g., `2026-01-15.md`)
- `YYYY-MM-DD – Journal.md` (e.g., `2026-01-15 – Journal.md`)

## Output Format

### Daily Summary
```markdown
**Completed**:
- Submitted project proposal (referral)
- Set up local dev environment

**Incomplete**:
- Resume updates (3 days stalled)
- Team PR review

**Blockers**:
- Resume: unclear what to highlight (clarity blocker)

**Energy & Mood**:
- Drained after morning meetings, energy recovered after lunch

**Insights**:
- Repeated avoidance on resume = needs clearer scope first

**Today's Focus**:
1. Define resume highlights (5 min brainstorm)
2. Review team PR
3. Start resume draft

**Quick Wins**:
- Outline 3 resume bullet points

**Mentioned**:
[[ProjectX]], [[Sarah]], [[Ollama]]
```

### Weekly Summary
```markdown
**Key Accomplishments**:
- Shipped [[ProjectX]] MVP
- Completed 3 job applications

**Open Threads**:
- [[BlogRedesign]] — 60% done, blocked on images

**Blockers & Friction**:
- Tax prep: avoidance pattern (mentioned 4x, 0 action)

**Energy Arc**:
- Mon-Tue high, Wed crashed, Thu-Fri recovering

**Themes & Patterns**:
- TIME: 60% on [[ProjectX]], 10% on [[JobSearch]]
- GAPS: Tax prep mentioned daily but never touched

**Trajectory**:
- Productivity: ↑
- Focus: scattered
- Energy: depleting

**Next Week's Intention**:
Close one thread completely before starting anything new.
```

## Blocker Detection

The plugin intelligently detects hidden blockers:

| Pattern | Blocker Type |
|---------|--------------|
| Task mentioned multiple days without progress | Avoidance blocker |
| "not sure", "unclear", "don't know" | Clarity blocker |
| "waiting on", "need X first" | Dependency blocker |
| Energy crashes preventing work | Energy blocker |

## Troubleshooting

### "Ollama error: fetch failed"
- Ensure Ollama is running: `ollama serve`
- Check endpoint in settings matches your Ollama URL

### "Model not found"
- Pull the model: `ollama pull gemma3:12b`
- Or change model in plugin settings

### "Note not found for YYYY-MM-DD"
- Verify your daily notes folder setting matches your vault structure
- Check that yesterday's note exists

### Summary quality issues
- Try `deepseek-r1:latest` for higher quality (slower)
- Use "Detailed" mode in settings for more comprehensive output
- Ensure your daily notes have structured content (tasks, notes sections)

### Check logs
- Open Obsidian Developer Console (`Cmd+Option+I`) for error messages

## Development

```bash
# Clone the repo
git clone https://github.com/xiaolong-y/obsidian-yesterday-summarizer.git
cd obsidian-yesterday-summarizer

# Install dependencies
npm install

# Build
npm run build

# Run benchmark
npx ts-node benchmark.ts
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Report issues](https://github.com/xiaolong-y/obsidian-yesterday-summarizer/issues)
- [Source code](https://github.com/xiaolong-y/obsidian-yesterday-summarizer)
