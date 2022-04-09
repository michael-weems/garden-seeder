import * as fs from "fs";
import path from "path";
import { BucketParams, S3Config } from "./types";

export class FileIo {
  constructor(private config: S3Config) {}

  public async getFileNames(dir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, { withFileTypes: true }, (err, files) => {
        if (err) {
          reject(err);
        }
        const results = files
          .filter((file) => false == file.isDirectory())
          .map((file) => file.name);
        resolve(results);
      });
    });
  }

  public async getDirUploadParams(
    dir: string
  ): Promise<Omit<BucketParams, "Bucket">[]> {
    const filenames = await this.getFileNames(dir);
    return filenames.map((filepath) => {
      return {
        // Specify the name of the new object. For example, 'index.html'.
        // To create a directory for the object, use '/'. For example, 'myApp/package.json'.
        Key: path.basename(filepath),
        // Content of the new object.
        Body: fs.createReadStream(filepath),
      };
    });
  }
}
