import { supabaseAdmin } from "../config/supabaseAdmin";

const BUCKET_NAME = "resumes";

export class StorageService {
  /**
   * Upload or overwrite resume file buffer in Supabase Storage private bucket.
   */
  async uploadResume(
    storagePath: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    return data.path;
  }

  /**
   * Delete resume file object from Supabase Storage private bucket.
   */
  async deleteResume(storagePath: string): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.warn(`Storage deletion warning for path '${storagePath}': ${error.message}`);
    }
  }

  /**
   * Create short-lived signed URL (default 60 seconds) for private storage object.
   */
  async createSignedResumeUrl(
    storagePath: string,
    expiresIn = 60
  ): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  }
}

export const storageService = new StorageService();
