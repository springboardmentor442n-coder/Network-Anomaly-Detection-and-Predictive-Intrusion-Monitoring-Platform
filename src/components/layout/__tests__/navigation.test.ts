import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/components/layout/Sidebar';

/**
 * Guards the eight required pages: every navigation entry must point at a real
 * App Router route, and every route must be reachable from the sidebar.
 */
describe('sidebar navigation', () => {
  const appDir = path.resolve(process.cwd(), 'src', 'app');

  it('lists the eight project pages', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      'Security Dashboard',
      'Dataset Analysis',
      'Model Training',
      'Model Evaluation',
      'Threat Detection',
      'Security Alerts',
      'Reports',
      'About Project',
    ]);
  });

  it('uses unique hrefs and gives every item a label, description and icon', () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    NAV_ITEMS.forEach((item) => {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
    });
  });

  it('points every entry at an App Router page that exists on disk', () => {
    NAV_ITEMS.forEach((item) => {
      const pageFile =
        item.href === '/'
          ? path.join(appDir, 'page.tsx')
          : path.join(appDir, item.href.replace(/^\//, ''), 'page.tsx');
      expect(fs.existsSync(pageFile), `${item.href} should have a page.tsx`).toBe(true);
    });
  });
});
