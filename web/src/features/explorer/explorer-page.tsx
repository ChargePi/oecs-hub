import { Footer } from '@/components/layout/footer'
import { CHAT_ENABLED } from '@/lib/chat/config'
import { AiSection } from './ai-section'
import { AudienceSection } from './audience-section'
import { HeroSection } from './hero-section'

export function ExplorerPage() {
  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(var(--color-foreground)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] [mask-image:radial-gradient(ellipse_60%_35%_at_50%_15%,black,transparent)]" />
          <div className="absolute top-[-10rem] left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute bottom-[15%] left-1/2 h-[20rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />
        </div>
        <HeroSection />
        {CHAT_ENABLED && <AiSection />}
        <AudienceSection />
      </div>
      <Footer />
    </>
  )
}
