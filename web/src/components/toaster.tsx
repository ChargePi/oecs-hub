import { useToastStore } from '@/stores/toast-store'
import { ToastCard } from './toast-card'

/** Global toast stack - mounted once in main.tsx so it outlives any single route. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col-reverse items-center gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard
            title={toast.title}
            message={toast.message}
            severity={toast.severity}
            onDismiss={() => dismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
