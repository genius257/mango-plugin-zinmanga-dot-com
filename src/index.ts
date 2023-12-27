import type MangoStatic from "@genius257/mango-plugin";
import * as Mango from "@genius257/mango-plugin";

declare const mango: typeof MangoStatic;

declare global {
    var searchManga: Mango.searchManga;
    var listChapters: Mango.listChapters;
    var selectChapter: Mango.selectChapter;
    var nextPage: Mango.nextPage;
    var newChapters: Mango.newChapters;
}

const mainUrl = "https://zinmanga.com";

function fixencodeURIComponent(component: string): string {
    return encodeURIComponent(component).replace(/%20/g, '+');
}

class HttpResponse {
    public static readonly statusTexts = {
        "100": 'Continue',
        "101": 'Switching Protocols',
        "102": 'Processing',            // RFC2518
        "103": 'Early Hints',
        "200": 'OK',
        "201": 'Created',
        "202": 'Accepted',
        "203": 'Non-Authoritative Information',
        "204": 'No Content',
        "205": 'Reset Content',
        "206": 'Partial Content',
        "207": 'Multi-Status',          // RFC4918
        "208": 'Already Reported',      // RFC5842
        "226": 'IM Used',               // RFC3229
        "300": 'Multiple Choices',
        "301": 'Moved Permanently',
        "302": 'Found',
        "303": 'See Other',
        "304": 'Not Modified',
        "305": 'Use Proxy',
        "307": 'Temporary Redirect',
        "308": 'Permanent Redirect',    // RFC7238
        "400": 'Bad Request',
        "401": 'Unauthorized',
        "402": 'Payment Required',
        "403": 'Forbidden',
        "404": 'Not Found',
        "405": 'Method Not Allowed',
        "406": 'Not Acceptable',
        "407": 'Proxy Authentication Required',
        "408": 'Request Timeout',
        "409": 'Conflict',
        "410": 'Gone',
        "411": 'Length Required',
        "412": 'Precondition Failed',
        "413": 'Content Too Large',                                           // RFC-ietf-httpbis-semantics
        "414": 'URI Too Long',
        "415": 'Unsupported Media Type',
        "416": 'Range Not Satisfiable',
        "417": 'Expectation Failed',
        "418": 'I\'m a teapot',                                               // RFC2324
        "421": 'Misdirected Request',                                         // RFC7540
        "422": 'Unprocessable Content',                                       // RFC-ietf-httpbis-semantics
        "423": 'Locked',                                                      // RFC4918
        "424": 'Failed Dependency',                                           // RFC4918
        "425": 'Too Early',                                                   // RFC-ietf-httpbis-replay-04
        "426": 'Upgrade Required',                                            // RFC2817
        "428": 'Precondition Required',                                       // RFC6585
        "429": 'Too Many Requests',                                           // RFC6585
        "431": 'Request Header Fields Too Large',                             // RFC6585
        "451": 'Unavailable For Legal Reasons',                               // RFC7725
        "500": 'Internal Server Error',
        "501": 'Not Implemented',
        "502": 'Bad Gateway',
        "503": 'Service Unavailable',
        "504": 'Gateway Timeout',
        "505": 'HTTP Version Not Supported',
        "506": 'Variant Also Negotiates',                                     // RFC2295
        "507": 'Insufficient Storage',                                        // RFC4918
        "508": 'Loop Detected',                                               // RFC5842
        "510": 'Not Extended',                                                // RFC2774
        "511": 'Network Authentication Required',                             // RFC6585
    };

    protected httpResult: ReturnType<typeof mango.get>;

    public constructor(httpResult: ReturnType<typeof mango.get>) {
        this.httpResult = httpResult;
    }

    isInvalid(): boolean {
        const statusCode = this.httpResult.status_code;
        return statusCode < 100 || statusCode >= 600;
    }

    isInformational(): boolean {
        const statusCode = this.httpResult.status_code;
        return statusCode >= 100 && statusCode < 200;
    }

    isSuccessful(): boolean {
        const statusCode = this.httpResult.status_code;
        return statusCode >= 200 && statusCode < 300;
    }

    isRedirection(): boolean {
        const statusCode = this.httpResult.status_code;
        return statusCode >= 300 && statusCode < 400;
    }

    isClientError(): boolean {
        const statusCode = this.httpResult.status_code;
        return statusCode >= 400 && statusCode < 500;
    }

    isServerError(): boolean {
        const statusCode = this.httpResult.status_code;
        return statusCode >= 500 && statusCode < 600;
    }
}

