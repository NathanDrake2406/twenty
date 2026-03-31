import { Readable } from 'stream';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { S3Driver } from 'src/engine/core-modules/file-storage/drivers/s3.driver';
import { FileStorageExceptionCode } from 'src/engine/core-modules/file-storage/interfaces/file-storage-exception';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');

  return {
    ...actual,
    S3: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3Driver.readFile', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should retry once on ExpiredToken and succeed', async () => {
    const expiredError = new Error('The provided token has expired.');

    Object.defineProperty(expiredError, 'name', { value: 'ExpiredToken' });

    const readableBody = Readable.from(Buffer.from('file-content'));

    mockSend
      .mockRejectedValueOnce(expiredError)
      .mockResolvedValueOnce({ Body: readableBody });

    const driver = new S3Driver({
      bucketName: 'test-bucket',
      region: 'us-east-1',
    });

    const result = await driver.readFile({ filePath: 'some/file.js' });

    expect(result).toBeInstanceOf(Readable);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('should throw NoSuchKey as FileStorageException without retrying', async () => {
    const noSuchKeyError = new Error('Not found');

    Object.defineProperty(noSuchKeyError, 'name', { value: 'NoSuchKey' });

    mockSend.mockRejectedValueOnce(noSuchKeyError);

    const driver = new S3Driver({
      bucketName: 'test-bucket',
      region: 'us-east-1',
    });

    await expect(
      driver.readFile({ filePath: 'missing/file.js' }),
    ).rejects.toMatchObject({
      code: FileStorageExceptionCode.FILE_NOT_FOUND,
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should throw non-retryable errors immediately', async () => {
    const accessDeniedError = new Error('Access denied');

    Object.defineProperty(accessDeniedError, 'name', {
      value: 'AccessDenied',
    });

    mockSend.mockRejectedValueOnce(accessDeniedError);

    const driver = new S3Driver({
      bucketName: 'test-bucket',
      region: 'us-east-1',
    });

    await expect(
      driver.readFile({ filePath: 'some/file.js' }),
    ).rejects.toThrow('Access denied');

    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});

describe('S3Driver.getPresignedUrl', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when presigning is not enabled', async () => {
    const driver = new S3Driver({
      bucketName: 'test-bucket',
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
    });

    const result = await driver.getPresignedUrl({
      filePath: 'some/file.png',
    });

    expect(result).toBeNull();
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('should presign with the main client when enabled without endpoint override', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue(
      'https://s3.us-east-1.amazonaws.com/test-bucket/file.png?X-Amz-Signature=abc',
    );

    const driver = new S3Driver({
      bucketName: 'test-bucket',
      region: 'us-east-1',
      presignEnabled: true,
    });

    const result = await driver.getPresignedUrl({
      filePath: 'file.png',
      responseContentType: 'image/png',
      responseContentDisposition: 'inline',
    });

    expect(result).toBe(
      'https://s3.us-east-1.amazonaws.com/test-bucket/file.png?X-Amz-Signature=abc',
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(GetObjectCommand),
      { expiresIn: 900 },
    );
  });

  it('should presign with a separate client when endpoint override is provided', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue(
      'https://public.s3.com/test-bucket/some/file.png?X-Amz-Signature=abc',
    );

    const driver = new S3Driver({
      bucketName: 'test-bucket',
      region: 'us-east-1',
      endpoint: 'http://internal-minio:9000',
      presignEnabled: true,
      presignEndpoint: 'https://public.s3.com',
    });

    const result = await driver.getPresignedUrl({
      filePath: 'some/file.png',
      responseContentType: 'image/png',
      responseContentDisposition: 'inline',
    });

    expect(result).toBe(
      'https://public.s3.com/test-bucket/some/file.png?X-Amz-Signature=abc',
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(GetObjectCommand),
      { expiresIn: 900 },
    );
  });

  it('should use custom expiry when provided', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.url');

    const driver = new S3Driver({
      bucketName: 'test-bucket',
      region: 'us-east-1',
      presignEnabled: true,
    });

    await driver.getPresignedUrl({
      filePath: 'file.txt',
      expiresInSeconds: 3600,
    });

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(GetObjectCommand),
      { expiresIn: 3600 },
    );
  });
});
