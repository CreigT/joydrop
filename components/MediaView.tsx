/* eslint-disable @next/next/no-img-element */
export function MediaView({ src, type }: { src: string | null; type: string }) {
  if (!src) return null;
  if (type === "photo" || type === "gif") {
    return <img alt="Attached file" className="mt-2 max-h-48 rounded-xl" src={src} />;
  }
  if (type === "voice") {
    return <audio className="mt-2 w-full" controls src={src} />;
  }
  if (type === "video") {
    return <video className="mt-2 max-h-48 w-full rounded-xl" controls src={src} />;
  }
  return null;
}
