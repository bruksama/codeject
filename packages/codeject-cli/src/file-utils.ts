import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string) {
  return Boolean(await fs.stat(filePath).catch(() => null));
}

export async function deleteFileIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (!isMissingError(error)) {
      throw error;
    }
  }
}

export async function removeDirectoryIfExists(dirPath: string) {
  try {
    await fs.rm(dirPath, { force: true, recursive: true });
  } catch (error) {
    if (!isMissingError(error)) {
      throw error;
    }
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if (isMissingError(error)) {
      return fallback;
    }
    throw error;
  }
}

export async function readTextFile(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (isMissingError(error)) {
      return null;
    }
    throw error;
  }
}

export async function writeJsonFile(filePath: string, value: unknown) {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeTextFile(filePath: string, content: string) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export async function copyFile(sourcePath: string, targetPath: string, mode?: number) {
  await ensureDirectory(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
  if (mode) {
    await fs.chmod(targetPath, mode);
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function shellQuote(value: string) {
  if (/^[a-zA-Z0-9_./:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function isMissingError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
