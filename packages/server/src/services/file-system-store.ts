import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    const isMissing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    if (isMissing) return fallback;
    throw error;
  }
}

export async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDirectory(path.dirname(filePath));
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFilePath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tempFilePath, filePath);
}

export async function deleteFileIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const isMissing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    if (!isMissing) throw error;
  }
}
