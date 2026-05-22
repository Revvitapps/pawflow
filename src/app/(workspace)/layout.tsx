import { AppShell } from "@/components/app-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      title="Daily Flow"
      description="Run grooming, boarding, reminders, and customer care from one calm mobile-first workspace."
    >
      {children}
    </AppShell>
  );
}
