import { Hero } from "./hero";
import { Features } from "./features";
import { Privacy } from "./privacy";
import { Footer } from "./footer";

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <Features />
      <Privacy />
      <Footer />
    </div>
  );
}
