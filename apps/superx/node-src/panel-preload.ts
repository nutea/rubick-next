/**
 * 预加载：暴露 window.translator（有道翻译），与历史 panel-preload.js 行为一致。
 * 使用 fetch，避免依赖 request/request-promise。
 */
import * as crypto from 'crypto';

class Translator {
  config = {
    from: '',
    to: '',
    appKey: '',
    secretKey: '',
  };

  md5(str: string): string {
    const h = crypto.createHash('md5');
    h.update(str);
    return h.digest('hex');
  }

  getRandomN(roundTo: number): number {
    return Math.round(Math.random() * roundTo);
  }

  generateUrlParams(_params: Record<string, string | number>): string {
    const paramsData: string[] = [];
    for (const key of Object.keys(_params)) {
      paramsData.push(`${key}=${_params[key]}`);
    }
    return paramsData.join('&');
  }

  async translate(word: string): Promise<string> {
    const youdaoHost = 'http://openapi.youdao.com/api';
    const encodeURIWord = encodeURI(word);
    const salt = this.getRandomN(1000);
    const sign = this.md5(this.config.appKey + word + salt + this.config.secretKey);
    const paramsJson = {
      q: encodeURIWord,
      from: this.config.from,
      to: this.config.to,
      appKey: this.config.appKey,
      salt,
      sign,
    };
    const url = `${youdaoHost}?${this.generateUrlParams(paramsJson)}`;
    const res = await fetch(url);
    return res.text();
  }
}

const translator = new Translator();
translator.config = {
  from: 'auto',
  to: 'auto',
  appKey: '799a01833b496b22',
  secretKey: 'XZ9s6XbRKzlbiVSU7VPERx4wrHT9TXsi',
};

declare global {
  interface Window {
    translator: Translator;
  }
}

window.translator = translator;

export {};
