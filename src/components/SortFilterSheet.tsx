import { Check } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

export interface SortOption {
  id: string;
  label: string;
  description?: string;
}

interface SortFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  options: SortOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  title?: string;
}

export function SortFilterSheet({
  isOpen,
  onClose,
  options,
  selectedId,
  onSelect,
  title = "Sort by",
}: SortFilterSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pt-3 pb-4">
        <h2 className="text-center mb-3 text-body" style={{ fontWeight: 600 }}>
          {title}
        </h2>

        <div className="space-y-0.5">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id);
                onClose();
              }}
              className="w-full px-3 py-2.5 rounded-lg flex items-center justify-between transition-all duration-200 active:scale-[0.98]"
              style={{
                background: selectedId === option.id ? 'rgba(230, 0, 122, 0.06)' : 'transparent',
              }}
            >
              <div className="flex-1 text-left">
                <p
                  className="text-body"
                  style={{
                    fontWeight: selectedId === option.id ? 500 : 400,
                    color: selectedId === option.id ? 'var(--accent-pink)' : 'var(--ink)',
                  }}
                >
                  {option.label}
                </p>
                {option.description && (
                  <p className="text-caption" style={{ color: 'var(--muted)' }}>
                    {option.description}
                  </p>
                )}
              </div>
              {selectedId === option.id && (
                <div
                  className="w-5 h-5 flex items-center justify-center ml-2 flex-shrink-0"
                  style={{ 
                    background: 'var(--accent-pink)',
                    borderRadius: '50%',
                  }}
                >
                  <Check className="w-3.5 h-3.5" style={{ color: 'var(--card)' }} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
