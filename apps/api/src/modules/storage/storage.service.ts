import { Injectable, Logger, GoneException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseStorageDir: string;

  constructor() {
    this.baseStorageDir = path.resolve(process.cwd(), 'private_storage');
    if (!fs.existsSync(this.baseStorageDir)) {
      fs.mkdirSync(this.baseStorageDir, { recursive: true });
    }
  }

  async saveFile(
    shopId: string,
    jobId: string,
    fileId: string,
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    const shopJobDir = path.join(this.baseStorageDir, shopId, jobId);
    if (!fs.existsSync(shopJobDir)) {
      fs.mkdirSync(shopJobDir, { recursive: true });
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${shopId}/${jobId}/${fileId}_${safeName}`;
    const targetPath = path.join(this.baseStorageDir, storageKey);

    fs.writeFileSync(targetPath, file.buffer);

    this.logger.log(`Saved private document to storageKey: ${storageKey} (${file.size} bytes)`);

    return {
      storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  getFilePath(storageKey: string): string {
    const fullPath = path.join(this.baseStorageDir, storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new GoneException(
        'Document has been permanently deleted according to the SecurePrint privacy policy. Please upload again if needed.',
      );
    }
    return fullPath;
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseStorageDir, storageKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        this.logger.log(`Permanently deleted private document object: ${storageKey}`);

        // Clean up empty directories if possible
        const parent = path.dirname(fullPath);
        if (fs.existsSync(parent) && fs.readdirSync(parent).length === 0) {
          fs.rmdirSync(parent);
        }
        return true;
      }
      return true; // Idempotent: already deleted
    } catch (err) {
      this.logger.error(`Error deleting storageKey: ${storageKey}`, err);
      throw err;
    }
  }

  fileExists(storageKey: string): boolean {
    const fullPath = path.join(this.baseStorageDir, storageKey);
    return fs.existsSync(fullPath);
  }
}
