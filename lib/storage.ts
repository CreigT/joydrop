import { randomUUID } from "crypto";
import { getFirebaseAdminStorage } from "@/lib/firebase-admin";
import { fileToDataUrl } from "@/lib/media";

export async function uploadContributionFile(
  file: File | null,
  userId: string,
  kind: string
) {
  if (!file || file.size === 0) {
    return null;
  }

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!bucketName) {
    return fileToDataUrl(file);
  }

  try {
    const bucket = getFirebaseAdminStorage().bucket(bucketName);
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()
      : "bin";
    const path = `contributions/${userId}/${kind}-${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storedFile = bucket.file(path);

    await storedFile.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=31536000"
      }
    });

    const [url] = await storedFile.getSignedUrl({
      action: "read",
      expires: "2500-01-01"
    });

    return url;
  } catch {
    return fileToDataUrl(file);
  }
}
