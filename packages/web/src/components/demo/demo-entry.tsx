import { useEffect } from "react";
import { useDemo } from "@/lib/demo-context";

/** Route component for /demo — enters demo mode and redirects to dashboard */
export function DemoEntry() {
  const { enterDemo } = useDemo();

  useEffect(() => {
    enterDemo();
  }, [enterDemo]);

  return null;
}