/**
 * Returns manga matching the query.
 */
export const searchManga: Mango.searchManga = (query: string) => {
    const httpResult = mango.get(
        `${mainUrl}/?s=${fixencodeURIComponent(query)}&post_type=wp-manga&op=&author=&artist=&release=&adult=`,
        {
            "Host": "zinmanga.com",
            "Referer": "https://zinmanga.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
        }
    );

    if (httpResult.status_code !== 200) {
        mango.raise(`HTTP status: ${httpResult.status_code} ${(HttpResponse.statusTexts as Record<string, string>)[httpResult.status_code.toString()] ?? 'Unknown'}`);
    }

    const manga = mango.css(httpResult.body, 'div.row.c-tabs-item__content').map<Mango.Manga | null>(manga => {
        const link = mango.css(mango.css(manga, 'div.post-title')[0] ?? '', 'a')[0];

        if (link === undefined) {
            return null;
        }

        const linkValue = mango.attribute(link, "href");

        if (linkValue === undefined) {
            return null;
        }

        const cover = mango.css(manga, 'img')[0];
        const authors = mango.css(mango.css(manga, 'div.mg_author')[0] ?? '', 'a');
        const genres = mango.css(manga, '.mg_genres .summary-content a');
        const status = mango.text(mango.css(manga, '.mg_status .summary-content')[0] ?? '');

        return {
            id: linkValue.trim().split('/').slice(-2, -1)[0]!,
            authors: authors.map(author => mango.text(author)),
            cover_url: mango.attribute(cover ?? '', 'data-src'),
            description: `Status: ${status}`,
            tags: genres.map(genre => mango.text(genre)),
            title: mango.text(link),
        } satisfies Mango.Manga;
    }).filter((value): value is Exclude<typeof value, null> => value !== null);

    return Mango.json_encode(manga);
}

/**
 * Returns chapters for manga with matching id.
 */
export const listChapters: Mango.listChapters = (manga_id: string) => {
    //const chapters: Array<Mango.Chapter> = [];

    const httpResult = mango.get(
        `${mainUrl}/manga/${manga_id}/`,
        {
            "Host": "zinmanga.com",
            "Referer": "https://zinmanga.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
        }
    );

    if (httpResult.status_code !== 200) {
        mango.raise(`HTTP status: ${httpResult.status_code} ${(HttpResponse.statusTexts as Record<string, string>)[httpResult.status_code.toString()] ?? 'Unknown'}`);
    }

    const chapters = mango.css(httpResult.body, 'li.wp-manga-chapter');
    //const summary

    return Mango.json_encode(chapters.map<Mango.Chapter|null>(chapter => {
        const link = mango.css(chapter, 'a')[0] ?? '';
        const url = mango.attribute(link, 'href');

        if (url === undefined) {
            // no href available on link, skipping chapter.
            return null;
        }

        const urlShards = url.split('/');
        // const id = urlShards[urlShards.length - 2];
        const id = urlShards.slice(-3).join('/');

        if (id === undefined) {
            return null;
        }

        return {
            chapter: mango.text(link).split(' ').filter(v=>v)[1] ?? '',
            groups: [],
            id: id,
            language: "",
            manga_title: mango.text(mango.css(httpResult.body, '.post-title h1')[0]||'').trim(),
            pages: 0,
            tags: [],
            title: mango.text(link).trim(),
            volume: "1",
        }
    }).filter((value): value is Exclude<typeof value, null> => value !== null));
}

let page: number = 0;
let pages: string[] = [];

/**
 * Returns chapter information used by Mango downloads.
 */
export const selectChapter: Mango.selectChapter = (chapter_id: string) => {
    const httpResult = mango.get(
        `${mainUrl}/manga/${chapter_id}`,
        {
            "Host": "zinmanga.com",
            "Referer": "https://zinmanga.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
        }
    );

    if (httpResult.status_code !== 200) {
        mango.raise(`HTTP status: ${httpResult.status_code} ${(HttpResponse.statusTexts as Record<string, string>)[httpResult.status_code.toString()] ?? 'Unknown'}`);
    }

    const titleElement = mango.css(httpResult.body, 'meta[property="og:title"]')[0];
    if (titleElement === undefined) {
        mango.raise('could not find manga title on chapter page!');
    }

    const mangaTitle = mango.attribute(titleElement, 'content');

    if (titleElement === undefined) {
        mango.raise('could not extract manga title on chapter page!');
    }

    const images = mango.css(httpResult.body, '.reading-content img');

    const chapterTextElement = mango.css(httpResult.body, 'li.active')[0];

    if (chapterTextElement === undefined) {
        mango.raise('could not find chapter number text');
    }

    const chapter: Mango.Chapter = {
        chapter: mango.text(chapterTextElement).trim().split(' ').slice(1).join(' '),
        id: chapter_id,
        manga_title: mango.text(titleElement),
        pages: images.length,
        title: mango.text(chapterTextElement).trim(),
    };

    pages = images.map((image, index) => {
        const src = mango.attribute(image, 'data-src');
        if (src === undefined) {
            mango.raise(`could not extract src attribute from the #${index} image element.`);
        }

        return src.trim();
    })

    page = 0;

    return Mango.json_encode(chapter);
};

