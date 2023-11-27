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

test('integration test', () => {
    mangoGetResult.body = fs.readFileSync(`${__dirname}/../mocks/search.htm`, 'utf8');
    const manga: Manga[] = JSON.parse(plugin.searchManga('food'));

    expect(manga).toHaveLength(12); //it seems pagination is needed, if more results are needed...

    expect(manga[0]!.title).toBe('The Foodie Next Door');

    mangoGetResult.body = fs.readFileSync(`${__dirname}/../mocks/The Foodie Next Door Manga.htm`, 'utf8');
    const chapters: Chapter[] = JSON.parse(global.listChapters(manga[0]!.id));

    expect(chapters).toHaveLength(91);
    expect(chapters.at(0)!.chapter).toBe("91");
    expect(chapters.at(-1)!.chapter).toBe("1");

    mangoGetResult.body = fs.readFileSync(`${__dirname}/../mocks/The Foodie Next Door Chapter 1.htm`, 'utf8');
    const chapter: Chapter = JSON.parse(global.selectChapter(chapters[0]!.id));

    expect(chapter.pages).toBe(32);

    const page: Page = JSON.parse(global.nextPage());

    expect(page.filename).toBe("filename");
    expect(page.url).toBe("http://name.tld");
});
