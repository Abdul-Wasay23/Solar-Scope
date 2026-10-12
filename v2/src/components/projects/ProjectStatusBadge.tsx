import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import type { ProjectStatus } from "@/lib/projects/types";
import "./ProjectStatusBadge.css";

export type ProjectStatusBadgeProps = {
  status: ProjectStatus | string;
  className?: string;
};

type StatusConfig = {
  variant: BadgeVariant;
  label: string;
  showPulse?: boolean;
};

const STATUS_CONFIG_MAP: Record<string, StatusConfig> = {
  DRAFT: {
    variant: "warning",
    label: "Draft",
  },
  IN_PROGRESS: {
    variant: "info",
    label: "In Progress",
    showPulse: true,
  },
  COMPLETED: {
    variant: "success",
    label: "Completed",
  },
  ARCHIVED: {
    variant: "neutral",
    label: "Archived",
  },
};

export default function ProjectStatusBadge({
  status,
  className = "",
}: ProjectStatusBadgeProps) {
  const normalizedKey = (status || "").toString().toUpperCase().replace(/\s+/g, "_");
  const config = STATUS_CONFIG_MAP[normalizedKey] || {
    variant: "neutral",
    label: status || "Unknown",
  };

  return (
    <Badge variant={config.variant} className={className}>
      <span
        className={`project-status-dot ${config.showPulse ? "project-status-dot--in-progress" : ""}`}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </Badge>
  );
}
