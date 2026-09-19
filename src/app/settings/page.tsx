'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useUIStore } from '@/stores/ui-store';

export default function SettingsPage() {
  const {
    theme,
    fontSize,
    autoScrollSpeed,
    setTheme,
    setFontSize,
    setAutoScrollSpeed,
  } = useUIStore();

  return (
    <div className="container mx-auto p-4 max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Settings</h1>
        <p className="text-sm text-textSecondary mt-1">
          Customize stage display, readability, and performance preferences
        </p>
      </div>

      <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-textPrimary">Stage Preferences</CardTitle>
          <CardDescription className="text-textSecondary">
            Settings persist locally across sessions on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode" className="text-textPrimary font-medium text-base">
                Dark Mode
              </Label>
              <p className="text-xs text-textSecondary">
                High-contrast stage mode with dark background
              </p>
            </div>
            <Switch
              id="dark-mode"
              aria-label="Dark Mode"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {/* Font Size Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="text-textPrimary font-medium">
                Default Font Size
              </Label>
              <span className="text-sm font-mono text-stageAccent font-semibold">
                {fontSize}px
              </span>
            </div>
            <Slider
              id="font-size"
              aria-label="Default Font Size"
              value={[fontSize]}
              onValueChange={([v]) => {
                if (typeof v === 'number') setFontSize(v);
              }}
              min={12}
              max={32}
              step={2}
            />
            <div className="flex justify-between text-xs text-textSecondary">
              <span>12px (Small)</span>
              <span>20px (Medium)</span>
              <span>32px (Stage)</span>
            </div>
          </div>

          {/* Auto-Scroll Speed Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="scroll-speed" className="text-textPrimary font-medium">
                Auto-Scroll Speed
              </Label>
              <span className="text-sm font-mono text-stageAccent font-semibold">
                {autoScrollSpeed}px/s
              </span>
            </div>
            <Slider
              id="scroll-speed"
              aria-label="Auto-Scroll Speed"
              value={[autoScrollSpeed]}
              onValueChange={([v]) => {
                if (typeof v === 'number') setAutoScrollSpeed(v);
              }}
              min={10}
              max={150}
              step={5}
            />
            <div className="flex justify-between text-xs text-textSecondary">
              <span>10px/s (Slow)</span>
              <span>75px/s (Moderate)</span>
              <span>150px/s (Fast)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
