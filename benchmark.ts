// Benchmark script to test summarization quality across models
// Run with: npx ts-node benchmark.ts

const MODELS = [
  'deepseek-r1:8b',
  'gemma3:12b',
  'qwen2.5-coder:7b',
  'deepseek-r1:latest',
  'vault-writer:latest'
];

const OLLAMA_ENDPOINT = 'http://localhost:11434';

const SAMPLE_JOURNAL = `
## Tasks
- [x] Applied to Meta via referral from Sarah
- [x] Set up Ollama locally for offline LLM work
- [x] Read 3 papers on RLHF fine-tuning
- [ ] Finish resume updates for Google
- [ ] Review PR from team
- [ ] Call mom about Orlando trip

## Notes
Feeling pretty drained after the Meta application—took way longer than expected. The referral process was confusing and I had to chase down Sarah twice.

Ollama setup went smoothly though! Excited to have local LLMs for private work. Tested deepseek-r1 and it's surprisingly capable.

Noticed I keep pushing off the resume updates. Third day in a row. Maybe I'm avoiding it because I'm not sure what to highlight. Need to just start.

Energy crashed around 3pm—too much coffee this morning probably. Switched to reading papers which felt more manageable.
`;

// Updated prompt with few-shot example
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

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function callOllama(model: string, prompt: string): Promise<{ response: string; durationMs: number }> {
  const start = Date.now();

  const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.4,  // Slightly lower for more consistent output
        top_p: 0.9,
        num_predict: 700
      }
    })
  });

  const data = await response.json();
  const durationMs = Date.now() - start;

  return {
    response: stripThinkTags(data.response || ''),
    durationMs
  };
}

function scoreOutput(output: string): { score: number; breakdown: Record<string, number>; details: string[] } {
  const breakdown: Record<string, number> = {};
  const details: string[] = [];
  const lower = output.toLowerCase();

  // Check for required sections (flexible matching)
  const sectionPatterns = [
    { name: 'Completed', pattern: /\*\*(Completed|Done|Finished)[^*]*\*\*/i },
    { name: 'Incomplete', pattern: /\*\*(Incomplete|Pending|Todo|Open)[^*]*\*\*/i },
    { name: 'Blockers', pattern: /\*\*(Blocker|Block|Obstacle)[^*]*\*\*/i },
    { name: 'Energy', pattern: /\*\*(Energy|Mood)[^*]*\*\*/i },
    { name: 'Insights', pattern: /\*\*(Insight|Pattern|Learning)[^*]*\*\*/i },
    { name: 'Focus', pattern: /\*\*(Focus|Today|Priority|Next)[^*]*\*\*/i },
    { name: 'QuickWins', pattern: /\*\*(Quick|Win|Small)[^*]*\*\*/i },
    { name: 'Mentioned', pattern: /\*\*(Mention|Reference|Link)[^*]*\*\*/i }
  ];
  const foundSections = sectionPatterns.filter(s => s.pattern.test(output)).map(s => s.name);
  breakdown.sectionsPresent = Math.round(Math.min(foundSections.length, 6) / 6 * 20);
  details.push(`Sections: ${foundSections.length}/8 (${foundSections.join(', ')})`);

  // Check for paraphrasing (penalize verbatim copies)
  const verbatimPhrases = [
    'Applied to Meta via referral',
    'Set up Ollama locally',
    'Finish resume updates',
    'Review PR from team',
    'Call mom about Orlando'
  ];
  const verbatimCount = verbatimPhrases.filter(p => output.includes(p)).length;
  breakdown.paraphrasing = Math.max(0, 25 - verbatimCount * 5);
  if (verbatimCount > 0) {
    details.push(`Verbatim copies: ${verbatimCount} phrases`);
  } else {
    details.push('Paraphrasing: excellent');
  }

  // Check for blockers detection (expanded keywords + patterns)
  const blockerPatterns = [
    /avoid(ance|ing|ed)?/i, /unclear/i, /not sure/i, /resistance/i, /paralysis/i,
    /stuck/i, /stall(ed|ing)?/i, /delay(ed|ing)?/i, /postpone/i, /block(ing|ed|er)?/i,
    /waiting/i, /third day/i, /3[- ]?day/i, /pattern/i, /keep pushing/i,
    /haven't started/i, /clarity/i, /what to highlight/i, /recurring/i
  ];
  const blockersMentioned = blockerPatterns.filter(p => p.test(lower)).length;
  breakdown.blockerDetection = Math.min(20, blockersMentioned * 3);
  details.push(`Blocker patterns matched: ${blockersMentioned}`);

  // Check for energy/mood detection (expanded)
  const moodKeywords = [
    'drained', 'crash', 'excited', 'fatigue', 'energy',
    'frustrated', 'confusing', 'smoothly', 'exhausted', 'tired',
    'motivated', 'overwhelmed', 'manageable', 'coffee'
  ];
  const moodMentioned = moodKeywords.filter(k => lower.includes(k)).length;
  breakdown.moodDetection = Math.min(20, moodMentioned * 4);
  details.push(`Mood keywords found: ${moodMentioned}`);

  // Check for insight quality (should identify the resume avoidance pattern)
  const insightPatterns = [
    /pattern/i, /avoid(ance)?/i, /third day/i, /3[- ]?day/i, /keep/i, /repeated(ly)?/i,
    /unclear.+highlight/i, /need.+break/i, /scope/i, /direction/i,
    /recurring/i, /suggest/i, /signal/i, /uncertainty/i, /clarity blocker/i
  ];
  const insightsMentioned = insightPatterns.filter(p => p.test(lower)).length;
  breakdown.insightQuality = Math.min(15, insightsMentioned * 2);
  details.push(`Insight patterns: ${insightsMentioned}`);

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score, breakdown, details };
}

