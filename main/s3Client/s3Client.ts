import { FileIo } from "./file-io";
import { S3Config, S3Env } from "./types";
import { s3Client } from "./_s3Client";
import {
  CreateBucketCommand,
  ListBucketsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
export interface S3Client {}

interface Context {
  config: S3Config;
  env: S3Env;
  log: any;
}
interface UploadResponse {
  success: boolean;
  file: string;
  customer: string;
  message?: string;
}
interface CreateCustomerResponse {
  success: boolean;
  customer: string;
  message?: string;
}
type CreateAlbum = Omit<Album, "Bucket">;
interface Album {
  customer: string;
  Bucket: string;
  name: string;
}
const DELIM = `$Dangle$`;
function bucketName({ customer, name }: CreateAlbum): string {
  return `${customer}${DELIM}${name}`;
}
function albumInfo(Bucket: string | undefined): Album {
  if (Bucket == undefined) {
    return {
      Bucket: "Unknown",
      customer: "Unknown",
      name: "Unknown",
    };
  }
  const [customer, name] = Bucket.split(DELIM);
  return {
    Bucket,
    customer,
    name,
  };
}

export class S3Client {
  private fileIo: FileIo;
  constructor(private ctx: Context) {
    this.fileIo = new FileIo(ctx.config);
  }

  public async getAlbums(): Promise<Album[]> {
    try {
      const data = await s3Client.send(new ListBucketsCommand({}));
      if (data.Buckets == undefined) return [];
      const albums = data.Buckets.map((bucket) => bucket.Name).map((name) =>
        albumInfo(name)
      );
      return albums;
    } catch (error) {
      this.ctx.log.error(error.message);
      return [];
    }
  }
  public async createEmptyAlbum(
    album: CreateAlbum
  ): Promise<CreateCustomerResponse> {
    const Bucket = bucketName(album);
    try {
      const data = await s3Client.send(new CreateBucketCommand({ Bucket }));
      this.ctx.log.info("Success", data.Location);
      return {
        success: true,
        customer: Bucket,
      };
    } catch (error) {
      this.ctx.log.error("Error", error);
      return {
        success: false,
        customer: Bucket,
        message: error.message,
      };
    }
  }
  public async uploadFolderToAlbum(
    album: CreateAlbum,
    folderPath: string
  ): Promise<UploadResponse[]> {
    const files = await this.fileIo.getDirUploadParams(folderPath);
    const bucketParams = files.map((file) => ({
      ...file,
      Bucket: bucketName(album),
    }));

    return await Promise.all(
      bucketParams.map(async (bucketParam): Promise<UploadResponse> => {
        try {
          const data = await s3Client.send(new PutObjectCommand(bucketParam));
          this.ctx.log.log("debug", "result data", data);
          //return data; // For unit tests.
          this.ctx.log.info(
            `Successfully uploaded object: ${bucketParam.Bucket}/${bucketParam.Key}`
          );
          return {
            success: true,
            file: bucketParam.Key,
            customer: bucketParam.Bucket,
          };
        } catch (error) {
          this.ctx.log.error(error);
          return {
            success: false,
            file: bucketParam.Key,
            customer: bucketParam.Bucket,
            message: error.message,
          };
        }
      })
    );
  }
}
