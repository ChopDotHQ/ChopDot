interface LinkButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function LinkButton({ children, onClick }: LinkButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center text-secondary underline p-0 bg-transparent text-label hover:text-foreground transition-all duration-200 active:scale-95"
    >
      {children}
    </button>
  );
}