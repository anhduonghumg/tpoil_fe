// src/shared/hooks/useUploadImage.ts
import { useState } from "react";
import { uploadFile, uploadImage } from "../api/uploads";

export function useUploadFile(folder: string, defaultName = "image") {
  const [loading, setLoading] = useState(false);
  const run = async (blob: Blob, name = defaultName) => {
    setLoading(true);
    try {
      return await uploadFile(blob, folder, name);
    } finally {
      setLoading(false);
    }
  };
  return { upload: run, loading };
}
