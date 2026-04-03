import { ApiHttpError, triggerSessionValidation } from "@/utils/api";

function extractErrorMessage(status: number, statusText: string, body: unknown): string {
  if (body && typeof body === "object") {
    const maybeDetail = (body as { detail?: unknown }).detail;
    if (typeof maybeDetail === "string" && maybeDetail.trim()) {
      return `${status}: ${maybeDetail}`;
    }
  }

  if (typeof body === "string" && body.trim()) {
    return `${status}: ${body}`;
  }

  return `${status} ${statusText}`.trim();
}

async function fetchProtectedDocument(path: string): Promise<Response> {
  const response = await fetch(path, {
    credentials: "include",
  });

  if (response.status === 401) {
    console.warn(`[auth] Protected document request returned 401: ${path}`);
    triggerSessionValidation(`protected document GET ${path}`);
    throw new ApiHttpError(401, "401: Session validation required");
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    throw new Error(extractErrorMessage(response.status, response.statusText, body));
  }

  return response;
}

export async function viewProtectedDocument(path: string): Promise<void> {
  const response = await fetchProtectedDocument(path);
  const html = await response.text();

  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) {
    throw new Error("Unable to open preview window. Please allow popups and try again.");
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

function filenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) {
    return null;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return null;
}

export async function downloadProtectedDocument(path: string, fallbackFileName: string): Promise<void> {
  const response = await fetchProtectedDocument(path);
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const fileName = filenameFromDisposition(disposition) || fallbackFileName;

  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}
