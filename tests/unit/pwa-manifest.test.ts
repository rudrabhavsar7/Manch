import { describe, it, expect } from 'vitest';
import manifest from '../../public/manifest.json';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest Configuration', () => {
  it('should have required manifest properties', () => {
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/dashboard');
    expect(manifest.background_color).toBe('#0C0C0E');
    expect(manifest.theme_color).toBe('#0C0C0E');
  });

  it('should specify icons correctly', () => {
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    
    const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i) => i.sizes === '512x512');
    
    expect(icon192).toBeDefined();
    expect(icon192?.type).toBe('image/png');
    
    expect(icon512).toBeDefined();
    expect(icon512?.type).toBe('image/png');
  });

  it('should have placeholder icons generated in public directory', () => {
    const icon192Exists = fs.existsSync(path.join(process.cwd(), 'public', 'icons', 'icon-192.png'));
    const icon512Exists = fs.existsSync(path.join(process.cwd(), 'public', 'icons', 'icon-512.png'));
    
    expect(icon192Exists).toBe(true);
    expect(icon512Exists).toBe(true);
  });
});
