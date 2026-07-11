import { useRef, useState } from 'react';
import { Download, Upload, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';

interface DataControlsProps {
  capsuleCount: number;
}

export default function DataControls({ capsuleCount }: DataControlsProps) {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importCount, setImportCount] = useState(0);

  const importMutation = trpc.capsule.import.useMutation({
    onSuccess: (data) => {
      setImportStatus('success');
      setImportCount(data.inserted);
      utils.capsule.list.invalidate();
      utils.capsule.export.invalidate();
      setTimeout(() => setImportStatus('idle'), 3000);
    },
    onError: () => {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    },
  });

  const handleExport = async () => {
    try {
      const data = await utils.capsule.export.ensureData();
      if (!data) return;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkcapsule-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('导出失败 / Export failed');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        let items: Array<{
          title: string;
          url: string;
          color?: string;
          pinned?: boolean;
          createdAt?: string;
        }> = [];

        if (Array.isArray(json)) {
          items = json;
        } else if (json.data && Array.isArray(json.data)) {
          items = json.data;
        } else {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
          return;
        }

        const validItems = items
          .filter((item: Record<string, unknown>) => {
            const title = item.title || item.Title;
            const url = item.url || item.Url || item.URL || item.link || item.Link;
            return typeof title === 'string' && title.trim() && typeof url === 'string' && url.trim();
          })
          .map((item: Record<string, unknown>) => {
            const rawColor = item.color ?? item.Color;
            const rawPinned = item.pinned ?? item.Pinned;
            const rawCreatedAt = item.createdAt ?? item.CreatedAt ?? item.created_at;
            const rawDescription = item.description ?? item.Description;
            return {
              title: String(item.title || item.Title).trim(),
              url: String(item.url || item.Url || item.URL || item.link || item.Link).trim(),
              description: typeof rawDescription === 'string' ? rawDescription : undefined,
              color: typeof rawColor === 'string' ? rawColor : undefined,
              pinned: typeof rawPinned === 'boolean' ? rawPinned : undefined,
              createdAt: typeof rawCreatedAt === 'string' ? rawCreatedAt : undefined,
            };
          });

        if (validItems.length === 0) {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
          return;
        }

        importMutation.mutate({ items: validItems });
      } catch {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="glass-panel w-full max-w-[640px] rounded-xl p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-[#5200ff] shadow-[0_0_8px_#5200ff]" />
        <span
          className="text-xs tracking-[0.15em] text-white/50 uppercase"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Data Transfer
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={capsuleCount === 0}
          className="group relative flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-4 py-3 text-sm text-[#00f0ff] transition-all hover:border-[#00f0ff]/40 hover:bg-[#00f0ff]/10 disabled:cursor-not-allowed disabled:opacity-20"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <Download size={14} className="transition-transform group-hover:-translate-y-0.5" />
          <span>EXPORT JSON</span>
          <span className="ml-1 text-[10px] text-white/20">
            ({capsuleCount})
          </span>
        </button>

        {/* Import Button */}
        <button
          onClick={handleImportClick}
          className="group relative flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#ff1b8d]/20 bg-[#ff1b8d]/5 px-4 py-3 text-sm text-[#ff1b8d] transition-all hover:border-[#ff1b8d]/40 hover:bg-[#ff1b8d]/10"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {importMutation.isPending ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#ff1b8d] border-t-transparent" />
          ) : (
            <Upload size={14} className="transition-transform group-hover:-translate-y-0.5" />
          )}
          <span>{importMutation.isPending ? 'IMPORTING...' : 'IMPORT JSON'}</span>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Import JSON file"
        />
      </div>

      {/* Status messages */}
      {importStatus === 'success' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/5 px-3 py-2">
          <Check size={12} className="text-[#00ff88]" />
          <span
            className="text-xs text-[#00ff88]"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Successfully imported {importCount} capsule{importCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
      {importStatus === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertCircle size={12} className="text-red-400" />
          <span
            className="text-xs text-red-400"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Import failed. Please check your JSON file format.
          </span>
        </div>
      )}

      {/* Format hint */}
      <p
        className="mt-3 text-xs leading-relaxed text-white/35"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        Supports: LinkCapsule export format, array of objects, or objects with a `data` field.
        Required: `title`, `url`. Optional: `color`, `pinned`, `createdAt`.
      </p>
    </div>
  );
}
