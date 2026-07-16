import { useRef, useState, type ChangeEvent } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  exportUniverseBackup,
  listUniverseBackups,
  restoreLatestAutomaticBackup,
  restoreUniverseBackup,
} from "@/features/dashboard/universe-storage";

export function LivingCodexDataSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [backups] = useState(() => listUniverseBackups(window.localStorage));
  const latest = backups[0];

  const download = () => {
    try {
      const backup = exportUniverseBackup(window.localStorage);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `living-codex-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Living Codex backup downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Living Codex backup failed.");
    }
  };

  const restored = () => {
    toast.success("Living Codex restored. Reloading CodexLB…");
    window.setTimeout(() => window.location.reload(), 400);
  };

  const restoreFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      restoreUniverseBackup(window.localStorage, JSON.parse(await file.text()));
      restored();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Living Codex restore failed.");
    } finally {
      event.target.value = "";
    }
  };

  const restoreAutomatic = () => {
    if (!window.confirm("Restore the latest automatic Living Codex backup? Your current data will be archived first.")) return;
    try {
      restoreLatestAutomaticBackup(window.localStorage);
      restored();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Living Codex restore failed.");
    }
  };

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Download className="h-4 w-4 text-primary" aria-hidden="true" /></div>
          <div><h3 className="text-sm font-semibold">Living Codex data</h3><p className="text-xs text-muted-foreground">Back up or restore your systems, planets, satellites, and camera state.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={download}><Download aria-hidden="true" />Download backup</Button>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" />Restore from file</Button>
          <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => void restoreFile(event)} />
          <Button type="button" variant="outline" disabled={!latest} onClick={restoreAutomatic}><RotateCcw aria-hidden="true" />Restore automatic backup</Button>
        </div>
        <p className="text-xs text-muted-foreground">{latest ? `Latest automatic backup: ${new Date(latest.createdAt).toLocaleString()} · ${latest.systemCount} systems · ${latest.planetCount} planets · ${latest.satelliteCount} satellites` : "Automatic backups begin when Living Codex data next changes."}</p>
      </div>
    </section>
  );
}
