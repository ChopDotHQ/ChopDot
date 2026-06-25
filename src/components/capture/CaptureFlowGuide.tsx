type CaptureFlowStep = 'record' | 'pay' | 'mark' | 'confirm';

type CaptureFlowGuideProps = {
  current: CaptureFlowStep;
};

const steps: Array<{ id: CaptureFlowStep; label: string; helper: string }> = [
  {
    id: 'record',
    label: 'Record split',
    helper: 'Create the shares',
  },
  {
    id: 'pay',
    label: 'Use payment app',
    helper: 'Use your payment app',
  },
  {
    id: 'mark',
    label: 'Mark paid',
    helper: 'Tell the group',
  },
  {
    id: 'confirm',
    label: 'Confirm received',
    helper: 'Receiver closes the share',
  },
];

export function CaptureFlowGuide({ current }: CaptureFlowGuideProps) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <section
      className="rounded-[1.1rem] bg-white border border-border p-3"
      data-testid="capture-flow-guide"
      aria-label="Payment progress"
    >
      <div className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const isDone = index < currentIndex;
          const isActive = step.id === current;
          return (
            <div
              key={step.id}
              className="min-w-0"
              data-testid={`capture-flow-step-${step.id}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className={`h-1.5 rounded-full ${
                  isActive || isDone ? 'bg-accent' : 'bg-muted/20'
                }`}
              />
              <p
                className={`mt-2 text-[11px] leading-tight font-medium ${
                  isActive ? 'text-foreground' : 'text-secondary'
                }`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-secondary">{step.helper}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-caption text-secondary" data-testid="capture-flow-boundary">
        Mark paid tells the group you paid. The receiver still confirms money arrived.
      </p>
    </section>
  );
}
