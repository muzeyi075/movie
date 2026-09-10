import { S3Client } from "@aws-sdk/client-s3";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getBucketName() { return required("B2_BUCKET"); }
export function getPublicBaseUrl() { return required("B2_PUBLIC_URL").replace(/\/$/, ""); }

export function getBackblazeClient() {
  return new S3Client({
    region: process.env.B2_REGION || "us-west-004",
    endpoint: required("B2_ENDPOINT"),
    credentials: { accessKeyId: required("B2_KEY_ID"), secretAccessKey: required("B2_APPLICATION_KEY") },
  });
}
