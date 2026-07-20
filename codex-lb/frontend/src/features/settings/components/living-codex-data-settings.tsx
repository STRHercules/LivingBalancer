import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  exportUniverseBackup,
  listUniverseRecoveryCandidates,
  listUniverseServerBackups,
  restoreUniverseBackup,
  restoreUniverseRecoveryCandidate,
  restoreUniverseServerBackup,
  saveUniverseToServerNow,
  saveUniverseToStorage,
} from "@/features/dashboard/universe-storage";

export function LivingCodexDataSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [recoveryPoints] = useState(() => listUniverseRecoveryCandidates(window.localStorage));
  const [recoveryId, setRecoveryId] = useState(() => recoveryPoints.reduce<(typeof recoveryPoints)[number] | undefined>((best, item) => !best || item.satelliteCount > best.satelliteCount ? item : best, undefined)?.id ?? "");
  const selectedRecovery = recoveryPoints.find(({ id }) => id === recoveryId);
  const [serverBackups, setServerBackups] = useState<Awaited<ReturnType<typeof listUniverseServerBackups>>>([]);
  const [serverBackupId, setServerBackupId] = useState("");

  useEffect(() => {
    let mounted = true;
    void listUniverseServerBackups().then((backups) => { if (mounted) { setServerBackups(backups); setServerBackupId(backups[0]?.id ?? ""); } }).catch(() => {});
    return () => { mounted = false; };
  }, []);

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
      const universe = restoreUniverseBackup(window.localStorage, JSON.parse(await file.text()));
      await saveUniverseToServerNow(universe, true);
      restored();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Living Codex restore failed.");
    } finally {
      event.target.value = "";
    }
  };

  const restoreAutomatic = async () => {
    if (!selectedRecovery || !window.confirm(`Restore this Living Codex recovery point (${selectedRecovery.systemCount} systems, ${selectedRecovery.planetCount} planets, ${selectedRecovery.satelliteCount} satellites)? Your current data will be archived first.`)) return;
    try {
      const universe = restoreUniverseRecoveryCandidate(window.localStorage, selectedRecovery.id);
      await saveUniverseToServerNow(universe, true);
      restored();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Living Codex restore failed.");
    }
  };

  const restoreServerBackup = async () => {
    const backup = serverBackups.find(({ id }) => id === serverBackupId);
    if (!backup || !window.confirm(`Restore this durable Living Codex backup (${backup.systemCount} systems, ${backup.planetCount} planets, ${backup.satelliteCount} satellites)?`)) return;
    try {
      const universe = await restoreUniverseServerBackup(backup.id);
      saveUniverseToStorage(window.localStorage, universe);
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
          <Button type="button" variant="outline" disabled={!selectedRecovery} onClick={() => void restoreAutomatic()}><RotateCcw aria-hidden="true" />Restore recovery point</Button>
        </div>
        {recoveryPoints.length ? <label className="grid gap-1 text-xs text-muted-foreground">Recovery point<select className="h-9 rounded-md border bg-background px-3 text-sm text-foreground" value={recoveryId} onChange={(event) => setRecoveryId(event.target.value)}>{recoveryPoints.map((point) => <option key={point.id} value={point.id}>{point.source === "automatic" ? new Date(point.createdAt).toLocaleString() : "Previous app version"} · {point.systemCount} systems · {point.planetCount} planets · {point.satelliteCount} satellites</option>)}</select></label> : <p className="text-xs text-muted-foreground">Automatic backups begin when Living Codex data next changes.</p>}
        {serverBackups.length ? <div className="grid gap-2 border-t pt-3"><label className="grid gap-1 text-xs text-muted-foreground">Durable server backup<select className="h-9 rounded-md border bg-background px-3 text-sm text-foreground" value={serverBackupId} onChange={(event) => setServerBackupId(event.target.value)}>{serverBackups.map((backup) => <option key={backup.id} value={backup.id}>{new Date(backup.savedAt).toLocaleString()} · {backup.systemCount} systems · {backup.planetCount} planets · {backup.satelliteCount} satellites</option>)}</select></label><Button type="button" variant="outline" onClick={() => void restoreServerBackup()}><RotateCcw aria-hidden="true" />Restore durable backup</Button></div> : null}
      </div>
    </section>
  );
}
