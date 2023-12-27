import type MangoStatic from "@genius257/mango-plugin";
import * as plugin from "./index";
import {JSDOM} from "jsdom";
import * as fs from "fs";
import { Chapter, Manga, Page } from "@genius257/mango-plugin";

let mangoGetResult: ReturnType<typeof mango.get> = {
    body: '',
    headers: {},
    status_code: 200,
};
const mangoGetResultBackup: Readonly<typeof mangoGetResult> = JSON.parse(JSON.stringify(mangoGetResult));

let mangoPostResult: ReturnType<typeof mango.post> = {
    body: {
        data: '',
        headers: {},
        json: null,
        method: 'POST',
    },
    headers: {},
    status_code: 200,
}
const mangoPostResultBackup: Readonly<typeof mangoPostResult> = JSON.parse(JSON.stringify(mangoPostResult));

declare global {
    var mango: typeof MangoStatic;
}

global.mango = {
    get: (url: string, headers?: Record<string, string>) => mangoGetResult,
    post: (url: string, body: string, headers?: Record<string, string>) => mangoPostResult,
    attribute: (html: string, attr: string) => JSDOM.fragment(html).firstElementChild?.getAttribute(attr) ?? undefined,
    // css: (html: string, selector: string) => Array.from(new JSDOM(html).window.document.querySelectorAll(selector)).map((element) => element.outerHTML),
    css: (html: string, selector: string) => Array.from(JSDOM.fragment(html).querySelectorAll(selector)).map((element) => element.outerHTML),
    raise: (v) => {throw v},
    settings: (key: string) => '',
    storage: (key: string, val?: unknown) => val === undefined ? undefined : '',
    text: (html: string) => JSDOM.fragment(html).firstElementChild?.textContent ?? ''
};

const mangoBackup: Readonly<typeof mango> = {...mango};

beforeEach(() => {
    // restore global mango default setup
    mango = {...mangoBackup};
    mangoGetResult = JSON.parse(JSON.stringify(mangoGetResultBackup));
    mangoPostResult = JSON.parse(JSON.stringify(mangoPostResultBackup));
});

test('mango plugin functions are all global functions', () => {
    expect(global.searchManga).toBe(plugin.searchManga);
    expect(global.listChapters).toBe(plugin.listChapters);
    expect(global.selectChapter).toBe(plugin.selectChapter);
    expect(global.nextPage).toBe(plugin.nextPage);

    if (typeof global.newChapters !== 'undefined') {
        //@ts-ignore
        expect(global.newChapters).toBe(plugin.newChapters);
    }
});

test('integration test: searching selecting and start downloading a chapter', () => {
    mangoGetResult.body = fs.readFileSync(`${__dirname}/../mocks/search.htm`, 'utf8');
    const manga: Manga[] = JSON.parse(plugin.searchManga('food'));

    expect(manga).toHaveLength(12); //it seems pagination is needed, if more results are needed...

    expect(manga[0]!.title).toBe('The Foodie Next Door');

    expect(manga[0]!.tags).toStrictEqual([
        'Comedy',
        'Drama',
        'Romance',
        'Shoujo',
    ]);

    mangoGetResult.body = fs.readFileSync(`${__dirname}/../mocks/The Foodie Next Door Manga.htm`, 'utf8');
    const chapters: Chapter[] = JSON.parse(global.listChapters(manga[0]!.id));

    expect(chapters).toHaveLength(91);
    expect(chapters.at(0)!.chapter).toBe("91");
    expect(chapters.at(-1)!.chapter).toBe("1");

    mangoGetResult.body = fs.readFileSync(`${__dirname}/../mocks/The Foodie Next Door Chapter 1.htm`, 'utf8');
    const chapter: Chapter = JSON.parse(global.selectChapter(chapters[0]!.id));

    expect(chapter.pages).toBe(32);

    let page: Page = JSON.parse(global.nextPage());

    expect(page.filename).toBe("chap_0_1.jpg");
    expect(page.url).toBe("https://z-cdn.zinmanga.com/manga_b7b9344f48a7655e72a6467e297ed557/chapter_0//chap_0_1.jpg");
    expect(page.headers).toStrictEqual({
        'Referer': 'https://zinmanga.com/',
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    });

    page = JSON.parse(global.nextPage());

    expect(page.filename).toBe("chap_0_2.jpg");
    expect(page.url).toBe("https://z-cdn.zinmanga.com/manga_b7b9344f48a7655e72a6467e297ed557/chapter_0//chap_0_2.jpg");
    expect(page.headers).toStrictEqual({
        'Referer': 'https://zinmanga.com/',
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    });
});

test('integration test: checking for updates', () => {
    mangoGetResult.body = fs.readFileSync(`${__dirname}/../mocks/The Foodie Next Door Manga.htm`, 'utf8');

    const manga_id = "the-foodie-next-door";
    const timestamp = Date.parse('2021-03-29');

    const newChapters: Chapter[] = JSON.parse(global.newChapters(manga_id, timestamp));

    expect(newChapters).toHaveLength(1);

    const newChapter = newChapters[0]!;
    expect(newChapter.title).toBe('Chapter 91');
});

describe('chapterReleaseDateToTimestamp', () => {
    test('with date string', () => {
        const actual = plugin.chapterReleaseDateToTimestamp('03/29/2021');
        const expected = Date.parse('2021-03-29');
        expect(actual).toBe(expected);
    });

    test('with human readable string', () => {
        // 1703554836
        // 1703554738838
        jest.useFakeTimers().setSystemTime(new Date('2023-12-26'));

        let actual = plugin.chapterReleaseDateToTimestamp('4 seconds ago');
        let expected = Date.now() - 4 * 1000;
        expect(actual).toBe(expected);

        actual = plugin.chapterReleaseDateToTimestamp('4 minutes ago');
        expected = Date.now() - 4 * 1000 * 60;
        expect(actual).toBe(expected);

        actual = plugin.chapterReleaseDateToTimestamp('4 hours ago');
        expected = Date.now() - 4 * 1000 * 60 * 60;
        expect(actual).toBe(expected);

        actual = plugin.chapterReleaseDateToTimestamp('4 days ago');
        expected = Date.now() - 4 * 1000 * 60 * 60 * 24;
        expect(actual).toBe(expected);
    });
});