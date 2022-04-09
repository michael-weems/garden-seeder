import * as fs from "fs";

export interface BucketParams {
  Bucket: string;
  Key: string;
  Body: fs.ReadStream;
}

export interface S3Config {
  bucket: string;
  userId: string;
}

export interface S3Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_DEFAULT_REGION: string;
}