/**
 * Gets current page from current capter in current manga, and increments the internal page index reference.
 */
export const nextPage: Mango.nextPage = () => {
    if (page >= pages.length) {
        return Mango.json_encode({});
    }

    const currentPage: Mango.Page = {
        filename: pages[page]!.split('/').slice(-1)[0]!,
        headers: {
            'Referer':'https://zinmanga.com/',
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
        },
        url: pages[page]!,
    };

    page++;

    return Mango.json_encode(currentPage);
};

const releaseDateRegex = /^(\d+)\/(\d+)\/(\d+)$/;
const humanReadableDifferenceRegex = /^(\d+)\s+(second|minute|hour|day)s?\s+ago$/;
export const chapterReleaseDateToTimestamp = (chapterReleaseDate: string): number => {
    let releaseDate: string[]|null = [];
    if ((releaseDate = chapterReleaseDate.match(releaseDateRegex)) !== null) {
        return Date.parse(`${releaseDate[3]}-${releaseDate[1]}-${releaseDate[2]}`);
    }

    if ((releaseDate = chapterReleaseDate.match(humanReadableDifferenceRegex))) {
        const amount = parseInt(releaseDate[1]!);
        switch (releaseDate['2']) {
            case 'second':
                return Date.now() - amount * 1000;
            case 'minute':
                return Date.now() - amount * 1000 * 60;
            case 'hour':
                return Date.now() - amount * 1000 * 60 * 60;
            case 'day':
                return Date.now() - amount * 1000 * 60 * 60 * 24;
            default:
                mango.raise(`unsupported duration unit: "${releaseDate[2]}".`);
        }
    }

    mango.raise(`Could not parse chapter release date string: "${chapterReleaseDate}".`)
}

/**
 * Returns all chapters newer than provided timestamp.
 */
export const newChapters: Mango.newChapters = (manga_id: string, after_timestamp: number) => {
    const httpResult = mango.get(
        `${mainUrl}/manga/${manga_id}/`,
        {
            "Host": "zinmanga.com",
            "Referer": "https://zinmanga.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
        }
    );

    if (httpResult.status_code !== 200) {
        mango.raise(`HTTP status: ${httpResult.status_code} ${(HttpResponse.statusTexts as Record<string, string>)[httpResult.status_code.toString()] ?? 'Unknown'}`);
    }

    const chapters = mango.css(httpResult.body, 'li.wp-manga-chapter');

    return Mango.json_encode(chapters.map(chapter => {
        const chapterReleaseDateElement = mango.css(chapter, '.chapter-release-date i')[0] || mango.css(chapter, '.chapter-release-date a')[0];
        if (chapterReleaseDateElement === undefined) {
            return null;
        }

        const chapterReleaseDate = mango.attribute(chapterReleaseDateElement, 'title') || mango.text(chapterReleaseDateElement);

        if (chapterReleaseDateToTimestamp(chapterReleaseDate.trim()) <= after_timestamp) {
            return null
        }

        const link = mango.css(chapter, 'a')[0] ?? '';
        const url = mango.attribute(link, 'href');

        if (url === undefined) {
            // no href available on link, skipping chapter.
            return null;
        }

        const urlShards = url.split('/');
        // const id = urlShards[urlShards.length - 2];
        const id = urlShards.slice(-3).join('/');

        if (id === undefined) {
            return null;
        }

        return {
            id: id,
            manga_title: mango.text(mango.css(httpResult.body, '.post-title h1')[0]||'').trim(),
            pages: 0,
            title: mango.text(link).trim(),
        } satisfies Mango.Chapter;
    }).filter((v):v is Exclude<typeof v, null> => v !== null));
};

global.searchManga = searchManga;
global.listChapters = listChapters;
global.selectChapter = selectChapter;
global.nextPage = nextPage;
global.newChapters = newChapters;
