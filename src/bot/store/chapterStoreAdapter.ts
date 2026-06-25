import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ChapterDocument } from '../../chapter/types';
import { migrateChapter } from '../../chapter/migrateChapter';
import { FileChapterStore } from './fileChapterStore';

function linkedPotPath(linkedPotDir: string, potId: string): string {
  return path.join(linkedPotDir, `${potId}.chapter.json`);
}

export class ChapterStoreAdapter {
  private readonly linkedPotDir: string;

  constructor(
    private readonly fileStore: FileChapterStore,
    dataDir: string,
  ) {
    this.linkedPotDir = path.join(dataDir, 'linked-pots');
  }

  async init(): Promise<void> {
    await this.fileStore.init();
    await mkdir(this.linkedPotDir, { recursive: true });
  }

  async getByChatId(chatId: string): Promise<ChapterDocument | null> {
    const chapter = await this.fileStore.getByChatId(chatId);
    if (!chapter?.potId) {
      return chapter;
    }

    const linked = await this.readLinkedPotChapter(chapter.potId);
    return linked ?? chapter;
  }

  async getById(id: string): Promise<ChapterDocument | null> {
    return this.fileStore.getById(id);
  }

  async save(chapter: ChapterDocument): Promise<void> {
    await this.fileStore.save(chapter);

    if (chapter.potId) {
      await this.writeLinkedPotChapter(chapter.potId, chapter);
    }
  }

  async linkPotToChat(chatId: string, potId: string): Promise<ChapterDocument | null> {
    const chapter = await this.fileStore.getByChatId(chatId);
    if (!chapter) {
      return null;
    }

    const linked: ChapterDocument = {
      ...chapter,
      potId,
    };
    await this.save(linked);
    return linked;
  }

  async readLinkedPotChapter(potId: string): Promise<ChapterDocument | null> {
    try {
      const raw = await readFile(linkedPotPath(this.linkedPotDir, potId), 'utf8');
      return migrateChapter(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  async writeLinkedPotChapter(potId: string, chapter: ChapterDocument): Promise<void> {
    await mkdir(this.linkedPotDir, { recursive: true });
    await writeFile(
      linkedPotPath(this.linkedPotDir, potId),
      JSON.stringify(chapter, null, 2),
      'utf8',
    );
  }
}
