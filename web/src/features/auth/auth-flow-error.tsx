import { Button } from '@/components/ui/button'

export function AuthFlowError() {
  return (
    <div className="m-auto flex w-full max-w-md flex-col gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this page. Please try again.
      </p>
      <Button size="lg" className="self-center" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  )
}
