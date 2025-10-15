interface StepperProps {
  currentStep: "submitted" | "in-block" | "finalized";
}

export function Stepper({ currentStep }: StepperProps) {
  const steps = [
    { id: "submitted", label: "Submitted" },
    { id: "in-block", label: "In block" },
    { id: "finalized", label: "Finalized" },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            index <= currentIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-secondary'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              index <= currentIndex ? 'bg-primary-foreground' : 'bg-border'
            }`} />
            <span className="text-xs">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-4 h-0.5 ${
              index < currentIndex ? 'bg-primary' : 'bg-border'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}