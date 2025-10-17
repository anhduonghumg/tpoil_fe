// src/shared/hooks/useUploadImage.ts
import { useState } from "react";
import { uploadImage } from "../api/uploads";

export function useUploadImage(folder: string, defaultName = "image") {
  const [loading, setLoading] = useState(false);
  const run = async (blob: Blob, name = defaultName) => {
    setLoading(true);
    try {
      return await uploadImage(blob, folder, name);
    } finally {
      setLoading(false);
    }
  };
  return { upload: run, loading };
}
