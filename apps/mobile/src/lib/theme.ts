import { dark, light, type Palette } from '@mozart/ui';
import { useApp } from '@/store/app';

export function useTheme(): Palette & { mode: 'dark' | 'light' } {
  const mode = useApp((s) => s.settings.theme);
  return { ...(mode === 'light' ? light : dark), mode };
}
