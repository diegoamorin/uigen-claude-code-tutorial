import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => cleanup());

test("shows 'Creating' label for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("shows spinner while executing", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows green dot when completed", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result={{ success: true }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("shows 'Editing' label for str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/components/Counter.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing /components/Counter.jsx")).toBeDefined();
});

test("shows 'Editing' label for insert command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("shows 'Viewing' label for view command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Viewing /App.jsx")).toBeDefined();
});

test("shows 'Undoing edit in' label for undo_edit command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Undoing edit in /App.jsx")).toBeDefined();
});

test("shows 'Renaming' label for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/old.jsx", new_path: "/new.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming /old.jsx")).toBeDefined();
});

test("shows 'Deleting' label for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("falls back to raw toolName for unknown tools", () => {
  render(
    <ToolInvocationBadge
      toolName="unknown_tool"
      args={{}}
      state="call"
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});
