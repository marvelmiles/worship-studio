export const downloadJSON = (data: unknown, name: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Text reads only. Binary files are never read into JS memory, store the
 * File/Blob itself (see lib/fileStore) and display it via object URLs.
 */
export function readFile(file: File, as: "text" = "text"): Promise<string> {
  void as;
  return file.text();
}
