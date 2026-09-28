"use client";

import {
  Download,
  MessageSquare,
  Moon,
  PanelsTopLeft,
  Settings2,
  Sun,
  Trash2,
  Users,
} from "lucide-react";

export default function Header({
  mode,
  setMode,
  theme,
  toggleTheme,
  onOpenSettings,
  onExport,
  onClear,
  onToggleSidebar,
  hasMessages,
  keyReady,
  keyLabel,
}) {
  return (
    <header
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
          style={{ background: "var(--brand)" }}
        >
          TH
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-bold">AI Team Studio</h1>
          <p className="text-[11px]" style={{ color: "var(--faint)" }}>
            Token Harbor · OpenAI-compatible
          </p>
        </div>
      </div>

      <div
        className="ml-2 flex rounded-lg p-0.5"
        style={{ background: "var(--elevated)", border: "1px solid var(--line)" }}
      >
        {[
          { key: "single", label: "Single Chat", icon: MessageSquare },
          { key: "team", label: "AI Team", icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition"
            style={{
              background: mode === key ? "var(--panel)" : "transparent",
              color: mode === key ? "var(--ink)" : "var(--muted)",
              boxShadow: mode === key ? "var(--shadow)" : "none",
            }}
            onClick={() => setMode(key)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <span
        className="chip hidden sm:inline-flex"
        title={
          keyReady
            ? "At least one provider is connected"
            : "No API key set for this provider"
        }
        style={keyReady ? undefined : { color: "var(--warn)" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: keyReady ? "var(--ok)" : "var(--warn)" }}
        />
        {keyLabel || (keyReady ? "key ready" : "no key")}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <button className="btn btn-xs" onClick={onExport} disabled={!hasMessages}>
          <Download size={13} /> Export chat
        </button>
        <button className="btn btn-xs btn-ghost" onClick={onClear} disabled={!hasMessages}>
          <Trash2 size={13} />
        </button>
        <button className="btn btn-xs btn-ghost" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button className="btn btn-xs btn-ghost" onClick={onOpenSettings} title="Settings">
          <Settings2 size={14} />
        </button>
        <button
          className="btn btn-xs btn-ghost xl:hidden"
          onClick={onToggleSidebar}
          title="Toggle workspace panel"
        >
          <PanelsTopLeft size={14} />
        </button>
      </div>
    </header>
  );
}
