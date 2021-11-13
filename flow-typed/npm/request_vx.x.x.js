// @flow strict
// flow-typed signature: 3b0e438c22fb4688ee2d2972791a64c8
// flow-typed version: <<STUB>>/request_v2.88.2/flow_v0.164.0

// import { data } from "cheerio/lib/api/attributes";

declare module 'request' {
  declare export type Callback = (error: Error | void | null, response?: http$IncomingMessage<>, body?: string | Buffer) => void;

  // https://github.com/ljharb/qs#parsing-objects
  declare type QSParseOptions = {|
    depth?: number,
    parameterLimit?: number,
    ignoreQueryPrefix?: boolean,
    delimiter?: string | RegExp,
    allowDots?: boolean,
    charset?: string,
    charsetSentinel?: boolean,
    interpretNumericEntities?: boolean
  |};

  declare type StringMap = {|
    [string]: string
  |};

  declare type FormData = {|
    [string]: string | Buffer | tty$ReadStream
  |};

  declare export type CookieJar = {|
    setCookie: () => void,
    getCookies: ( url: string, (err: Error, cookies: Array<string>) => void) => void
  |};

  declare export type OptionsObject = {|
    uri: string, // fully qualified uri or a parsed url object from url.parse()
    url?: string,
    baseUrl?: string, // fully qualified uri string used as the base url. Most useful with request.defaults, for example when you want to do many requests to the same domain. If baseUrl is https://example.com/api/, then requesting /end/point?test=true will fetch https://example.com/api/end/point?test=true. When baseUrl is given, uri must also be a string.
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS',
    headers?: StringMap, // http headers (default: {})
    qs?: StringMap, // object containing querystring values to be appended to the uri
    qsParseOptions?: QSParseOptions, // bject containing options to pass to the qs.parse method. Alternatively pass options to the querystring.parse method using this format {sep:';', eq:':', options:{}}
    qsStringifyOptions?: mixed, // too lazy to figure this out.
    useQueryString?: boolean,
    body?: Buffer | string | { ... },
    form?: StringMap | string,
    formData?: FormData,
    jar?: CookieJar,
    agentOptions?: http$agentOptions,
    json?: boolean,
  |};

  declare export type Options = string | OptionsObject;

  declare interface RequestHandler {
    ('response', (incomingMessage: http$IncomingMessage<>) => void): RequestHandler,
    ('data', (data: Buffer) => void): RequestHandler,
    ('error', (err: Error) => void): RequestHandler
  } 

  declare type RequestObject = {|
    on: RequestHandler    
  |};

  declare type ModuleExport = {
    (options: Options, callback?: Callback): RequestObject,
    jar: () => CookieJar
  };


  declare module.exports: ModuleExport;
}
