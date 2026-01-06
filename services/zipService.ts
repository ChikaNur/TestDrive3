
import JSZip from 'jszip';
import { CodeFile } from '../types';

export const extractCodeFiles = async (file: File, allowedExtensions?: string[]): Promise<CodeFile[]> => {
  const zip = new JSZip();
  // Gunakan ekstensi dari config jika ada, jika tidak gunakan default
  const validExtensions = allowedExtensions && allowedExtensions.length > 0 
    ? allowedExtensions.map(ext => ext.toLowerCase().trim().replace(/^\./, ''))
    : ['html', 'css', 'php', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp'];
  
  try {
    const contents = await zip.loadAsync(file);
    const codeFiles: CodeFile[] = [];
    const promises: Promise<void>[] = [];

    contents.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        const ext = relativePath.split('.').pop()?.toLowerCase();
        if (ext && validExtensions.includes(ext)) {
          const promise = zipEntry.async('string').then((content) => {
            // Basic check to avoid empty files or binary looking content
            if (content && content.length < 500000) { // Increased limit slightly for larger scripts
              codeFiles.push({
                name: relativePath,
                content: content,
                language: ext
              });
            }
          });
          promises.push(promise);
        }
      }
    });

    await Promise.all(promises);
    return codeFiles;
  } catch (error) {
    console.error("Error extracting zip:", error);
    throw new Error("Failed to extract files. Please ensure it is a valid ZIP.");
  }
};
