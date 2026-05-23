export function extractJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch { /* ignore */ }
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* ignore */ }
  }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* ignore */ }
  }
  // Fallback: try to extract key fields from malformed text
  return fallbackExtract(text);
}

function fallbackExtract(text: string): Record<string, unknown> | null {
  const getField = (key: string): string | undefined => {
    // Match "key": "value" or "key": "value with \"escapes\""
    const re = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*[,}]`);
    const m = text.match(re);
    return m?.[1];
  };
  const optimizedPrompt = getField('optimizedPrompt');
  if (!optimizedPrompt) return null;
  const explanation = getField('explanation') || '';
  // Try to extract suggestions array
  const sugMatch = text.match(/"suggestions"\s*:\s*\[([\s\S]*?)\]/);
  let suggestions: string[] = [];
  if (sugMatch?.[1]) {
    suggestions = [...sugMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((v): v is string => v !== undefined);
  }
  return { optimizedPrompt, explanation, suggestions };
}
