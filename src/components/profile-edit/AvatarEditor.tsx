import { useState, useRef, type SyntheticEvent } from "react";
import { Camera, Crop, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop as CropType,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface AvatarEditorProps {
  profileId: string;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  profileName?: string;
  /** Route storage + DB writes through the admin-update-avatar edge function. Required when editing another user's avatar. */
  adminMode?: boolean;
}

export function AvatarEditor({
  profileId,
  avatarUrl,
  onAvatarChange,
  profileName,
  adminMode = false,
}: AvatarEditorProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Filen skal være et billede");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Billedet må max være 5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingImageUrl(reader.result as string);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setDialogOpen(true);
    };
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onCropImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
      width,
      height,
    );
    setCrop(initialCrop);
  };

  const confirmUpload = async () => {
    if (!imgRef.current || !completedCrop) return;

    setUploading(true);
    setDialogOpen(false);

    try {
      const image = imgRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const sx = completedCrop.x * scaleX;
      const sy = completedCrop.y * scaleY;
      const sw = completedCrop.width * scaleX;
      const sh = completedCrop.height * scaleY;

      const outSize = Math.min(512, Math.round(sw));
      const canvas = document.createElement("canvas");
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext("2d")!;

      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outSize, outSize);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
          "image/webp",
          0.85,
        );
      });

      let publicUrl: string;

      if (adminMode) {
        const form = new FormData();
        form.append("profile_id", profileId);
        form.append("action", "upload");
        form.append("image", new File([blob], "avatar.webp", { type: "image/webp" }));
        const { data, error: invokeError } = await supabase.functions.invoke<{
          avatar_url?: string;
          error?: string;
        }>("admin-update-avatar", { body: form });
        if (invokeError || !data?.avatar_url) {
          throw new Error(data?.error ?? invokeError?.message ?? "Upload failed");
        }
        publicUrl = data.avatar_url;
      } else {
        const filePath = `${profileId}/avatar.webp`;
        const { data: existing } = await supabase.storage.from("avatars").list(profileId);
        if (existing && existing.length > 0) {
          await supabase.storage
            .from("avatars")
            .remove(existing.map((f) => `${profileId}/${f.name}`));
        }

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, blob, { upsert: true, contentType: "image/webp" });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("profile_id", profileId);
        if (updateError) throw updateError;
      }

      onAvatarChange(publicUrl);
      toast.success("Profilbillede opdateret!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Kunne ikke uploade billede");
    } finally {
      setUploading(false);
      setPendingImageUrl(null);
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    try {
      if (adminMode) {
        const form = new FormData();
        form.append("profile_id", profileId);
        form.append("action", "delete");
        const { data, error: invokeError } = await supabase.functions.invoke<{
          avatar_url?: string | null;
          error?: string;
        }>("admin-update-avatar", { body: form });
        if (invokeError || data?.error) {
          throw new Error(data?.error ?? invokeError?.message ?? "Delete failed");
        }
      } else {
        const { data: existing } = await supabase.storage.from("avatars").list(profileId);
        if (existing && existing.length > 0) {
          await supabase.storage
            .from("avatars")
            .remove(existing.map((f) => `${profileId}/${f.name}`));
        }

        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("profile_id", profileId);
        if (error) throw error;
      }

      onAvatarChange(null);
      toast.success("Profilbillede fjernet");
    } catch (err) {
      console.error("Avatar delete error:", err);
      toast.error("Kunne ikke fjerne billede");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Profilbillede</h2>
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="h-24 w-24 text-3xl">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={profileName || ""} />
            )}
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {profileName?.slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            {avatarUrl ? "Skift billede" : "Upload billede"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Fjern billede
            </Button>
          )}
          <p className="text-xs text-gray-400">Max 5 MB · JPG, PNG, WebP</p>
        </div>
      </div>

      {/* Crop dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setPendingImageUrl(null);
          setDialogOpen(open);
        }}
      >
        <DialogContent className="p-0 gap-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Beskær profilbillede</DialogTitle>
          </DialogHeader>

          {pendingImageUrl && (
            <div className="p-6">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
              >
                <img
                  ref={imgRef}
                  src={pendingImageUrl}
                  alt="Beskær"
                  onLoad={onCropImageLoad}
                  style={{ maxHeight: "60vh" }}
                />
              </ReactCrop>
            </div>
          )}

          <DialogFooter className="p-6 pt-0">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setPendingImageUrl(null);
              }}
            >
              Annuller
            </Button>
            <Button
              onClick={confirmUpload}
              disabled={uploading || !completedCrop}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploader...
                </>
              ) : (
                <>
                  <Crop className="h-4 w-4 mr-2" />
                  Beskær & upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
