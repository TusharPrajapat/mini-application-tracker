import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  supabaseAdmin,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
} from "../config/supabaseAdmin";

const BUCKET_NAME = "resumes";

export class StorageService {
  /**
   * Returns an appropriately authenticated Supabase client:
   * 1. If SUPABASE_SERVICE_ROLE_KEY exists, uses supabaseAdmin (service_role bypasses RLS).
   * 2. If accessToken is provided, creates client with Authorization header (user JWT authenticated for RLS).
   * 3. Falls back to default supabaseAdmin.
   */
  private getClient(accessToken?: string): SupabaseClient {
    if (supabaseServiceRoleKey && supabaseServiceRoleKey.trim() !== "") {
      return supabaseAdmin;
    }

    if (accessToken && accessToken.trim() !== "") {
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    return supabaseAdmin;
  }

  /**
   * Upload or overwrite resume file buffer in Supabase Storage private bucket.
   */
  async uploadResume(
    storagePath: string,
    fileBuffer: Buffer,
    mimeType: string,
    accessToken?: string
  ): Promise<string> {
    const client = this.getClient(accessToken);

    const { data, error } = await client.storage
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
  async deleteResume(storagePath: string, accessToken?: string): Promise<void> {
    const client = this.getClient(accessToken);

    const { error } = await client.storage
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
    expiresIn = 60,
    accessToken?: string
  ): Promise<string> {
    const client = this.getClient(accessToken);

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  }
}

export const storageService = new StorageService();
