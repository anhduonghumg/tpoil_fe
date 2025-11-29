// src/shared/api/uploads.ts
export type UploadResult = { url: string };

export async function uploadImage(
  blob: Blob,
  folder: string,
  filename = "image"
): Promise<string> {
  const fd = new FormData();
  // tự đoán phần mở rộng đơn giản
  const ext =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
      ? "webp"
      : "jpg";
  fd.append("file", blob, `${filename}.${ext}`);
  fd.append("folder", folder);

  const res = await fetch("/api/uploads/image", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json?.data?.url || json?.url;
}

export async function uploadFile(
  blob: Blob,
  folder: string,
  filename = "file"
): Promise<string> {
  const fd = new FormData();
  // const ext =
  //   blob.type === "application/pdf"
  //     ? "pdf"
  //     : blob.type ===
  //       "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  //     ? "docx"
  //     : "bin";
  // fd.append("file", blob, `${filename}.${ext}`);
  fd.append("file", blob, filename);
  fd.append("folder", folder);
  const res = await fetch("/api/uploads/file", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json?.data?.url || json?.url;
}
