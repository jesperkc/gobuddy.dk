interface OnboardingStepperProps {
  step: number;
  total?: number;
  labels?: string[];
}

const defaultLabels = ["Detaljer", "Interesser", "Placering", "Opret konto"];

export function OnboardingStepper({ step, total = 4, labels = defaultLabels }: OnboardingStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < step;
          const isCurrent = stepNum === step;

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "bg-gray-900 text-white ring-4 ring-gray-200"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium hidden sm:block ${
                    isCurrent ? "text-gray-900" : isCompleted ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {labels[i]}
                </span>
              </div>

              {/* Connector line */}
              {stepNum < total && (
                <div className="flex-1 mx-2 sm:mx-3">
                  <div
                    className={`h-0.5 rounded-full transition-colors ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 text-center mt-3 sm:hidden">
        Trin {step} af {total}
      </p>
    </div>
  );
}
