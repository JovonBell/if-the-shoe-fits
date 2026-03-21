'use client'

const STEPS = ['instructions', 'camera', 'processing', 'results'] as const
type WizardStep = (typeof STEPS)[number]

interface Props {
  currentStep: WizardStep
}

export function StepIndicator({ currentStep }: Props) {
  const currentIndex = STEPS.indexOf(currentStep)

  return (
    <div className="flex items-center justify-center gap-4 py-4" aria-label="Scan progress">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex
        const isCompleted = i < currentIndex

        return (
          <div key={step} className="flex items-center gap-4">
            <div
              className={`rounded-full transition-colors duration-200 ${
                isActive
                  ? 'bg-maroon w-3 h-3'
                  : isCompleted
                    ? 'w-2 h-2 border-2 border-maroon bg-transparent'
                    : 'w-2 h-2 bg-gray-200'
              }`}
              aria-current={isActive ? 'step' : undefined}
            />
            {i < STEPS.length - 1 && (
              <div
                className={`w-6 h-0.5 ${
                  i < currentIndex ? 'bg-maroon' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
