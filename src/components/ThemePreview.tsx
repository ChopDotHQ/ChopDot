import React from 'react';

export function ThemePreview() {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="text-caption text-secondary mb-1">Primary</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
            <div className="w-6 h-6 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
            <div className="w-6 h-6 rounded" style={{ background: 'var(--ink)' }} />
          </div>
        </div>
        <div className="card p-3">
          <p className="text-caption text-secondary mb-1">Accents</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ background: 'var(--accent)' }} />
            <div className="w-6 h-6 rounded" style={{ background: 'var(--accent-pink-soft)' }} />
            <div className="w-6 h-6 rounded" style={{ background: 'var(--money)' }} />
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-section" style={{ fontWeight: 500 }}>Buttons</p>
        <div className="flex items-center gap-2">
          <button className="btn-primary px-3 py-2">Primary</button>
          <button className="btn-accent px-3 py-2">Accent</button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-section" style={{ fontWeight: 500 }}>Statuses</p>
        <div className="flex items-center gap-3">
          <span className="text-money font-medium">+$123.45</span>
          <span className="text-destructive font-medium">-$67.89</span>
          <span className="text-secondary">Muted label</span>
        </div>
      </div>
    </div>
  );
}


