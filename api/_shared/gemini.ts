const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

export function getGeminiUrl(apiKey: string) {
  const model = getGeminiModel();
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

function escapeControlCharsInStrings(input: string) {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (escaped) {
      output += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      output += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      output += ch;
      inString = !inString;
      continue;
    }

    if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
      output += ch === '\t' ? '\\t' : ch === '\r' ? '\\r' : '\\n';
      continue;
    }

    output += ch;
  }

  return output;
}

export function parseGeminiJson<T>(rawText: string): T {
  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw error;
    }

    const slice = rawText.slice(start, end + 1);

    try {
      return JSON.parse(slice) as T;
    } catch {
      const sanitized = escapeControlCharsInStrings(slice);
      return JSON.parse(sanitized) as T;
    }
  }
}
