'use server'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'node:crypto'

export async function getPresignedUploadUrl(folder: string, originalFileName: string, contentType: string) {
  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    })

    const fileExt = originalFileName.split('.').pop()
    const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      ContentType: contentType,
    })

    // URL expires in 15 minutes (900 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })

    const finalPublicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`

    return { success: true, signedUrl, finalPublicUrl }
  } catch (error: any) {
    console.error('Error generating presigned URL:', error)
    return { success: false, error: 'Failed to generate secure upload URL' }
  }
}
