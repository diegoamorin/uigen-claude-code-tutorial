"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const path = args.path as string | undefined;

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return `Creating ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      case "view":
        return `Viewing ${path}`;
      case "undo_edit":
        return `Undoing edit in ${path}`;
      default:
        return `Editing ${path}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "rename":
        return `Renaming ${path}`;
      case "delete":
        return `Deleting ${path}`;
      default:
        return `Managing ${path}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({
  toolName,
  args,
  state,
  result,
}: ToolInvocationBadgeProps) {
  const label = getLabel(toolName, args);
  const isCompleted = state === "result" && result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
