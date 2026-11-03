/* eslint-disable @next/next/no-img-element */
/** Shows an attached photo, GIF, video, or voice file. "large" is for cards the user received. */
export function MediaView({
  src,
  type,
  size = "small"
}: {
  src: string | null;
  type: string;
  size?: "small" | "large";
}) {
  if (!src) return null;
  const height = size === "large" ? "max-h-96" : "max-h-48";
  if (type === "photo" || type === "gif") {
    return <img alt="Attached file" className={`mt-2 ${height} rounded-xl`} loading="lazy" src={src} />;
  }
  if (type === "voice") {
    return <audio className="mt-2 w-full" controls preload="metadata" src={src} />;
  }
  if (type === "video") {
    return (
      <video className={`mt-2 ${height} w-full rounded-xl bg-black/5`} controls playsInline preload="metadata" src={src} />
    );
  }
  return null;
}
