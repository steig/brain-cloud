import { Link } from "react-router-dom";
import { BrainCloudLogo } from "@/components/brand/logo";

export function Footer() {
  return (
    <footer className="border-t px-4 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-sm text-muted-foreground">
        <BrainCloudLogo size={16} />
        <span>Brain Cloud &copy; {new Date().getFullYear()}</span>
      </div>
      <div className="mx-auto mt-3 flex max-w-5xl items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
      </div>
    </footer>
  );
}
