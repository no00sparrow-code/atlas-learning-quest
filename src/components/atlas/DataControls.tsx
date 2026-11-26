import { useEffect, useRef, useState } from "react";
import { CloudOff, Database, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAtlas } from "@/lib/atlas-store";
import { Button } from "@/components/ui/button";

/**
 * Data portability and the honest cloud status.
 * There is no fake "sign in" here: accounts need a configured backend.
 */
export function DataControls() {
  const { state, importProgress, updateProfile, recoveryBackup, clearRecoveryBackup } = useAtlas();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(state.name);
  const [handle, setHandle] = useState(state.handle);

  useEffect(() => {
    setName(state.name);
    setHandle(state.handle);
  }, [state.name, state.handle]);

  const exportBackup = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Could not create the backup on this device");
    }
  };

  const exportRecovery = () => {
    if (!recoveryBackup) return;
    try {
      const blob = new Blob([recoveryBackup], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `atlas-recovery-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Recovery copy downloaded");
    } catch {
      toast.error("Could not download the recovery copy");
    }
  };

  const importBackup = async (file: File) => {
    const text = await file.text();
    const result = importProgress(text);
    if (result.ok) toast.success("Backup restored");
    else toast.error(result.error ?? "Restore failed");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Database className="size-3.5" /> Your data
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Progress, saved lessons, memory and achievements live in this browser's storage. Export a
          backup before clearing site data or switching devices.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="glass" size="sm" onClick={exportBackup}>
            <Download /> Export backup
          </Button>
          <Button variant="glass" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload /> Restore backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Restore an Atlas backup"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importBackup(file);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {recoveryBackup && (
        <div role="alert" className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-bold">A previous progress file needs recovery</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Atlas could not safely read the previous local backup. The original file was kept
            separately and has not been discarded. Download a copy before clearing it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="glass" size="sm" onClick={exportRecovery}>
              <Download /> Download recovery copy
            </Button>
            <Button variant="glass" size="sm" onClick={clearRecoveryBackup}>
              Dismiss recovery copy
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Display name
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Display name"
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            aria-label="Handle"
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />
          <Button
            variant="glass"
            size="sm"
            className="h-10"
            onClick={() => {
              updateProfile(name, handle);
              toast.success("Profile updated");
            }}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/50 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <CloudOff className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-bold">Cloud sync: not enabled in this beta</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            There is no sign-in or cross-device sync yet. No fake account screen is shown. Local
            progress is the source of truth — export a backup before switching devices.
          </p>
        </div>
      </div>
    </div>
  );
}
