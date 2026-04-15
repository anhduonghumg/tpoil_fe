export function normalizeCode(v?: string) {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

export async function openPdfPreviewByPost(url: string, payload: any) {
  const previewWindow = window.open("about:blank", "_blank");

  if (!previewWindow) {
    throw new Error("POPUP_BLOCKED");
  }

  try {
    previewWindow.document.title = "Đang tải phiếu đề nghị thanh toán";
    previewWindow.document.body.style.margin = "0";
    previewWindow.document.body.style.fontFamily = "Arial, sans-serif";
    previewWindow.document.body.style.display = "flex";
    previewWindow.document.body.style.justifyContent = "center";
    previewWindow.document.body.style.alignItems = "center";
    previewWindow.document.body.style.height = "100vh";
    previewWindow.document.body.style.background = "#f7f7f7";
    previewWindow.document.body.innerHTML = `
      <div style="text-align:center; padding: 24px; max-width: 400px;">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">
          Đang tạo phiếu đề nghị thanh toán...
        </div>
        <div style="color: #555; line-height: 1.5;">
          Vui lòng đợi trong giây lát, tab này sẽ được cập nhật khi file đã sẵn sàng.
        </div>
      </div>
    `;

    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("PRINT_REQUEST_FAILED");
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    previewWindow.location.href = blobUrl;

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60_000);
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}
