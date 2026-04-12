import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ProfilePhotoDialogProps {
  avatarUrl: string | null | undefined;
  name: string | null | undefined;
  initials: string;
  avatarClassName?: string;
  fallbackClassName?: string;
}

export function ProfilePhotoDialog({
  avatarUrl,
  name,
  initials,
  avatarClassName = "h-16 w-16 text-2xl",
  fallbackClassName = "bg-blue-100 text-blue-700",
}: ProfilePhotoDialogProps) {
  const [open, setOpen] = useState(false);
  const hasPhoto = !!avatarUrl;

  return (
    <>
      <Avatar
        className={`${avatarClassName} ${hasPhoto ? "cursor-pointer ring-offset-2 hover:ring-2 hover:ring-blue-300 transition-shadow" : ""}`}
        onClick={() => hasPhoto && setOpen(true)}
      >
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name || ""} />}
        <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
      </Avatar>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-2 bg-transparent border-none shadow-none [&>button]:text-white [&>button]:hover:text-white/80">
          <VisuallyHidden>
            <DialogTitle>{name || "Profilbillede"}</DialogTitle>
          </VisuallyHidden>
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={name || "Profilbillede"}
              className="w-full h-auto rounded-xl object-cover"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
