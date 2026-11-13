// Conservative speech-input cleanup. Never rewrite Pashto letters or diacritics
// without a documented, language-specific pronunciation rule.
export function normalizeSpeechText(text) {
  return String(text ?? '').normalize('NFC').replace(/[ \t\r\n]+/gu, ' ').trim();
}

// Optional neural voices must explicitly opt in after runtime validation.
// A neural failure never removes the existing local eSpeak route.
export async function speakWithFallback({ neural, fallback, text, options = {}, isCurrent = () => true }) {
  if (typeof fallback !== 'function') throw new TypeError('A working fallback voice is required');
  if (!isCurrent()) return { cancelled: true };
  if (typeof neural === 'function') {
    try {
      const result = await neural(text, options);
      if (!isCurrent()) return { cancelled: true };
      if (result && !result.cancelled && result.played === true)
        return { engine: 'neural', ...result };
    } catch (error) {
      if (!isCurrent()) return { cancelled: true };
      // An unavailable optional model must not block speech.
    }
  }
  if (!isCurrent()) return { cancelled: true };
  const result = await fallback(text, options);
  return { engine: 'espeak', ...result };
}
