import { Button } from "@/components/ui/button";
import { BrainCloudLogo } from "@/components/brand/logo";
import { APP_URL } from "@/lib/config";

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-4 pt-20 pb-16 text-center md:pt-32 md:pb-24">
      <BrainCloudLogo size={64} className="text-primary" />
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
        Your second brain for developer decisions
      </h1>
      <p className="max-w-lg text-lg text-muted-foreground">
        Capture thoughts, log decisions, review outcomes, and improve over time.
        Brain Cloud gives you a structured loop for learning from your own work.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <a href={`${APP_URL}login`}>Get Started</a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href="#privacy">See what we track</a>
        </Button>
      </div>
    </section>
  );
}