async function benchmark() {
  console.log('='.repeat(80));
  console.log('SUMMARIZATION BENCHMARK v2 (with few-shot example)');
  console.log('='.repeat(80));
  console.log('');

  const results: Array<{
    model: string;
    durationMs: number;
    score: number;
    breakdown: Record<string, number>;
    details: string[];
    output: string;
  }> = [];

  for (const model of MODELS) {
    console.log(`\nTesting: ${model}`);
    console.log('-'.repeat(40));

    try {
      const fullPrompt = `Summarizing daily note:\n\n${SUMMARIZE_PROMPT}${SAMPLE_JOURNAL}`;
      const { response, durationMs } = await callOllama(model, fullPrompt);
      const { score, breakdown, details } = scoreOutput(response);

      results.push({ model, durationMs, score, breakdown, details, output: response });

      console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);
      console.log(`Score: ${score}/100`);
      console.log(`Breakdown:`, breakdown);
      console.log(`Details:`, details.join(' | '));
      console.log(`\nOutput:\n${response.slice(0, 800)}${response.length > 800 ? '...' : ''}`);
    } catch (error) {
      console.log(`ERROR: ${error}`);
      results.push({ model, durationMs: 0, score: 0, breakdown: {}, details: [], output: `Error: ${error}` });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(80));

  // Sort by score (quality first)
  const byQuality = [...results].filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  const byEfficiency = [...results].filter(r => r.score > 0).sort((a, b) => (b.score / b.durationMs) - (a.score / a.durationMs));

  console.log('\nRanked by QUALITY:');
  byQuality.forEach((r, i) => {
    console.log(`${i + 1}. ${r.model.padEnd(25)} Score: ${r.score}/100  Time: ${(r.durationMs/1000).toFixed(1)}s`);
  });

  console.log('\nRanked by EFFICIENCY (quality/speed):');
  byEfficiency.forEach((r, i) => {
    const efficiency = (r.score / (r.durationMs / 1000)).toFixed(2);
    console.log(`${i + 1}. ${r.model.padEnd(25)} ${efficiency} pts/sec (Score: ${r.score}, Time: ${(r.durationMs/1000).toFixed(1)}s)`);
  });

  console.log('\n' + '-'.repeat(40));
  console.log('RECOMMENDATIONS:');
  console.log(`  Best quality: ${byQuality[0]?.model || 'None'}`);
  console.log(`  Best efficiency: ${byEfficiency[0]?.model || 'None'}`);
  console.log(`  Fastest: ${[...results].sort((a, b) => a.durationMs - b.durationMs)[0]?.model || 'None'}`);
}

benchmark().catch(console.error);
