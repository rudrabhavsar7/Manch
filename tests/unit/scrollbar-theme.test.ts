import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Global Theme Scrollbars', () => {
  const cssPath = path.resolve(__dirname, '../../src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines scrollbar tokens in :root and .dark', () => {
    expect(cssContent).toContain('--scrollbar-track: transparent;');
    expect(cssContent).toContain('--scrollbar-thumb: rgba(107, 107, 112, 0.28);');
    expect(cssContent).toContain('--scrollbar-thumb-hover: #B8862D;');
    expect(cssContent).toContain('--scrollbar-thumb: rgba(138, 138, 143, 0.28);');
    expect(cssContent).toContain('--scrollbar-thumb-hover: #E2B55A;');
  });

  it('applies scrollbar-width and scrollbar-color globally', () => {
    expect(cssContent).toContain('scrollbar-width: thin;');
    expect(cssContent).toContain('scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);');
    expect(cssContent).toContain('scrollbar-color: var(--scrollbar-thumb-hover) var(--scrollbar-track);');
  });

  it('configures webkit custom scrollbar pseudo-elements', () => {
    expect(cssContent).toContain('::-webkit-scrollbar {');
    expect(cssContent).toContain('::-webkit-scrollbar-thumb {');
    expect(cssContent).toContain('::-webkit-scrollbar-thumb:hover {');
    expect(cssContent).toContain('background-color: var(--scrollbar-thumb-hover);');
    expect(cssContent).toContain('::-webkit-scrollbar-corner {');
  });

  it('preserves scrollbar-none and adds scrollbar-thin utilities', () => {
    expect(cssContent).toContain('.scrollbar-none {');
    expect(cssContent).toContain('scrollbar-width: none !important;');
    expect(cssContent).toContain('.scrollbar-thin {');
  });
});
