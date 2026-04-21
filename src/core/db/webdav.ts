import fs from 'fs';
import path from 'path';

import { createClient } from 'webdav';
import { WebDAVClient } from 'webdav/dist/node/types';

import type DB from './index';

const nodeRequire =
  typeof window !== 'undefined' && (window as any).require
    ? (window as any).require
    : require;
const { Notification } = nodeRequire('electron');

type WebDavOptions = {
  username: string;
  password: string;
  url: string;
};

/**
 * Backup / restore over WebDav. The local store is a single SQLite file, so
 * both directions are straightforward binary transfers: upload the file on
 * backup, overwrite the file on restore.
 */
export default class WebDav {
  public client: WebDAVClient;
  private readonly sqlitePath = '/rubick/db.sqlite';

  constructor({ username, password, url }: WebDavOptions) {
    this.client = createClient(url, {
      username,
      password,
    });
    this.client
      .exists('/')
      .then((result) => {
        if (!result) {
          new Notification({
            title: '导出失败',
            body: 'webdav 连接失败',
          }).show();
        }
      })
      .catch((r) => {
        new Notification({
          title: '导出失败',
          body: 'WebDav连接出错' + r,
        }).show();
      });
  }

  async uploadSqliteFile(dbFile: string): Promise<void> {
    try {
      const dirExists = await this.client.exists('/rubick');
      if (!dirExists) {
        await this.client.createDirectory('/rubick');
      }
    } catch (e) {
      new Notification({
        title: '导出失败',
        body: 'WebDav目录创建出错:' + e,
      }).show();
      return;
    }

    if (!fs.existsSync(dbFile)) {
      new Notification({
        title: '导出失败',
        body: `本地数据库文件不存在: ${dbFile}`,
      }).show();
      return;
    }

    try {
      // SQLite's main file is always in a recoverable state on its own (WAL
      // data lives in `-wal`/`-shm` alongside it), so a straight `readFile`
      // produces a snapshot the remote side can reopen without our help.
      const buffer = await fs.promises.readFile(dbFile);
      await this.client.putFileContents(this.sqlitePath, buffer, {
        overwrite: true,
      });

      new Notification({
        title: '已导出到坚果云',
        body: `文件目录为：${this.sqlitePath}`,
      }).show();
    } catch (e) {
      new Notification({
        title: '导出失败',
        body: 'WebDav 上传出错:' + e,
      }).show();
    }
  }

  async downloadSqliteFile(db: DB): Promise<void> {
    try {
      const exists = await this.client.exists(this.sqlitePath);
      if (!exists) {
        new Notification({
          title: '导入失败',
          body: '请确认坚果云上已存在数据',
        }).show();
        return;
      }

      const data = (await this.client.getFileContents(this.sqlitePath, {
        format: 'binary',
      })) as Buffer | ArrayBuffer;

      const buffer = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data as ArrayBuffer);

      db.close();

      const target = db.dbFile;
      const rollback = `${target}.bak-${Date.now()}`;
      try {
        if (fs.existsSync(target)) fs.renameSync(target, rollback);
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.writeFile(target, buffer);

        // The old install's WAL / shared-memory companions are meaningless
        // against a freshly-written main file. Clear them so SQLite rebuilds
        // them on the next open.
        for (const suffix of ['-wal', '-shm']) {
          try {
            fs.unlinkSync(`${target}${suffix}`);
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        if (fs.existsSync(rollback) && !fs.existsSync(target)) {
          try {
            fs.renameSync(rollback, target);
          } catch {
            /* ignore */
          }
        }
        throw e;
      }

      db.init();

      new Notification({
        title: '导入成功',
        body: '数据已导入到 rubick，主应用数据需重启后生效',
      }).show();
    } catch (e) {
      new Notification({
        title: '导入失败',
        body: 'WebDav目录导入出错:' + e,
      }).show();
    }
  }
}
