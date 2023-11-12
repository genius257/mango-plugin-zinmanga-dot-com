import mango, * as Mango from "@genius257/mango-plugin";

const mainUrl = "https://site.tld";

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
const searchManga: Mango.searchManga = (query: string) => {
    const httpResult = mango.get(`${mainUrl}/search?query=${fixencodeURIComponent(query)}`);

    if (httpResult.status_code !== 200) {
        mango.raise(`HTTP status: ${httpResult.status_code} ${(HttpResponse.statusTexts as Record<string, string>)[httpResult.status_code.toString()] ?? 'Unknown'}`);
    }

    const manga = mango.css(httpResult.body, 'div.item').map<Mango.Manga | null>(manga => {
        const link = mango.css(manga, 'a')[0];

        if (link === undefined) {
            return null;
        }

        return {
            id: mango.attribute(link, "title"),
            authors: [],
            cover_url: mango.attribute(mango.css(link, 'img')[0] ?? '', 'src'),
            description: "",
            tags: [],
            title: mango.attribute(link, "title"),
        } satisfies Mango.Manga;
    }).filter((value): value is Exclude<typeof value, null> => value !== null);

    return Mango.json_encode(manga);
}

/**
 * Returns chapters for manga with matching id.
 */
const listChapters: Mango.listChapters = (manga_id: string) => {
    const chapters: Array<Mango.Chapter> = [];

    return Mango.json_encode(chapters);
}

/**
 * Returns chapter information used by Mango downloads.
 */
const selectChapter: Mango.selectChapter = (id: string) => {
    const chapter: Mango.Chapter = {
        chapter: "",
        groups: [],
        id: "",
        language: "",
        manga_title: "",
        pages: 0,
        tags: [],
        title: "",
        volume: "",
    };

    return Mango.json_encode(chapter);
};

/**
 * Gets current page from current capter in current manga, and increments the internal page index reference.
 */
const nextPage: Mango.nextPage = () => {
    const page: Mango.Page = {
        filename: "",
        headers: {},
        url: "",
    };

    return Mango.json_encode(page);
};

/**
 * Returns all chapters newer than provided timestamp.
 */
const newChapters: Mango.newChapters = (manga_id: string, after_timestamp: number) => {
    const chapters: Array<Mango.Chapter> = [];

    return Mango.json_encode(chapters);
};
