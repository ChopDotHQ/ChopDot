import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ChapterDocument } from '../../chapter/types';
import { migrateChapter } from '../../chapter/migrateChapter';

type ChatIndex = Record<string, string>;

export class FileChapterStore {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
  }

  private chapterPath(id: string): string {
    return path.join(this.dataDir, `${id}.json`);
  }

  private indexPath(): string {
    return path.join(this.dataDir, 'chat-index.json');
  }

  async getByChatId(chatId: string): Promise<ChapterDocument | null> {
    const index = await this.readIndex();
    const chapterId = index[chatId];
    if (!chapterId) {
      return null;
    }
    return this.getById(chapterId);
  }

  async getById(id: string): Promise<ChapterDocument | null> {
    try {
      const raw = await readFile(this.chapterPath(id), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      return migrateChapter(parsed);
    } catch {
      return null;
    }
  }

  async save(chapter: ChapterDocument): Promise<void> {
    await writeFile(this.chapterPath(chapter.id), JSON.stringify(chapter, null, 2), 'utf8');
    if (chapter.telegramChatId) {
      const index = await this.readIndex();
      index[chapter.telegramChatId] = chapter.id;
      await writeFile(this.indexPath(), JSON.stringify(index, null, 2), 'utf8');
    }
  }

  async list(): Promise<ChapterDocument[]> {
    const files = await readdir(this.dataDir);
    const chapters: ChapterDocument[] = [];
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'chat-index.json') {
        continue;
      }
      const id = file.replace(/\.json$/, '');
      const chapter = await this.getById(id);
      if (chapter) {
        chapters.push(chapter);
      }
    }
    return chapters;
  }

  private async readIndex(): Promise<ChatIndex> {
    try {
      const raw = await readFile(this.indexPath(), 'utf8');
      return JSON.parse(raw) as ChatIndex;
    } catch {
      return {};
    }
  }
}
