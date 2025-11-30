import { Toaster as Sonner } from "sonner";
import { useTheme } from "../../utils/useTheme";

export function Toaster() {
  const { theme } = useTheme();
  const resolvedTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        },
      }}
      offset="96px"
    />
  );
}
