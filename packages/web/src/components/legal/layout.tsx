import { Link } from "react-router-dom";
import { BrainCloudLogo } from "@/components/brand/logo";
import { Footer } from "@/components/homepage/footer";

interface LegalLayoutProps {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, effectiveDate, children }: LegalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-2 text-foreground hover:text-foreground/80">
            <BrainCloudLogo size={24} variant="full" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 md:py-12">
        <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Effective Date: {effectiveDate}</p>
          {children}
        </article>
      </main>

      <Footer />
    </div>
  );
}
