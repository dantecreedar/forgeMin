import React from 'react';

/**
 * Parses a string and converts plain URLs and Markdown-style links [text](url) into clickable React elements.
 */
export function renderFormattedText(text: string): React.ReactNode[] | string {
  if (!text) return '';

  const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\))|(https?:\/\/[^\s\)]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    if (match[1]) {
      // Markdown link: [label](url)
      const label = match[2];
      const url = match[3];
      parts.push(
        <a
          key={matchIndex}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline font-semibold break-all"
        >
          {label}
        </a>
      );
    } else {
      // Plain URL
      const url = match[4];
      parts.push(
        <a
          key={matchIndex}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline font-semibold break-all"
        >
          {url}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
