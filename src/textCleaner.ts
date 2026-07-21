export type SymbolWidth = "none" | "fullwidth" | "halfwidth";

export interface CustomRegexOptions {
  enabled: boolean;
  pattern: string;
  replacement: string;
  flags: string;
}

export interface TextCleaningOptions {
  cleanHtml: boolean;
  removeSpaces: boolean;
  removeLineBreaks: boolean;
  symbolWidth: SymbolWidth;
  prefixApostrophe: boolean;
  customRegex: CustomRegexOptions;
}

export interface TextCleaningResult {
  value: string;
  error?: string;
}

export const defaultTextCleaningOptions: TextCleaningOptions = {
  cleanHtml: false,
  removeSpaces: false,
  removeLineBreaks: false,
  symbolWidth: "none",
  prefixApostrophe: false,
  customRegex: {
    enabled: false,
    pattern: "",
    replacement: "",
    flags: "g",
  },
};

export function cleanClipboardText(input: string, options: TextCleaningOptions): TextCleaningResult {
  let value = input;

  if (options.cleanHtml) {
    value = cleanHtml(value);
  }
  if (options.removeSpaces) {
    value = value.replace(/[ \u00a0\u3000]+/g, "");
  }
  if (options.removeLineBreaks) {
    value = value.replace(/\r\n|\r|\n/g, "");
  }
  if (options.symbolWidth === "fullwidth") {
    value = toFullwidth(value);
  }
  if (options.symbolWidth === "halfwidth") {
    value = toHalfwidth(value);
  }
  if (options.prefixApostrophe) {
    value = prefixEachTabularCell(value);
  }
  if (!options.customRegex.enabled || !options.customRegex.pattern) {
    return { value };
  }

  try {
    const flags = normalizeRegexFlags(options.customRegex.flags);
    return {
      value: value.replace(
        new RegExp(options.customRegex.pattern, flags),
        decodeReplacementEscapes(options.customRegex.replacement),
      ),
    };
  } catch (error) {
    return {
      value,
      error: `正则表达式无效：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function cleanHtml(value: string): string {
  if (!/<\/?[a-z][^>]*>/i.test(value)) {
    return value;
  }

  const htmlFragment = extractClipboardHtmlFragment(value);
  const withoutMarkup = htmlFragment
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<\s*(?:script|style)\b[^>]*>[^]*?<\s*\/\s*(?:script|style)\s*>/gi, "")
    .replace(/<\s*br\b[^>]*>/gi, "\n")
    .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:td|th)\s*>/gi, "\t")
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(withoutMarkup)
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractClipboardHtmlFragment(value: string): string {
  const fragment = value.match(/<!--\s*StartFragment\s*-->([^]*?)<!--\s*EndFragment\s*-->/i);
  if (fragment) {
    return fragment[1];
  }

  const startMatch = value.match(/^StartHTML:(\d+)$/im);
  const endMatch = value.match(/^EndHTML:(\d+)$/im);
  if (!startMatch || !endMatch) {
    return value;
  }

  const start = Number.parseInt(startMatch[1], 10);
  const end = Number.parseInt(endMatch[1], 10);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start) {
    return value;
  }

  const encoded = new TextEncoder().encode(value);
  if (end > encoded.length) {
    return value;
  }
  return new TextDecoder().decode(encoded.slice(start, end));
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, token: string) => {
    const lowerToken = token.toLowerCase();
    if (lowerToken in namedEntities) {
      return namedEntities[lowerToken];
    }
    const numeric = lowerToken.startsWith("#x")
      ? Number.parseInt(lowerToken.slice(2), 16)
      : lowerToken.startsWith("#")
        ? Number.parseInt(lowerToken.slice(1), 10)
        : Number.NaN;
    if (!Number.isFinite(numeric)) {
      return entity;
    }
    try {
      return String.fromCodePoint(numeric);
    } catch {
      return entity;
    }
  });
}

function toFullwidth(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    if (isAsciiPunctuation(code)) {
      return String.fromCharCode(code + 0xfee0);
    }
    if (character === "¥") {
      return "￥";
    }
    return character;
  }).join("");
}

function toHalfwidth(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    if (isFullwidthPunctuation(code)) {
      return String.fromCharCode(code - 0xfee0);
    }
    if (character === "￥") {
      return "¥";
    }
    return character;
  }).join("");
}

function isAsciiPunctuation(code: number): boolean {
  return (code >= 0x21 && code <= 0x2f)
    || (code >= 0x3a && code <= 0x40)
    || (code >= 0x5b && code <= 0x60)
    || (code >= 0x7b && code <= 0x7e);
}

function isFullwidthPunctuation(code: number): boolean {
  const halfwidthCode = code - 0xfee0;
  return code >= 0xff01 && code <= 0xff5e && isAsciiPunctuation(halfwidthCode);
}

function prefixEachTabularCell(value: string): string {
  return value
    .split(/(\r\n|\r|\n)/)
    .map((segment) => {
      if (segment === "\r\n" || segment === "\r" || segment === "\n") {
        return segment;
      }
      return segment
        .split("\t")
        .map((cell) => cell && !cell.startsWith("'") ? `'${cell}` : cell)
        .join("\t");
    })
    .join("");
}

function normalizeRegexFlags(flags: string): string {
  const uniqueFlags = Array.from(new Set(flags.toLowerCase().split("")));
  const unsupported = uniqueFlags.find((flag) => !"dgimsuvy".includes(flag));
  if (unsupported) {
    throw new Error(`不支持的标记“${unsupported}”`);
  }
  return uniqueFlags.join("");
}

function decodeReplacementEscapes(replacement: string): string {
  return replacement.replace(/\\([\\tnr])/g, (_match, escape: string) => {
    if (escape === "t") {
      return "\t";
    }
    if (escape === "n") {
      return "\n";
    }
    if (escape === "r") {
      return "\r";
    }
    return "\\";
  });
}
