"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 预加载：暴露 window.translator（有道翻译），与历史 panel-preload.js 行为一致。
 * 使用 fetch，避免依赖 request/request-promise。
 */
const crypto = __importStar(require("crypto"));
class Translator {
    constructor() {
        this.config = {
            from: '',
            to: '',
            appKey: '',
            secretKey: '',
        };
    }
    md5(str) {
        const h = crypto.createHash('md5');
        h.update(str);
        return h.digest('hex');
    }
    getRandomN(roundTo) {
        return Math.round(Math.random() * roundTo);
    }
    generateUrlParams(_params) {
        const paramsData = [];
        for (const key of Object.keys(_params)) {
            paramsData.push(`${key}=${_params[key]}`);
        }
        return paramsData.join('&');
    }
    async translate(word) {
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
window.translator = translator;
