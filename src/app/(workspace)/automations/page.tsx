"use client";

import { usePawFlow } from "@/components/pawflow-provider";
import { AutomationToggleCard } from "@/components/pawflow-ui";

export default function AutomationsPage() {
  const { workspace, toggleAutomation } = usePawFlow();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {workspace.automations.map((automation) => (
        <AutomationToggleCard key={automation.id} automation={automation} onToggle={() => toggleAutomation(automation.key)} />
      ))}
    </div>
  );
}
