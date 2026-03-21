'use client'

interface StepCardProps {
  icon: React.ReactNode
  title: string
  description: string
  variant?: 'default' | 'warning'
}

export function StepCard({ icon, title, description, variant = 'default' }: StepCardProps) {
  const cardStyles =
    variant === 'warning'
      ? 'bg-yellow-50 border-l-4 border-amber-600'
      : 'bg-cream-dark'

  return (
    <div
      className={`${cardStyles} rounded-lg p-4 flex gap-4 items-start`}
      role="article"
    >
      <div className="shrink-0 w-8 h-8 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-heading font-semibold text-dark text-lg leading-snug">
          {title}
        </h3>
        <p className="font-body text-dark/80 text-base mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
