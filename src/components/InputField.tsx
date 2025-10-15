interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  compact?: boolean; // New prop for even tighter spacing
}

export function InputField({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder, 
  error, 
  disabled,
  compact = false,
}: InputFieldProps) {
  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
      <label className="text-label text-secondary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`px-3 input-field focus:outline-none focus-ring-pink disabled:opacity-50 text-body transition-all duration-200 ${
          compact ? "py-2" : "py-2.5"
        }`}
      />
      {error && <span className="text-label text-destructive">{error}</span>}
    </div>
  );
}