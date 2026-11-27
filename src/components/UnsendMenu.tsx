import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { unsentText, type UnsendKind } from "../lib/messages";


/** Stop Escape here so it doesn't also close the chat popup behind the menu/dialog. */
const keepEscapeInside = (e: KeyboardEvent) => e.stopPropagation();

interface UnsendMenuProps {
  kind: UnsendKind;
  buddyName: string | null;
  onUnsend: () => Promise<void>;
  /** Classes for the wrapper, e.g. a max width for text bubbles */
  className?: string;
  /** The message bubble */
  children: React.ReactNode;
}

/**
 * Like "Unsend" in Messenger: a ⋯ next to your own message (on hover, always on
 * touch screens) opens "Fortryd afsendelse", which asks before unsending.
 */
export function UnsendMenu({ kind, buddyName, onUnsend, className = "", children }: UnsendMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unsending, setUnsending] = useState(false);
  const buddy = buddyName || "Din buddy";

  async function confirmUnsend() {
    if (unsending) return;
    setUnsending(true);
    try {
      await onUnsend();
      setConfirmOpen(false);
    } catch (err) {
      console.error("Error unsending message:", err);
      toast.error(
        kind === "highfive" ? "Kunne ikke fortryde highfive. Prøv igen." : `Kunne ikke fortryde beskeden. ${buddy} har måske lige læst den.`,
      );
      setConfirmOpen(false);
    } finally {
      setUnsending(false);
    }
  }

  return (
    <div className={`group flex items-center justify-end gap-1 ${className}`}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-gray-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label="Flere handlinger"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" onEscapeKeyDown={keepEscapeInside}>
          <DropdownMenuItem onSelect={() => setConfirmOpen(true)}>Fortryd afsendelse</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {children}

      <Dialog open={confirmOpen} onOpenChange={(open) => !unsending && setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-sm" onEscapeKeyDown={keepEscapeInside}>
          <DialogHeader>
            <DialogTitle>Fortryd afsendelse?</DialogTitle>
            <DialogDescription>
              {kind === "highfive"
                ? `Highfiven bliver fjernet for jer begge, og i chatten står der, at du har fortrudt den. ${buddy} kan have set den allerede.`
                : `Beskeden bliver fjernet for jer begge, og i chatten står der, at du har fortrudt den. Det kan du kun, så længe ${buddy} ikke har læst den.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={unsending}>
              Annuller
            </Button>
            <Button onClick={confirmUnsend} disabled={unsending}>
              {unsending ? "Fortryder..." : "Fortryd afsendelse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** What's left in the chat after a message or highfive was unsent. */
export function UnsentMessage({ kind, isMe, buddyName, size = "sm" }: { kind: UnsendKind; isMe: boolean; buddyName: string | null; size?: "sm" | "lg" }) {
  return (
    <div className={`rounded-2xl border border-gray-200 px-3 py-1.5 italic text-gray-500 ${size === "lg" ? "text-sm" : "text-xs"}`}>
      {unsentText(kind, isMe, buddyName)}
    </div>
  );
}
