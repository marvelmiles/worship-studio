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

export function readFile(
  file: File,
  as: "dataURL" | "text" = "dataURL"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    if (as === "text") r.readAsText(file);
    else r.readAsDataURL(file);
  });
}
