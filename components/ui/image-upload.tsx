"use client";
import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { uploadImage, deleteImage } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  aspectRatio?: "square" | "banner" | "free";
  maxSize?: number; // MB
  bucket: "avatars" | "project-banners" | "task-images";
}

const ASPECT_RATIOS = {
  square: "aspect-square",
  banner: "aspect-video",
  free: "",
};

const PLACEHOLDER_SIZES = {
  avatars: "w-20 h-20",
  "project-banners": "w-full h-32",
  "task-images": "w-full h-48",
};

export default function ImageUpload({
  value,
  onChange,
  className,
  aspectRatio = "free",
  maxSize = 5,
  bucket,
}: ImageUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload images");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSize}MB`);
      return;
    }

    setIsUploading(true);

    try {
      const url = await uploadImage(file, bucket, user.id);
      onChange(url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = async () => {
    if (value && user) {
      try {
        await deleteImage(value, bucket);
      } catch (error) {
        console.error("Delete error:", error);
        // Still remove the URL even if delete fails
      }
    }
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative", className)}>
      {value ? (
        // Preview mode
        <div className="relative group">
          <div className={cn(
            "relative overflow-hidden rounded-lg border",
            ASPECT_RATIOS[aspectRatio],
            aspectRatio === "banner" ? "w-full" : PLACEHOLDER_SIZES[bucket]
          )}>
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Upload mode
        <div
          className={cn(
            "relative border-2 border-dashed border-border rounded-lg transition-colors",
            ASPECT_RATIOS[aspectRatio],
            aspectRatio === "banner" ? "w-full" : PLACEHOLDER_SIZES[bucket],
            dragActive ? "border-primary bg-primary/5" : "hover:border-primary",
            "flex flex-col items-center justify-center cursor-pointer"
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="text-center p-4">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              {isUploading ? "Uploading..." : "Drop image here or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF up to {maxSize}MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
