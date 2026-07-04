var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder2) => {
  try {
    return decoder2(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder2(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");
function encode(string) {
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127) {
      throw new TypeError("non-ASCII string encountered in encode()");
    }
    bytes[i] = code;
  }
  return bytes;
}
__name(encode, "encode");

// node_modules/jose/dist/webapi/lib/base64.js
function encodeBase64(input) {
  if (Uint8Array.prototype.toBase64) {
    return input.toBase64();
  }
  const CHUNK_SIZE = 32768;
  const arr = [];
  for (let i = 0; i < input.length; i += CHUNK_SIZE) {
    arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(arr.join(""));
}
__name(encodeBase64, "encodeBase64");
function decodeBase64(encoded) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(encoded);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(decodeBase64, "decodeBase64");

// node_modules/jose/dist/webapi/util/base64url.js
function decode(input) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(typeof input === "string" ? input : decoder.decode(input), {
      alphabet: "base64url"
    });
  }
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}
__name(decode, "decode");
function encode2(input) {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }
  if (Uint8Array.prototype.toBase64) {
    return unencoded.toBase64({ alphabet: "base64url", omitPadding: true });
  }
  return encodeBase64(unencoded).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
__name(encode2, "encode");

// node_modules/jose/dist/webapi/lib/crypto_key.js
var unusable = /* @__PURE__ */ __name((name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`), "unusable");
var isAlgorithm = /* @__PURE__ */ __name((algorithm, name) => algorithm.name === name, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function checkHashLength(algorithm, expected) {
  const actual = getHashLength(algorithm.hash);
  if (actual !== expected)
    throw unusable(`SHA-${expected}`, "algorithm.hash");
}
__name(checkHashLength, "checkHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage)) {
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, usage) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "Ed25519":
    case "EdDSA": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      if (!isAlgorithm(key.algorithm, alg))
        throw unusable(alg);
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// node_modules/jose/dist/webapi/lib/invalid_key_input.js
function message(msg, actual, ...types) {
  types = types.filter(Boolean);
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else if (types.length === 2) {
    msg += `one of type ${types[0]} or ${types[1]}.`;
  } else {
    msg += `of type ${types[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalidKeyInput = /* @__PURE__ */ __name((actual, ...types) => message("Key must be ", actual, ...types), "invalidKeyInput");
var withAlg = /* @__PURE__ */ __name((alg, actual, ...types) => message(`Key for the ${alg} algorithm must be `, actual, ...types), "withAlg");

// node_modules/jose/dist/webapi/util/errors.js
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// node_modules/jose/dist/webapi/lib/is_key_like.js
var isCryptoKey = /* @__PURE__ */ __name((key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
}, "isCryptoKey");
var isKeyObject = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag] === "KeyObject", "isKeyObject");
var isKeyLike = /* @__PURE__ */ __name((key) => isCryptoKey(key) || isKeyObject(key), "isKeyLike");

// node_modules/jose/dist/webapi/lib/helpers.js
function assertNotSet(value, name) {
  if (value) {
    throw new TypeError(`${name} can only be called once`);
  }
}
__name(assertNotSet, "assertNotSet");
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
__name(decodeBase64url, "decodeBase64url");

// node_modules/jose/dist/webapi/lib/type_checks.js
var isObjectLike = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");
function isDisjoint(...headers) {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}
__name(isDisjoint, "isDisjoint");
var isJWK = /* @__PURE__ */ __name((key) => isObject(key) && typeof key.kty === "string", "isJWK");
var isPrivateJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && (key.kty === "AKP" && typeof key.priv === "string" || typeof key.d === "string"), "isPrivateJWK");
var isPublicJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && key.d === void 0 && key.priv === void 0, "isPublicJWK");
var isSecretJWK = /* @__PURE__ */ __name((key) => key.kty === "oct" && typeof key.k === "string", "isSecretJWK");

// node_modules/jose/dist/webapi/lib/signing.js
function checkKeyLength(alg, key) {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}
__name(checkKeyLength, "checkKeyLength");
function subtleAlgorithm(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: parseInt(alg.slice(-3), 10) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
    case "EdDSA":
      return { name: "Ed25519" };
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      return { name: alg };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleAlgorithm, "subtleAlgorithm");
async function getSigKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalidKeyInput(key, "CryptoKey", "KeyObject", "JSON Web Key"));
    }
    return crypto.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  checkSigCryptoKey(key, alg, usage);
  return key;
}
__name(getSigKey, "getSigKey");
async function sign(alg, key, data) {
  const cryptoKey = await getSigKey(alg, key, "sign");
  checkKeyLength(alg, cryptoKey);
  const signature = await crypto.subtle.sign(subtleAlgorithm(alg, cryptoKey.algorithm), cryptoKey, data);
  return new Uint8Array(signature);
}
__name(sign, "sign");
async function verify(alg, key, signature, data) {
  const cryptoKey = await getSigKey(alg, key, "verify");
  checkKeyLength(alg, cryptoKey);
  const algorithm = subtleAlgorithm(alg, cryptoKey.algorithm);
  try {
    return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}
__name(verify, "verify");

// node_modules/jose/dist/webapi/lib/jwk_to_key.js
var unsupportedAlg = 'Invalid or unsupported JWK "alg" (Algorithm) Parameter value';
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "AKP": {
      switch (jwk.alg) {
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          algorithm = { name: jwk.alg };
          keyUsages = jwk.priv ? ["sign"] : ["verify"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
        case "ES384":
        case "ES512":
          algorithm = {
            name: "ECDSA",
            namedCurve: { ES256: "P-256", ES384: "P-384", ES512: "P-521" }[jwk.alg]
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
        case "EdDSA":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
async function jwkToKey(jwk) {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const keyData = { ...jwk };
  if (keyData.kty !== "AKP") {
    delete keyData.alg;
  }
  delete keyData.use;
  return crypto.subtle.importKey("jwk", keyData, algorithm, jwk.ext ?? (jwk.d || jwk.priv ? false : true), jwk.key_ops ?? keyUsages);
}
__name(jwkToKey, "jwkToKey");

// node_modules/jose/dist/webapi/lib/normalize_key.js
var unusableForAlg = "given KeyObject instance cannot be used for this algorithm";
var cache;
var handleJWK = /* @__PURE__ */ __name(async (key, jwk, alg, freeze = false) => {
  cache ||= /* @__PURE__ */ new WeakMap();
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwkToKey({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "handleJWK");
var handleKeyObject = /* @__PURE__ */ __name((keyObject, alg) => {
  cache ||= /* @__PURE__ */ new WeakMap();
  let cached = cache.get(keyObject);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const isPublic = keyObject.type === "public";
  const extractable = isPublic ? true : false;
  let cryptoKey;
  if (keyObject.asymmetricKeyType === "x25519") {
    switch (alg) {
      case "ECDH-ES":
      case "ECDH-ES+A128KW":
      case "ECDH-ES+A192KW":
      case "ECDH-ES+A256KW":
        break;
      default:
        throw new TypeError(unusableForAlg);
    }
    cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, isPublic ? [] : ["deriveBits"]);
  }
  if (keyObject.asymmetricKeyType === "ed25519") {
    if (alg !== "EdDSA" && alg !== "Ed25519") {
      throw new TypeError(unusableForAlg);
    }
    cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
      isPublic ? "verify" : "sign"
    ]);
  }
  switch (keyObject.asymmetricKeyType) {
    case "ml-dsa-44":
    case "ml-dsa-65":
    case "ml-dsa-87": {
      if (alg !== keyObject.asymmetricKeyType.toUpperCase()) {
        throw new TypeError(unusableForAlg);
      }
      cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
        isPublic ? "verify" : "sign"
      ]);
    }
  }
  if (keyObject.asymmetricKeyType === "rsa") {
    let hash;
    switch (alg) {
      case "RSA-OAEP":
        hash = "SHA-1";
        break;
      case "RS256":
      case "PS256":
      case "RSA-OAEP-256":
        hash = "SHA-256";
        break;
      case "RS384":
      case "PS384":
      case "RSA-OAEP-384":
        hash = "SHA-384";
        break;
      case "RS512":
      case "PS512":
      case "RSA-OAEP-512":
        hash = "SHA-512";
        break;
      default:
        throw new TypeError(unusableForAlg);
    }
    if (alg.startsWith("RSA-OAEP")) {
      return keyObject.toCryptoKey({
        name: "RSA-OAEP",
        hash
      }, extractable, isPublic ? ["encrypt"] : ["decrypt"]);
    }
    cryptoKey = keyObject.toCryptoKey({
      name: alg.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
      hash
    }, extractable, [isPublic ? "verify" : "sign"]);
  }
  if (keyObject.asymmetricKeyType === "ec") {
    const nist = /* @__PURE__ */ new Map([
      ["prime256v1", "P-256"],
      ["secp384r1", "P-384"],
      ["secp521r1", "P-521"]
    ]);
    const namedCurve = nist.get(keyObject.asymmetricKeyDetails?.namedCurve);
    if (!namedCurve) {
      throw new TypeError(unusableForAlg);
    }
    const expectedCurve = { ES256: "P-256", ES384: "P-384", ES512: "P-521" };
    if (expectedCurve[alg] && namedCurve === expectedCurve[alg]) {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDSA",
        namedCurve
      }, extractable, [isPublic ? "verify" : "sign"]);
    }
    if (alg.startsWith("ECDH-ES")) {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDH",
        namedCurve
      }, extractable, isPublic ? [] : ["deriveBits"]);
    }
  }
  if (!cryptoKey) {
    throw new TypeError(unusableForAlg);
  }
  if (!cached) {
    cache.set(keyObject, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "handleKeyObject");
async function normalizeKey(key, alg) {
  if (key instanceof Uint8Array) {
    return key;
  }
  if (isCryptoKey(key)) {
    return key;
  }
  if (isKeyObject(key)) {
    if (key.type === "secret") {
      return key.export();
    }
    if ("toCryptoKey" in key && typeof key.toCryptoKey === "function") {
      try {
        return handleKeyObject(key, alg);
      } catch (err) {
        if (err instanceof TypeError) {
          throw err;
        }
      }
    }
    let jwk = key.export({ format: "jwk" });
    return handleJWK(key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k) {
      return decode(key.k);
    }
    return handleJWK(key, key, alg, true);
  }
  throw new Error("unreachable");
}
__name(normalizeKey, "normalizeKey");

// node_modules/jose/dist/webapi/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");

// node_modules/jose/dist/webapi/lib/validate_algorithms.js
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}
__name(validateAlgorithms, "validateAlgorithms");

// node_modules/jose/dist/webapi/lib/check_key_type.js
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0) {
    let expected;
    switch (usage) {
      case "sign":
      case "verify":
        expected = "sig";
        break;
      case "encrypt":
      case "decrypt":
        expected = "enc";
        break;
    }
    if (key.use !== expected) {
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
    }
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  }
  if (Array.isArray(key.key_ops)) {
    let expectedKeyOp;
    switch (true) {
      case (usage === "sign" || usage === "verify"):
      case alg === "dir":
      case alg.includes("CBC-HS"):
        expectedKeyOp = usage;
        break;
      case alg.startsWith("PBES2"):
        expectedKeyOp = "deriveBits";
        break;
      case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
        if (!alg.includes("GCM") && alg.endsWith("KW")) {
          expectedKeyOp = usage === "encrypt" ? "wrapKey" : "unwrapKey";
        } else {
          expectedKeyOp = usage;
        }
        break;
      case (usage === "encrypt" && alg.startsWith("RSA")):
        expectedKeyOp = "wrapKey";
        break;
      case usage === "decrypt":
        expectedKeyOp = alg.startsWith("RSA") ? "unwrapKey" : "deriveBits";
        break;
    }
    if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false) {
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
    }
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key instanceof Uint8Array)
    return;
  if (isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!isKeyLike(key)) {
    throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array"));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (isJWK(key)) {
    switch (usage) {
      case "decrypt":
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation must be a private JWK`);
      case "encrypt":
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation must be a public JWK`);
    }
  }
  if (!isKeyLike(key)) {
    throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key"));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (key.type === "public") {
    switch (usage) {
      case "sign":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
      case "decrypt":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
    }
  }
  if (key.type === "private") {
    switch (usage) {
      case "verify":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
      case "encrypt":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
    }
  }
}, "asymmetricTypeCheck");
function checkKeyType(alg, key, usage) {
  switch (alg.substring(0, 2)) {
    case "A1":
    case "A2":
    case "di":
    case "HS":
    case "PB":
      symmetricTypeCheck(alg, key, usage);
      break;
    default:
      asymmetricTypeCheck(alg, key, usage);
  }
}
__name(checkKeyType, "checkKeyType");

// node_modules/jose/dist/webapi/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!isDisjoint(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validateCrit(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validateAlgorithms("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  checkKeyType(alg, key, "verify");
  const data = concat(jws.protected !== void 0 ? encode(jws.protected) : new Uint8Array(), encode("."), typeof jws.payload === "string" ? b64 ? encode(jws.payload) : encoder.encode(jws.payload) : jws.payload);
  const signature = decodeBase64url(jws.signature, "signature", JWSInvalid);
  const k = await normalizeKey(key, alg);
  const verified = await verify(alg, k, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    payload = decodeBase64url(jws.payload, "payload", JWSInvalid);
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key: k };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// node_modules/jose/dist/webapi/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "epoch");
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
function secs(str) {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}
__name(secs, "secs");
function validateInput(label, input) {
  if (!Number.isFinite(input)) {
    throw new TypeError(`Invalid ${label} input`);
  }
  return input;
}
__name(validateInput, "validateInput");
var normalizeTyp = /* @__PURE__ */ __name((value) => {
  if (value.includes("/")) {
    return value.toLowerCase();
  }
  return `application/${value.toLowerCase()}`;
}, "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}
__name(validateClaimsSet, "validateClaimsSet");
var JWTClaimsBuilder = class {
  static {
    __name(this, "JWTClaimsBuilder");
  }
  #payload;
  constructor(payload) {
    if (!isObject(payload)) {
      throw new TypeError("JWT Claims Set MUST be an object");
    }
    this.#payload = structuredClone(payload);
  }
  data() {
    return encoder.encode(JSON.stringify(this.#payload));
  }
  get iss() {
    return this.#payload.iss;
  }
  set iss(value) {
    this.#payload.iss = value;
  }
  get sub() {
    return this.#payload.sub;
  }
  set sub(value) {
    this.#payload.sub = value;
  }
  get aud() {
    return this.#payload.aud;
  }
  set aud(value) {
    this.#payload.aud = value;
  }
  set jti(value) {
    this.#payload.jti = value;
  }
  set nbf(value) {
    if (typeof value === "number") {
      this.#payload.nbf = validateInput("setNotBefore", value);
    } else if (value instanceof Date) {
      this.#payload.nbf = validateInput("setNotBefore", epoch(value));
    } else {
      this.#payload.nbf = epoch(/* @__PURE__ */ new Date()) + secs(value);
    }
  }
  set exp(value) {
    if (typeof value === "number") {
      this.#payload.exp = validateInput("setExpirationTime", value);
    } else if (value instanceof Date) {
      this.#payload.exp = validateInput("setExpirationTime", epoch(value));
    } else {
      this.#payload.exp = epoch(/* @__PURE__ */ new Date()) + secs(value);
    }
  }
  set iat(value) {
    if (value === void 0) {
      this.#payload.iat = epoch(/* @__PURE__ */ new Date());
    } else if (value instanceof Date) {
      this.#payload.iat = validateInput("setIssuedAt", epoch(value));
    } else if (typeof value === "string") {
      this.#payload.iat = validateInput("setIssuedAt", epoch(/* @__PURE__ */ new Date()) + secs(value));
    } else {
      this.#payload.iat = validateInput("setIssuedAt", value);
    }
  }
};

// node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// node_modules/jose/dist/webapi/jws/flattened/sign.js
var FlattenedSign = class {
  static {
    __name(this, "FlattenedSign");
  }
  #payload;
  #protectedHeader;
  #unprotectedHeader;
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) {
      throw new TypeError("payload must be an instance of Uint8Array");
    }
    this.#payload = payload;
  }
  setProtectedHeader(protectedHeader) {
    assertNotSet(this.#protectedHeader, "setProtectedHeader");
    this.#protectedHeader = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    assertNotSet(this.#unprotectedHeader, "setUnprotectedHeader");
    this.#unprotectedHeader = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this.#protectedHeader && !this.#unprotectedHeader) {
      throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    }
    if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader)) {
      throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    }
    const joseHeader = {
      ...this.#protectedHeader,
      ...this.#unprotectedHeader
    };
    const extensions = validateCrit(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, this.#protectedHeader, joseHeader);
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this.#protectedHeader.b64;
      if (typeof b64 !== "boolean") {
        throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
      }
    }
    const { alg } = joseHeader;
    if (typeof alg !== "string" || !alg) {
      throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    }
    checkKeyType(alg, key, "sign");
    let payloadS;
    let payloadB;
    if (b64) {
      payloadS = encode2(this.#payload);
      payloadB = encode(payloadS);
    } else {
      payloadB = this.#payload;
      payloadS = "";
    }
    let protectedHeaderString;
    let protectedHeaderBytes;
    if (this.#protectedHeader) {
      protectedHeaderString = encode2(JSON.stringify(this.#protectedHeader));
      protectedHeaderBytes = encode(protectedHeaderString);
    } else {
      protectedHeaderString = "";
      protectedHeaderBytes = new Uint8Array();
    }
    const data = concat(protectedHeaderBytes, encode("."), payloadB);
    const k = await normalizeKey(key, alg);
    const signature = await sign(alg, k, data);
    const jws = {
      signature: encode2(signature),
      payload: payloadS
    };
    if (this.#unprotectedHeader) {
      jws.header = this.#unprotectedHeader;
    }
    if (this.#protectedHeader) {
      jws.protected = protectedHeaderString;
    }
    return jws;
  }
};

// node_modules/jose/dist/webapi/jws/compact/sign.js
var CompactSign = class {
  static {
    __name(this, "CompactSign");
  }
  #flattened;
  constructor(payload) {
    this.#flattened = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this.#flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    const jws = await this.#flattened.sign(key, options);
    if (jws.payload === void 0) {
      throw new TypeError("use the flattened module for creating JWS with b64: false");
    }
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
};

// node_modules/jose/dist/webapi/jwt/sign.js
var SignJWT = class {
  static {
    __name(this, "SignJWT");
  }
  #protectedHeader;
  #jwt;
  constructor(payload = {}) {
    this.#jwt = new JWTClaimsBuilder(payload);
  }
  setIssuer(issuer) {
    this.#jwt.iss = issuer;
    return this;
  }
  setSubject(subject) {
    this.#jwt.sub = subject;
    return this;
  }
  setAudience(audience) {
    this.#jwt.aud = audience;
    return this;
  }
  setJti(jwtId) {
    this.#jwt.jti = jwtId;
    return this;
  }
  setNotBefore(input) {
    this.#jwt.nbf = input;
    return this;
  }
  setExpirationTime(input) {
    this.#jwt.exp = input;
    return this;
  }
  setIssuedAt(input) {
    this.#jwt.iat = input;
    return this;
  }
  setProtectedHeader(protectedHeader) {
    this.#protectedHeader = protectedHeader;
    return this;
  }
  async sign(key, options) {
    const sig = new CompactSign(this.#jwt.data());
    sig.setProtectedHeader(this.#protectedHeader);
    if (Array.isArray(this.#protectedHeader?.crit) && this.#protectedHeader.crit.includes("b64") && this.#protectedHeader.b64 === false) {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    }
    return sig.sign(key, options);
  }
};

// src/turnstile.ts
async function verifyTurnstile(token, secret, ip) {
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "secret=" + encodeURIComponent(secret) + "&response=" + encodeURIComponent(token) + "&remoteip=" + encodeURIComponent(ip)
    });
    return (await res.json()).success === true;
  } catch {
    return false;
  }
}
__name(verifyTurnstile, "verifyTurnstile");

// src/metadata-store.ts
var CATEGORY = {
  CONFIG: "config",
  SHARES: "shares",
  DL_LOGS: "dl_logs",
  UL_LOGS: "ul_logs",
  UPLOAD_KEYS: "upload_keys",
  MULTIPART: "multipart",
  MODERATION_LOGS: "moderation_logs"
};
var PREFIX_TO_CATEGORY = [
  ["_config/", CATEGORY.CONFIG],
  ["_shares/", CATEGORY.SHARES],
  ["_dl_logs/", CATEGORY.DL_LOGS],
  ["_ul_logs/", CATEGORY.UL_LOGS],
  ["_upload_keys/", CATEGORY.UPLOAD_KEYS],
  ["_multipart/", CATEGORY.MULTIPART],
  ["_moderation_logs/", CATEGORY.MODERATION_LOGS]
];
function deriveCategory(key) {
  for (const [prefix, cat] of PREFIX_TO_CATEGORY) {
    if (key.startsWith(prefix)) return cat;
  }
  return CATEGORY.CONFIG;
}
__name(deriveCategory, "deriveCategory");
function extractIndexedFields(key, value) {
  const category = deriveCategory(key);
  return {
    category,
    expires_at: value?.expires ? Math.floor(Date.parse(value.expires) / 1e3) : null,
    key_path: value?.key ? String(value.key) : null,
    time_ms: value?.time ? Math.floor(Date.parse(value.time) / 1e3) : null,
    ip: value?.ip ? String(value.ip) : null,
    label: value?.label ? String(value.label) : null
  };
}
__name(extractIndexedFields, "extractIndexedFields");
var R2JsonMetadataStore = class {
  constructor(drive) {
    this.drive = drive;
  }
  drive;
  static {
    __name(this, "R2JsonMetadataStore");
  }
  kind = "r2";
  fullKey(key) {
    return key.endsWith(".json") ? key : `${key}.json`;
  }
  stripSuffix(key) {
    return key.endsWith(".json") ? key.slice(0, -5) : key;
  }
  async get(key) {
    if (!this.drive) return null;
    try {
      const obj = await this.drive.get(this.fullKey(key));
      if (!obj) return null;
      return JSON.parse(await obj.text());
    } catch {
      return null;
    }
  }
  async put(key, value) {
    if (!this.drive) throw new Error("R2 binding not configured");
    await this.drive.put(this.fullKey(key), JSON.stringify(value), {
      httpMetadata: { contentType: "application/json" }
    });
  }
  async delete(key) {
    if (!this.drive) return;
    const keys = (Array.isArray(key) ? key : [key]).map((k) => this.fullKey(k));
    await this.drive.delete(keys);
  }
  async list(prefix, options = {}) {
    if (!this.drive) return { keys: [] };
    const limit = options.limit ?? 1e3;
    const all = [];
    let cursor = options.cursor;
    while (true) {
      const listed = await this.drive.list({
        prefix,
        limit: Math.min(limit - all.length, 1e3),
        cursor
      });
      for (const obj of listed.objects) {
        all.push(this.stripSuffix(obj.key));
        if (all.length >= limit) break;
      }
      if (listed.truncated && all.length < limit && listed.cursor) {
        cursor = listed.cursor;
      } else {
        cursor = listed.truncated ? listed.cursor : void 0;
        break;
      }
    }
    return { keys: all, cursor };
  }
};
var D1MetadataStore = class {
  constructor(db) {
    this.db = db;
  }
  db;
  static {
    __name(this, "D1MetadataStore");
  }
  kind = "d1";
  async get(key) {
    try {
      const row = await this.db.prepare("SELECT value FROM kv WHERE id = ?").bind(key).first();
      if (!row) return null;
      return JSON.parse(row.value);
    } catch {
      return null;
    }
  }
  async put(key, value) {
    const idx = extractIndexedFields(key, value);
    const json = JSON.stringify(value);
    await this.db.prepare(
      `INSERT INTO kv (id, category, value, expires_at, key_path, time_ms, ip, label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           category = excluded.category,
           value = excluded.value,
           expires_at = excluded.expires_at,
           key_path = excluded.key_path,
           time_ms = excluded.time_ms,
           ip = excluded.ip,
           label = excluded.label,
           updated_at = unixepoch()`
    ).bind(
      key,
      idx.category,
      json,
      idx.expires_at,
      idx.key_path,
      idx.time_ms,
      idx.ip,
      idx.label
    ).run();
  }
  async delete(key) {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length === 0) return;
    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100);
      const placeholders = batch.map(() => "?").join(",");
      await this.db.prepare(`DELETE FROM kv WHERE id IN (${placeholders})`).bind(...batch).run();
    }
  }
  async list(prefix, options = {}) {
    const limit = options.limit ?? 1e3;
    const cursor = options.cursor;
    const likePrefix = prefix.replace(/%/g, "\\%") + "%";
    let rows;
    if (cursor) {
      rows = await this.db.prepare(
        `SELECT id FROM kv WHERE id LIKE ? ESCAPE '\\' AND id > ?
           ORDER BY id LIMIT ?`
      ).bind(likePrefix, cursor, limit).all().then((r) => r.results);
    } else {
      rows = await this.db.prepare(
        `SELECT id FROM kv WHERE id LIKE ? ESCAPE '\\'
           ORDER BY id LIMIT ?`
      ).bind(likePrefix, limit).all().then((r) => r.results);
    }
    const keys = rows.map((r) => r.id);
    const nextCursor = keys.length === limit ? keys[keys.length - 1] : void 0;
    return { keys, cursor: nextCursor };
  }
};
function createMetadataStore(env) {
  if (env.META_DB) {
    return new D1MetadataStore(env.META_DB);
  }
  return new R2JsonMetadataStore(env.DRIVE);
}
__name(createMetadataStore, "createMetadataStore");
var D1_INIT_SQL = `
CREATE TABLE IF NOT EXISTS kv (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,
    value       TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at  INTEGER,
    key_path    TEXT,
    time_ms     INTEGER,
    ip          TEXT,
    label       TEXT
)
`;
var D1_INIT_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_kv_category       ON kv(category)",
  "CREATE INDEX IF NOT EXISTS idx_kv_category_time  ON kv(category, time_ms DESC)",
  "CREATE INDEX IF NOT EXISTS idx_kv_category_key   ON kv(category, key_path)",
  "CREATE INDEX IF NOT EXISTS idx_kv_expires        ON kv(expires_at) WHERE expires_at IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS idx_kv_label          ON kv(label) WHERE label IS NOT NULL"
];
var D1_INIT_TRIGGER = `
CREATE TRIGGER IF NOT EXISTS kv_updated_at
    AFTER UPDATE ON kv
BEGIN
    UPDATE kv SET updated_at = unixepoch() WHERE id = NEW.id;
END
`;
var initPromise = null;
async function ensureD1Schema(env) {
  if (!env.META_DB) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const table = await env.META_DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kv'").first();
      if (!table) {
        await env.META_DB.exec(D1_INIT_SQL);
        for (const idx of D1_INIT_INDEXES) {
          await env.META_DB.exec(idx);
        }
        await env.META_DB.exec(D1_INIT_TRIGGER);
      }
    } catch (e) {
      console.error("D1 schema init failed:", e);
      initPromise = null;
      throw e;
    }
  })();
  return initPromise;
}
__name(ensureD1Schema, "ensureD1Schema");

// src/auth.ts
var ADMIN_CONFIG_KEY = "_config/admin";
async function sha256Hex(data) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function loadAdminConfig(meta) {
  return await meta.get(ADMIN_CONFIG_KEY);
}
__name(loadAdminConfig, "loadAdminConfig");
async function saveAdminConfig(meta, config) {
  config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await meta.put(ADMIN_CONFIG_KEY, config);
}
__name(saveAdminConfig, "saveAdminConfig");
async function verifyCredentials(env, username, password) {
  const meta = createMetadataStore(env);
  const adminConfig = await loadAdminConfig(meta);
  if (adminConfig) {
    const hash = await sha256Hex(password);
    return username === adminConfig.username && hash === adminConfig.passwordHash;
  }
  return username === env.ADMIN_USER && password === env.ADMIN_PASS;
}
__name(verifyCredentials, "verifyCredentials");
var authRoutes = new Hono2();
var loginAttempts = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return true;
  if (entry.blockedUntil > Date.now()) return false;
  if (entry.blockedUntil > 0 && entry.blockedUntil <= Date.now()) {
    loginAttempts.delete(ip);
    return true;
  }
  return true;
}
__name(checkRateLimit, "checkRateLimit");
function recordFailure(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  entry.count++;
  if (entry.count >= 5) {
    entry.blockedUntil = Date.now() + 5 * 60 * 1e3;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}
__name(recordFailure, "recordFailure");
function clearFailures(ip) {
  loginAttempts.delete(ip);
}
__name(clearFailures, "clearFailures");
authRoutes.post("/login", async (c) => {
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
  if (!checkRateLimit(ip)) {
    return c.json({ error: "\u767B\u5F55\u5C1D\u8BD5\u8FC7\u591A\uFF0C\u8BF7 5 \u5206\u949F\u540E\u518D\u8BD5" }, 429);
  }
  const body = await c.req.json();
  const { username, password, turnstile } = body;
  if (!turnstile) {
    return c.json({ error: "\u8BF7\u5B8C\u6210\u4EBA\u673A\u9A8C\u8BC1" }, 400);
  }
  const turnstileValid = await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip);
  if (!turnstileValid) {
    return c.json({ error: "\u4EBA\u673A\u9A8C\u8BC1\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" }, 403);
  }
  const valid = await verifyCredentials(c.env, username, password);
  if (!valid) {
    recordFailure(ip);
    return c.json({ error: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" }, 401);
  }
  clearFailures(ip);
  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const token = await new SignJWT({ sub: "admin", role: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("24h").sign(secret);
  return c.json({ token });
});
authRoutes.get("/admin-config", jwtAuth, async (c) => {
  const meta = createMetadataStore(c.env);
  const adminConfig = await loadAdminConfig(meta);
  const username = adminConfig?.username || c.env.ADMIN_USER;
  return c.json({ username, hasCustomConfig: !!adminConfig });
});
authRoutes.put("/admin-config", jwtAuth, async (c) => {
  const body = await c.req.json();
  const { username, currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return c.json({ error: "\u8BF7\u586B\u5199\u5F53\u524D\u5BC6\u7801\u548C\u65B0\u5BC6\u7801" }, 400);
  }
  if (newPassword.length < 6) {
    return c.json({ error: "\u65B0\u5BC6\u7801\u957F\u5EA6\u4E0D\u80FD\u5C11\u4E8E 6 \u4F4D" }, 400);
  }
  const meta = createMetadataStore(c.env);
  const adminConfig = await loadAdminConfig(meta);
  const currentUsername = adminConfig?.username || c.env.ADMIN_USER;
  const valid = await verifyCredentials(c.env, currentUsername, currentPassword);
  if (!valid) {
    return c.json({ error: "\u5F53\u524D\u5BC6\u7801\u9519\u8BEF" }, 401);
  }
  const newConfig = {
    username: username || currentUsername,
    passwordHash: await sha256Hex(newPassword),
    updatedAt: ""
  };
  await saveAdminConfig(meta, newConfig);
  return c.json({ ok: true });
});
async function jwtAuth(c, next) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "\u672A\u6388\u6743" }, 401);
  }
  try {
    const token = auth.slice(7);
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json({ error: "Token \u65E0\u6548\u6216\u5DF2\u8FC7\u671F" }, 401);
  }
}
__name(jwtAuth, "jwtAuth");

// src/upload-utils.ts
function getContentType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const types = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml"
  };
  return types[ext] || "application/octet-stream";
}
__name(getContentType, "getContentType");
async function uniqueKey(storage, path, filename) {
  if (!path.endsWith("/")) path += "/";
  const head = /* @__PURE__ */ __name(async (key) => {
    if ("head" in storage && typeof storage.head === "function") {
      const result = await storage.head(key);
      return result;
    }
    return null;
  }, "head");
  const baseKey = path + filename;
  const exists = await head(baseKey);
  if (!exists) return baseKey;
  const lastDot = filename.lastIndexOf(".");
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot) : "";
  for (let i = 1; i < 1e3; i++) {
    const candidate = path + name + " (" + i + ")" + ext;
    const h = await head(candidate);
    if (!h) return candidate;
  }
  return path + name + " (" + Date.now() + ")" + ext;
}
__name(uniqueKey, "uniqueKey");

// src/s3-upload.ts
function buildS3Url(cfg, key) {
  const encoded = "/" + encodeURIComponent(key).replace(/%2F/g, "/");
  if (cfg.pathStyle) {
    const host = cfg.endpoint;
    const path = "/" + cfg.bucket + encoded;
    return { host, url: `https://${host}${path}`, path };
  } else {
    const host = `${cfg.bucket}.${cfg.endpoint}`;
    return { host, url: `https://${host}${encoded}`, path: encoded };
  }
}
__name(buildS3Url, "buildS3Url");
async function s3PutObject(cfg, key, body, contentType) {
  const { host, url, path } = buildS3Url(cfg, key);
  const headers = {
    "Host": host,
    "Content-Type": contentType,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": amzDate()
  };
  const authHeader = await signRequest(cfg, "PUT", path, headers, "UNSIGNED-PAYLOAD");
  headers["Authorization"] = authHeader;
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`S3 PUT failed: ${res.status} ${res.statusText} - ${errText}`);
    return false;
  }
  return true;
}
__name(s3PutObject, "s3PutObject");
async function s3CreateMultipart(cfg, key, contentType) {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = "uploads";
  const fullPath = path + "?" + qs;
  const fullUrl = url + "?uploads";
  const headers = {
    "Host": host,
    "Content-Type": contentType,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": amzDate()
  };
  headers["Authorization"] = await signRequest(cfg, "POST", fullPath, headers, "UNSIGNED-PAYLOAD");
  const res = await fetch(fullUrl, { method: "POST", headers });
  if (!res.ok) return null;
  const xml = await res.text();
  const match2 = xml.match(/<UploadId>(.+?)<\/UploadId>/);
  return match2 ? match2[1] : null;
}
__name(s3CreateMultipart, "s3CreateMultipart");
async function s3UploadPart(cfg, key, uploadId, partNumber, body) {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = `partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`;
  const fullPath = path + "?" + qs;
  const fullUrl = url + "?" + qs;
  const headers = {
    "Host": host,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": amzDate()
  };
  headers["Authorization"] = await signRequest(cfg, "PUT", fullPath, headers, "UNSIGNED-PAYLOAD");
  const res = await fetch(fullUrl, { method: "PUT", headers, body });
  if (!res.ok) return null;
  return res.headers.get("etag");
}
__name(s3UploadPart, "s3UploadPart");
async function s3CompleteMultipart(cfg, key, uploadId, parts) {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = `uploadId=${encodeURIComponent(uploadId)}`;
  const fullPath = path + "?" + qs;
  const fullUrl = url + "?" + qs;
  const xmlParts = parts.sort((a, b) => a.partNumber - b.partNumber).map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`).join("");
  const body = `<CompleteMultipartUpload>${xmlParts}</CompleteMultipartUpload>`;
  const headers = {
    "Host": host,
    "Content-Type": "application/xml",
    "x-amz-content-sha256": await sha256Hex2(body),
    "x-amz-date": amzDate()
  };
  headers["Authorization"] = await signRequest(cfg, "POST", fullPath, headers, headers["x-amz-content-sha256"]);
  const res = await fetch(fullUrl, { method: "POST", headers, body });
  return res.ok;
}
__name(s3CompleteMultipart, "s3CompleteMultipart");
async function s3AbortMultipart(cfg, key, uploadId) {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = `uploadId=${encodeURIComponent(uploadId)}`;
  const fullPath = path + "?" + qs;
  const fullUrl = url + "?" + qs;
  const headers = {
    "Host": host,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": amzDate()
  };
  headers["Authorization"] = await signRequest(cfg, "DELETE", fullPath, headers, "UNSIGNED-PAYLOAD");
  const res = await fetch(fullUrl, { method: "DELETE", headers });
  return res.ok;
}
__name(s3AbortMultipart, "s3AbortMultipart");
async function signRequest(cfg, method, path, headers, payloadHash) {
  const now = headers["x-amz-date"] || amzDate();
  const dateStamp = now.slice(0, 8);
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const signedHeaderNames = Object.keys(headers).map((k) => k.toLowerCase()).filter((k) => k === "host" || k.startsWith("x-amz-") || k === "content-type").sort();
  const signedHeaders = signedHeaderNames.join(";");
  const headerMap = {};
  for (const [k, v] of Object.entries(headers)) {
    headerMap[k.toLowerCase()] = v.trim();
  }
  const canonicalHeaders = signedHeaderNames.map((k) => `${k}:${headerMap[k]}`).join("\n") + "\n";
  const [canonicalUri, rawQuery] = path.split("?");
  const canonicalQS = rawQuery ? rawQuery.split("&").sort().join("&") : "";
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQS,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    now,
    credentialScope,
    await sha256Hex2(canonicalRequest)
  ].join("\n");
  const signingKey = await getSigningKey(cfg.secretKey, dateStamp, cfg.region, "s3");
  const signature = await hmacHex(signingKey, stringToSign);
  return `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}
__name(signRequest, "signRequest");
function amzDate() {
  return (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "") + "Z";
}
__name(amzDate, "amzDate");
async function sha256Hex2(data) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex2, "sha256Hex");
async function hmacBytes(key, data) {
  const k = key instanceof Uint8Array ? await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]) : key;
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}
__name(hmacBytes, "hmacBytes");
async function hmacHex(key, data) {
  const bytes = await hmacBytes(key, data);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex, "hmacHex");
async function getSigningKey(secret, date, region, service) {
  const enc = new TextEncoder();
  const kSecret = await crypto.subtle.importKey("raw", enc.encode("AWS4" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kDate = await hmacBytes(kSecret, date);
  const kDateKey = await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kRegion = await hmacBytes(kDateKey, region);
  const kRegionKey = await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kService = await hmacBytes(kRegionKey, service);
  const kServiceKey = await crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await hmacBytes(kServiceKey, "aws4_request");
}
__name(getSigningKey, "getSigningKey");

// src/storage.ts
var _runtimeConfig = null;
async function loadRuntimeConfig(drive) {
  try {
    if (_runtimeConfig) return _runtimeConfig;
    const obj = await drive.get("_config/storage.json");
    if (!obj) return null;
    const data = JSON.parse(await obj.text());
    if (data.backends?.length > 0) {
      _runtimeConfig = { backends: data.backends, credentials: data.credentials || {} };
      return _runtimeConfig;
    }
    return null;
  } catch {
    return null;
  }
}
__name(loadRuntimeConfig, "loadRuntimeConfig");
var PROVIDERS = {
  aws: {
    name: "AWS S3",
    endpoint: "s3.amazonaws.com",
    regions: [
      "us-east-1",
      "us-east-2",
      "us-west-1",
      "us-west-2",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-central-1",
      "eu-north-1",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-northeast-1",
      "ap-northeast-2",
      "ap-northeast-3",
      "ap-south-1",
      "sa-east-1",
      "ca-central-1",
      "me-south-1",
      "af-south-1"
    ],
    pathStyle: false
  },
  r2: {
    name: "Cloudflare R2",
    endpoint: "<account_id>.r2.cloudflarestorage.com",
    regions: ["auto"],
    pathStyle: false,
    endpointPlaceholder: "YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
  },
  b2: {
    name: "Backblaze B2",
    endpoint: "s3.<region>.backblazeb2.com",
    regions: ["us-west-004", "us-west-002", "eu-central-003", "ap-southeast-002"],
    pathStyle: false,
    endpointPlaceholder: "s3.us-west-004.backblazeb2.com"
  },
  minio: {
    name: "MinIO (\u81EA\u5EFA)",
    endpoint: "",
    regions: ["us-east-1"],
    pathStyle: true,
    endpointPlaceholder: "minio.example.com:9000"
  },
  alibaba: {
    name: "\u963F\u91CC\u4E91 OSS",
    endpoint: "oss-<region>.aliyuncs.com",
    regions: [
      "cn-hangzhou",
      "cn-shanghai",
      "cn-beijing",
      "cn-shenzhen",
      "cn-guangzhou",
      "cn-chengdu",
      "cn-hongkong",
      "ap-southeast-1",
      "ap-southeast-5",
      "us-west-1",
      "us-east-1",
      "eu-central-1",
      "eu-west-1"
    ],
    pathStyle: false,
    endpointPlaceholder: "oss-cn-hangzhou.aliyuncs.com"
  },
  tencent: {
    name: "\u817E\u8BAF\u4E91 COS",
    endpoint: "cos.<region>.myqcloud.com",
    regions: [
      "ap-guangzhou",
      "ap-shanghai",
      "ap-beijing",
      "ap-chengdu",
      "ap-nanjing",
      "ap-hongkong",
      "ap-singapore",
      "ap-mumbai",
      "na-siliconvalley",
      "eu-frankfurt",
      "sa-saopaulo"
    ],
    pathStyle: false,
    endpointPlaceholder: "cos.ap-guangzhou.myqcloud.com"
  },
  wasabi: {
    name: "Wasabi",
    endpoint: "s3.<region>.wasabisys.com",
    regions: ["us-east-1", "us-east-2", "us-west-1", "eu-central-1", "eu-west-1", "eu-west-2", "ap-northeast-1", "ap-northeast-2"],
    pathStyle: false,
    endpointPlaceholder: "s3.us-east-1.wasabisys.com"
  },
  digitalocean: {
    name: "DigitalOcean Spaces",
    endpoint: "<region>.digitaloceanspaces.com",
    regions: ["nyc3", "nyc1", "sfo3", "sfo2", "ams3", "sgp1", "lon1", "fra1", "blr1", "syd1"],
    pathStyle: false,
    endpointPlaceholder: "nyc3.digitaloceanspaces.com"
  },
  volcengine: {
    name: "\u706B\u5C71\u5F15\u64CE TOS",
    endpoint: "tos-<region>.volces.com",
    regions: ["cn-beijing", "cn-shanghai", "cn-guangzhou", "ap-southeast-1"],
    pathStyle: false,
    endpointPlaceholder: "tos-cn-beijing.volces.com"
  },
  custom: {
    name: "\u81EA\u5B9A\u4E49 S3 \u517C\u5BB9",
    endpoint: "",
    regions: ["us-east-1"],
    pathStyle: false,
    endpointPlaceholder: "your-s3-endpoint.com"
  }
};
function detectPathStyle(endpoint, provider) {
  if (provider && PROVIDERS[provider]?.pathStyle) {
    return true;
  }
  const host = endpoint.split("://").pop() || endpoint;
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return true;
  }
  const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/;
  if (ipPattern.test(host)) {
    return true;
  }
  const portMatch = host.match(/:(\d+)$/);
  if (portMatch) {
    const port = parseInt(portMatch[1], 10);
    if (port !== 80 && port !== 443) {
      return true;
    }
  }
  return false;
}
__name(detectPathStyle, "detectPathStyle");
function parseStorageConfig(env) {
  const backends = [];
  let configs = [];
  if (env.STORAGE_CONFIG) {
    try {
      configs = JSON.parse(env.STORAGE_CONFIG);
    } catch (e) {
      console.error("STORAGE_CONFIG JSON \u89E3\u6790\u5931\u8D25:", e);
    }
  }
  let credentials = {};
  if (env.S3_CREDENTIALS) {
    try {
      credentials = JSON.parse(env.S3_CREDENTIALS);
    } catch (e) {
      console.error("S3_CREDENTIALS JSON \u89E3\u6790\u5931\u8D25:", e);
    }
  }
  for (const cfg of configs) {
    if (cfg.pathStyle === void 0 || cfg.pathStyle === null) {
      cfg.pathStyle = detectPathStyle(cfg.endpoint, cfg.provider);
    }
    backends.push({
      name: cfg.name,
      config: cfg,
      credentials: credentials[cfg.name] || void 0
    });
  }
  return backends;
}
__name(parseStorageConfig, "parseStorageConfig");
function toS3Config(backend) {
  if (!backend.credentials) return null;
  return {
    endpoint: backend.config.endpoint,
    bucket: backend.config.bucket,
    region: backend.config.region,
    accessKey: backend.credentials.accessKey,
    secretKey: backend.credentials.secretKey,
    pathStyle: backend.config.pathStyle
  };
}
__name(toS3Config, "toS3Config");
function getLegacyS3Cfg(env) {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) return null;
  return {
    endpoint: env.S3_ENDPOINT,
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    pathStyle: detectPathStyle(env.S3_ENDPOINT)
  };
}
__name(getLegacyS3Cfg, "getLegacyS3Cfg");
async function getAllS3ConfigsAsync(env, drive) {
  const configs = [];
  if (drive) {
    const runtime = await loadRuntimeConfig(drive);
    if (runtime) {
      for (const b of runtime.backends) {
        const cred = runtime.credentials[b.name];
        if (!cred) continue;
        const pathStyle = b.pathStyle !== void 0 ? b.pathStyle : detectPathStyle(b.endpoint, b.provider);
        configs.push({
          endpoint: b.endpoint,
          bucket: b.bucket,
          region: b.region,
          accessKey: cred.accessKey,
          secretKey: cred.secretKey,
          pathStyle
        });
      }
      if (configs.length > 0) return configs;
    }
  }
  const backends = parseStorageConfig(env);
  for (const b of backends) {
    const cfg = toS3Config(b);
    if (cfg) configs.push(cfg);
  }
  if (configs.length === 0) {
    const legacy = getLegacyS3Cfg(env);
    if (legacy) configs.push(legacy);
  }
  return configs;
}
__name(getAllS3ConfigsAsync, "getAllS3ConfigsAsync");

// src/storage-engine.ts
var R2StorageEngine = class {
  constructor(bucket) {
    this.bucket = bucket;
  }
  bucket;
  static {
    __name(this, "R2StorageEngine");
  }
  async list(prefix, options) {
    const listed = await this.bucket.list({
      prefix,
      delimiter: options?.delimiter,
      limit: options?.limit,
      cursor: options?.cursor
    });
    return {
      objects: listed.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded?.toISOString(),
        contentType: obj.httpMetadata?.contentType
      })),
      delimitedPrefixes: listed.delimitedPrefixes,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : void 0
    };
  }
  async get(key) {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return {
      text: /* @__PURE__ */ __name(() => obj.text(), "text"),
      arrayBuffer: /* @__PURE__ */ __name(() => obj.arrayBuffer(), "arrayBuffer"),
      body: obj.body,
      size: obj.size,
      httpMetadata: obj.httpMetadata
    };
  }
  async head(key) {
    const obj = await this.bucket.head(key);
    if (!obj) return null;
    return {
      key: obj.key,
      size: obj.size,
      contentType: obj.httpMetadata?.contentType,
      uploaded: obj.uploaded?.toISOString()
    };
  }
  async put(key, data, options) {
    await this.bucket.put(key, data, {
      httpMetadata: options?.contentType ? { contentType: options.contentType } : void 0,
      customMetadata: options?.customMetadata
    });
  }
  async delete(key) {
    if (Array.isArray(key)) {
      if (key.length > 0) await this.bucket.delete(key);
    } else {
      await this.bucket.delete(key);
    }
  }
  async createMultipartUpload(key, options) {
    const mp = await this.bucket.createMultipartUpload(key, {
      httpMetadata: options?.contentType ? { contentType: options.contentType } : void 0
    });
    return {
      uploadId: mp.uploadId,
      key,
      uploadPart: /* @__PURE__ */ __name((partNumber, data) => mp.uploadPart(partNumber, data), "uploadPart"),
      complete: /* @__PURE__ */ __name(async (parts) => {
        const obj = await mp.complete(parts);
        return { key: obj.key, size: obj.size };
      }, "complete"),
      abort: /* @__PURE__ */ __name(() => mp.abort(), "abort")
    };
  }
};
var S3StorageEngine = class {
  constructor(cfg) {
    this.cfg = cfg;
  }
  cfg;
  static {
    __name(this, "S3StorageEngine");
  }
  buildUrl(key) {
    const encoded = "/" + encodeURIComponent(key).replace(/%2F/g, "/");
    if (this.cfg.pathStyle) {
      const host = this.cfg.endpoint;
      const path = "/" + this.cfg.bucket + encoded;
      return { host, url: `https://${host}${path}`, path };
    } else {
      const host = `${this.bucket}.${this.cfg.endpoint}`;
      return { host, url: `https://${host}${encoded}`, path: encoded };
    }
  }
  get bucket() {
    return this.cfg.bucket;
  }
  async sign(method, path, headers, payloadHash) {
    const now = headers["x-amz-date"] || this.amzDate();
    const dateStamp = now.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;
    const signedHeaderNames = Object.keys(headers).map((k) => k.toLowerCase()).filter((k) => k === "host" || k.startsWith("x-amz-") || k === "content-type").sort();
    const signedHeaders = signedHeaderNames.join(";");
    const headerMap = {};
    for (const [k, v] of Object.entries(headers)) headerMap[k.toLowerCase()] = v.trim();
    const canonicalHeaders = signedHeaderNames.map((k) => `${k}:${headerMap[k]}`).join("\n") + "\n";
    const [canonicalUri, rawQuery] = path.split("?");
    const canonicalQS = rawQuery ? rawQuery.split("&").sort().join("&") : "";
    const canonicalRequest = [method, canonicalUri, canonicalQS, canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", now, credentialScope, await this.sha256Hex(canonicalRequest)].join("\n");
    const signingKey = await this.getSigningKey(this.cfg.secretKey, dateStamp, this.cfg.region, "s3");
    const signature = await this.hmacHex(signingKey, stringToSign);
    return `AWS4-HMAC-SHA256 Credential=${this.cfg.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }
  amzDate() {
    return (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "") + "Z";
  }
  async sha256Hex(data) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async hmacBytes(key, data) {
    const k = key instanceof Uint8Array ? await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]) : key;
    return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  }
  async hmacHex(key, data) {
    return [...await this.hmacBytes(key, data)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async getSigningKey(secret, date, region, service) {
    const enc = new TextEncoder();
    const kSecret = await crypto.subtle.importKey("raw", enc.encode("AWS4" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const kDate = await this.hmacBytes(kSecret, date);
    const kDateKey = await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const kRegion = await this.hmacBytes(kDateKey, region);
    const kRegionKey = await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const kService = await this.hmacBytes(kRegionKey, service);
    const kServiceKey = await crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return await this.hmacBytes(kServiceKey, "aws4_request");
  }
  async list(prefix, options) {
    const host = this.cfg.pathStyle ? this.cfg.endpoint : `${this.bucket}.${this.cfg.endpoint}`;
    const bucketPath = this.cfg.pathStyle ? `/${this.bucket}` : "";
    const params = new URLSearchParams({
      "list-type": "2",
      prefix,
      "max-keys": String(options?.limit || 1e3)
    });
    if (options?.delimiter) params.set("delimiter", options.delimiter);
    if (options?.cursor) params.set("continuation-token", options.cursor);
    const path = bucketPath + "?" + params.toString();
    const headers = {
      "Host": host,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      "x-amz-date": this.amzDate()
    };
    headers["Authorization"] = await this.sign("GET", path, headers, "UNSIGNED-PAYLOAD");
    const res = await fetch(`https://${host}${path}`, { method: "GET", headers });
    if (!res.ok) {
      console.error(`S3 ListObjects failed: ${res.status} ${res.statusText} (${prefix})`);
      return { objects: [], delimitedPrefixes: [], truncated: false };
    }
    const xml = await res.text();
    const objects = [];
    const contents = xml.split("<Contents>").slice(1);
    for (const c of contents) {
      const key = this.xmlValue(c, "Key");
      const size = parseInt(this.xmlValue(c, "Size") || "0", 10);
      const lastModified = this.xmlValue(c, "LastModified");
      if (key && !key.endsWith("/")) {
        objects.push({ key, size, uploaded: lastModified });
      }
    }
    const prefixes = [];
    const cpfx = xml.split("<CommonPrefixes>").slice(1);
    for (const p of cpfx) {
      const pfx = this.xmlValue(p, "Prefix");
      if (pfx) prefixes.push(pfx);
    }
    const isTruncated = xml.includes("<IsTruncated>true</IsTruncated>");
    const nextToken = this.xmlValue(xml, "NextContinuationToken");
    return {
      objects,
      delimitedPrefixes: prefixes,
      truncated: isTruncated,
      cursor: isTruncated ? nextToken : void 0
    };
  }
  async get(key) {
    const { host, url, path } = this.buildUrl(key);
    const headers = {
      "Host": host,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      "x-amz-date": this.amzDate()
    };
    headers["Authorization"] = await this.sign("GET", path, headers, "UNSIGNED-PAYLOAD");
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return {
      text: /* @__PURE__ */ __name(() => Promise.resolve(new TextDecoder().decode(buf)), "text"),
      arrayBuffer: /* @__PURE__ */ __name(() => Promise.resolve(buf), "arrayBuffer"),
      size: buf.byteLength,
      httpMetadata: {
        contentType: res.headers.get("content-type") || void 0,
        contentLanguage: res.headers.get("content-language") || void 0,
        contentDisposition: res.headers.get("content-disposition") || void 0,
        contentEncoding: res.headers.get("content-encoding") || void 0,
        cacheControl: res.headers.get("cache-control") || void 0
      }
    };
  }
  async head(key) {
    const { host, url, path } = this.buildUrl(key);
    const headers = {
      "Host": host,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      "x-amz-date": this.amzDate()
    };
    headers["Authorization"] = await this.sign("HEAD", path, headers, "UNSIGNED-PAYLOAD");
    const res = await fetch(url, { method: "HEAD", headers });
    if (!res.ok) return null;
    return {
      key,
      size: parseInt(res.headers.get("content-length") || "0", 10),
      contentType: res.headers.get("content-type") || void 0,
      uploaded: res.headers.get("last-modified") || void 0
    };
  }
  async put(key, data, options) {
    const body = typeof data === "string" ? new TextEncoder().encode(data) : data;
    await s3PutObject(this.cfg, key, body, options?.contentType || "application/octet-stream");
  }
  async delete(key) {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      const { host, url, path } = this.buildUrl(k);
      const headers = {
        "Host": host,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        "x-amz-date": this.amzDate()
      };
      headers["Authorization"] = await this.sign("DELETE", path, headers, "UNSIGNED-PAYLOAD");
      await fetch(url, { method: "DELETE", headers }).catch(() => {
      });
    }
  }
  async createMultipartUpload(key, options) {
    const cfg = this.cfg;
    const contentType = options?.contentType || "application/octet-stream";
    const uploadId = await s3CreateMultipart(cfg, key, contentType);
    if (!uploadId) throw new Error("S3 CreateMultipartUpload failed");
    const parts = [];
    const self = this;
    return {
      uploadId,
      key,
      async uploadPart(partNumber, data) {
        const etag = await s3UploadPart(cfg, key, uploadId, partNumber, data);
        if (!etag) throw new Error(`S3 uploadPart ${partNumber} failed`);
        const p = { partNumber, etag };
        parts.push(p);
        return p;
      },
      async complete(completeParts) {
        await s3CompleteMultipart(cfg, key, uploadId, completeParts);
        let size = 0;
        try {
          const head = await self.head(key);
          if (head) size = head.size;
        } catch {
        }
        return { key, size };
      },
      async abort() {
        const { host, url, path } = self.buildUrl(key);
        const qs = `uploadId=${encodeURIComponent(uploadId)}`;
        const fullPath = path + "?" + qs;
        const fullUrl = url + "?" + qs;
        const headers = {
          "Host": host,
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
          "x-amz-date": self.amzDate()
        };
        headers["Authorization"] = await self.sign("DELETE", fullPath, headers, "UNSIGNED-PAYLOAD");
        await fetch(fullUrl, { method: "DELETE", headers }).catch(() => {
        });
      }
    };
  }
  xmlValue(xml, tag2) {
    const match2 = xml.match(new RegExp(`<${tag2}>(.+?)</${tag2}>`));
    if (!match2) return void 0;
    return match2[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
};
async function createStorageEngine(env) {
  if (env.DRIVE) {
    return new R2StorageEngine(env.DRIVE);
  }
  const s3Cfgs = await getAllS3ConfigsAsync(env, env.DRIVE);
  if (s3Cfgs.length > 0) {
    return new S3StorageEngine(s3Cfgs[0]);
  }
  throw new Error("\u6CA1\u6709\u53EF\u7528\u7684\u5B58\u50A8\u540E\u7AEF\uFF1A\u8BF7\u914D\u7F6E R2 \u6216 S3 \u517C\u5BB9\u5B58\u50A8");
}
__name(createStorageEngine, "createStorageEngine");
async function createStorageEngineForBackend(env, backendName) {
  if (!backendName || backendName === "r2") {
    if (env.DRIVE) return new R2StorageEngine(env.DRIVE);
    return createStorageEngine(env);
  }
  if (env.DRIVE) {
    const runtime = await loadRuntimeConfig(env.DRIVE);
    if (runtime) {
      const backend = runtime.backends.find((b) => b.name === backendName);
      if (backend) {
        const cred = runtime.credentials[backend.name];
        if (cred) {
          const pathStyle = backend.pathStyle !== void 0 ? backend.pathStyle : detectPathStyle(backend.endpoint, backend.provider);
          return new S3StorageEngine({
            endpoint: backend.endpoint,
            bucket: backend.bucket,
            region: backend.region,
            accessKey: cred.accessKey,
            secretKey: cred.secretKey,
            pathStyle
          });
        }
      }
    }
  }
  const allCfgs = await getAllS3ConfigsAsync(env, env.DRIVE);
  return createStorageEngine(env);
}
__name(createStorageEngineForBackend, "createStorageEngineForBackend");

// src/files.ts
var filesRoutes = new Hono2();
filesRoutes.use("*", jwtAuth);
async function getEngine(env, backend) {
  return backend ? createStorageEngineForBackend(env, backend) : createStorageEngine(env);
}
__name(getEngine, "getEngine");
filesRoutes.get("/", async (c) => {
  try {
    const backend = c.req.query("backend") || "";
    const engine = await getEngine(c.env, backend);
    const prefix = c.req.query("prefix") || "uploads/";
    const listed = await engine.list(prefix, { delimiter: "/" });
    const files = listed.objects.filter((obj) => !obj.key.endsWith("/") && !obj.key.startsWith("_")).map((obj) => ({
      key: obj.key,
      name: obj.key.replace(prefix, ""),
      size: obj.size,
      uploaded: obj.uploaded || (/* @__PURE__ */ new Date()).toISOString(),
      contentType: obj.contentType || "application/octet-stream"
    })).sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
    const folderMetas = [];
    for (const dir of listed.delimitedPrefixes) {
      folderMetas.push({
        name: dir.replace(prefix, "").replace("/", ""),
        path: dir
      });
    }
    const currentPath = prefix;
    const ancestorParts = currentPath === "uploads/" ? [] : currentPath.replace("uploads/", "").split("/").filter(Boolean);
    const ancestors = [];
    for (let i = 0; i < ancestorParts.length; i++) {
      ancestors.push({
        name: ancestorParts[i],
        path: "uploads/" + ancestorParts.slice(0, i + 1).join("/") + "/"
      });
    }
    return c.json({ files, folders: folderMetas, currentPath, ancestors });
  } catch (err) {
    console.error("files list error:", err);
    return c.json({ error: "Failed to list files: " + (err?.message || String(err)) }, 500);
  }
});
filesRoutes.get("/folders", async (c) => {
  const backend = c.req.query("backend") || "";
  const engine = await getEngine(c.env, backend);
  const folders = [];
  async function collect(prefix, depth) {
    if (depth > 5) return;
    const listed = await engine.list(prefix, { delimiter: "/" });
    for (const dir of listed.delimitedPrefixes) {
      folders.push(dir);
      await collect(dir, depth + 1);
    }
  }
  __name(collect, "collect");
  await collect("uploads/", 0);
  return c.json({ folders });
});
filesRoutes.post("/folder", async (c) => {
  const backend = c.req.query("backend") || "";
  const engine = await getEngine(c.env, backend);
  const { path } = await c.req.json();
  if (!path || !path.startsWith("uploads/")) return c.json({ error: "invalid path" }, 400);
  const folderKey = path.endsWith("/") ? path : path + "/";
  const existing = await engine.head(folderKey);
  if (existing) return c.json({ error: "\u6587\u4EF6\u5939\u5DF2\u5B58\u5728" }, 409);
  await engine.put(folderKey, "", { contentType: "application/x-directory" });
  return c.json({ ok: true, path: folderKey });
});
function assertValidKey(key) {
  if (key.startsWith("_")) throw new Error("\u4E0D\u5141\u8BB8\u64CD\u4F5C\u5185\u90E8\u6587\u4EF6");
}
__name(assertValidKey, "assertValidKey");
function assertValidKeys(keys) {
  for (const k of keys) assertValidKey(k);
}
__name(assertValidKeys, "assertValidKeys");
filesRoutes.delete("/:key{.+}", async (c) => {
  const backend = c.req.query("backend") || "";
  const engine = await getEngine(c.env, backend);
  const key = c.req.param("key");
  assertValidKey(key);
  if (key.endsWith("/")) {
    const listed = await engine.list(key);
    const keys = listed.objects.map((o) => o.key);
    if (keys.length > 0) await engine.delete(keys);
    if (!keys.includes(key)) await engine.delete(key);
  } else {
    await engine.delete(key);
  }
  return c.json({ ok: true });
});
filesRoutes.post("/batch-delete", async (c) => {
  const backend = c.req.query("backend") || "";
  const engine = await getEngine(c.env, backend);
  const { keys } = await c.req.json();
  if (!keys?.length) return c.json({ error: "no keys" }, 400);
  assertValidKeys(keys);
  const expanded = [];
  for (const key of keys) {
    if (key.endsWith("/")) {
      const listed = await engine.list(key);
      expanded.push(...listed.objects.map((o) => o.key));
      if (!listed.objects.some((o) => o.key === key)) expanded.push(key);
    } else {
      expanded.push(key);
    }
  }
  const batchSize = 100;
  for (let i = 0; i < expanded.length; i += batchSize) {
    await engine.delete(expanded.slice(i, i + batchSize));
  }
  return c.json({ ok: true, deleted: expanded.length });
});
filesRoutes.post("/move", async (c) => {
  const backend = c.req.query("backend") || "";
  const engine = await getEngine(c.env, backend);
  const { keys, targetPath } = await c.req.json();
  if (!keys?.length || !targetPath) return c.json({ error: "no keys or target" }, 400);
  assertValidKeys(keys);
  for (const key of keys) {
    if (key.endsWith("/")) continue;
    const obj = await engine.get(key);
    if (!obj) continue;
    const head = await engine.head(key);
    const contentType = head?.contentType || "application/octet-stream";
    const filename = key.split("/").pop() || key;
    const newKey = await uniqueKey(engine, targetPath, filename);
    await engine.put(newKey, await obj.arrayBuffer(), { contentType });
    await engine.delete(key);
  }
  return c.json({ ok: true });
});
filesRoutes.get("/:key{.+}", async (c) => {
  const backend = c.req.query("backend") || "";
  const engine = await getEngine(c.env, backend);
  const key = c.req.param("key");
  const obj = await engine.head(key);
  if (!obj) return c.json({ error: "\u6587\u4EF6\u4E0D\u5B58\u5728" }, 404);
  return c.json({
    key,
    name: key.split("/").pop(),
    size: obj.size,
    uploaded: obj.uploaded,
    contentType: obj.contentType
  });
});

// src/ua-parser.ts
function parseUA(ua) {
  let browser = "Unknown";
  let os = "Unknown";
  let deviceType = "desktop";
  if (!ua) return { browser, os, deviceType };
  const ua_lower = ua.toLowerCase();
  if (ua.includes("Edg/") || ua_lower.includes("edge/") || ua_lower.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    browser = "Opera";
  } else if (ua_lower.includes("chrome/") && ua_lower.includes("safari/")) {
    browser = "Chrome";
  } else if (ua_lower.includes("safari/") && !ua_lower.includes("chrome/")) {
    browser = "Safari";
  } else if (ua_lower.includes("firefox/")) {
    browser = "Firefox";
  } else if (ua_lower.includes("trident/") || ua_lower.includes("msie")) {
    browser = "IE";
  }
  if (ua_lower.includes("windows nt 11")) {
    os = "Windows 11";
  } else if (ua_lower.includes("windows nt 10")) {
    os = "Windows 10";
  } else if (ua_lower.includes("windows nt 6.3")) {
    os = "Windows 8.1";
  } else if (ua_lower.includes("windows nt 6.1")) {
    os = "Windows 7";
  } else if (ua_lower.includes("windows")) {
    os = "Windows";
  } else if (ua_lower.includes("iphone") || ua_lower.includes("ipad") || ua_lower.includes("ipod")) {
    os = "iOS";
  } else if (ua_lower.includes("mac os x") && !ua_lower.includes("like mac os x") || ua_lower.includes("macintosh")) {
    const m = ua.match(/Mac OS X (\d+[._]\d+)/);
    os = m ? "macOS " + m[1].replace("_", ".") : "macOS";
  } else if (ua_lower.includes("android")) {
    os = "Android";
    const m = ua.match(/Android (\d+(?:\.\d+)?)/);
    if (m) os += " " + m[1];
  } else if (ua_lower.includes("linux")) {
    os = "Linux";
  } else if (ua_lower.includes("cros")) {
    os = "Chrome OS";
  }
  if (ua_lower.includes("iphone") || ua_lower.includes("ipod") || ua_lower.includes("android") && ua_lower.includes("mobile")) {
    deviceType = "mobile";
  } else if (ua_lower.includes("ipad") || ua_lower.includes("tablet") || ua_lower.includes("playbook") || ua_lower.includes("silk")) {
    deviceType = "tablet";
  }
  return { browser, os, deviceType };
}
__name(parseUA, "parseUA");

// src/upload-logs.ts
var uploadLogRoutes = new Hono2();
uploadLogRoutes.use("*", jwtAuth);
uploadLogRoutes.get("/logs", async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list("_ul_logs/", { limit: 500 });
  const logs = [];
  for (const key of keys) {
    try {
      const entry = await meta.get(key);
      if (entry) {
        logs.push({ ...entry, logKey: key + ".json" });
      }
    } catch {
    }
  }
  logs.sort((a, b) => a.time > b.time ? -1 : 1);
  return c.json({ logs });
});
uploadLogRoutes.delete("/logs", async (c) => {
  const meta = createMetadataStore(c.env);
  let deleted = 0;
  let cursor;
  do {
    const { keys, cursor: nextCursor } = await meta.list("_ul_logs/", { limit: 1e3, cursor });
    if (keys.length > 0) {
      await meta.delete(keys);
      deleted += keys.length;
    }
    cursor = nextCursor;
  } while (cursor);
  return c.json({ ok: true, deleted });
});
uploadLogRoutes.delete("/logs/:logKey{.+}", async (c) => {
  const meta = createMetadataStore(c.env);
  const logKey = c.req.param("logKey");
  let key = logKey;
  if (key.endsWith(".json")) key = key.slice(0, -5);
  if (!key.startsWith("_ul_logs/")) {
    return c.json({ error: "invalid log key" }, 400);
  }
  await meta.delete(key);
  return c.json({ ok: true });
});
async function writeUploadLog(env, info) {
  try {
    const meta = createMetadataStore(env);
    const parsed = parseUA(info.ua);
    const entry = {
      time: (/* @__PURE__ */ new Date()).toISOString(),
      key: info.key,
      name: info.name,
      size: info.size,
      ip: info.ip,
      country: info.country,
      ua: info.ua,
      source: info.source,
      uploadKeyId: info.uploadKeyId,
      uploadKeyLabel: info.uploadKeyLabel,
      referer: info.referer,
      browser: parsed.browser,
      os: parsed.os,
      deviceType: parsed.deviceType
    };
    const logId = info.source + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    await meta.put("_ul_logs/" + logId, entry);
  } catch (e) {
    console.error("Failed to write upload log:", e);
  }
}
__name(writeUploadLog, "writeUploadLog");

// src/moderation.ts
var MODERATION_CONFIG_KEY = "_config/moderation";
var MODERATION_LOG_PREFIX = "_moderation_logs/";
var ModerateContentProvider = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  apiKey;
  static {
    __name(this, "ModerateContentProvider");
  }
  name = "moderatecontent";
  async moderate({ url }) {
    const res = await fetch("https://api.moderatecontent.com/moderate/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `key=${encodeURIComponent(this.apiKey)}&url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) throw new Error(`moderatecontent API ${res.status}`);
    const data = await res.json();
    const rating = (data.rating_label || "safe").toLowerCase();
    return {
      label: rating === "adult" ? "adult" : rating === "teen" || rating === "racy" ? "racy" : "safe",
      scores: {
        adult: data.prediction?.adult ?? 0,
        racy: data.prediction?.teen ?? 0
      },
      raw: data
    };
  }
};
var NsfwJsProvider = class {
  constructor(apiPath) {
    this.apiPath = apiPath;
  }
  apiPath;
  static {
    __name(this, "NsfwJsProvider");
  }
  name = "nsfwjs";
  async moderate({ url }) {
    const endpoint = this.apiPath + (this.apiPath.includes("?") ? "&" : "?") + "url=" + encodeURIComponent(url);
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8e3) });
    if (!res.ok) throw new Error(`nsfwjs API ${res.status}`);
    const data = await res.json();
    const adult = Number(data.adult ?? data.Adult ?? 0);
    const racy = Number(data.racy ?? data.Racy ?? 0);
    return {
      label: adult > 0.9 ? "adult" : adult > 0.7 ? "racy" : "safe",
      scores: { adult, racy },
      raw: data
    };
  }
};
function createModerationProvider(cfg) {
  if (!cfg.enabled || cfg.provider === "none") return null;
  if (cfg.provider === "moderatecontent" && cfg.apiKey) {
    return new ModerateContentProvider(cfg.apiKey);
  }
  if (cfg.provider === "nsfwjs" && cfg.apiPath) {
    return new NsfwJsProvider(cfg.apiPath);
  }
  return null;
}
__name(createModerationProvider, "createModerationProvider");
async function getModerationConfig(env) {
  if (!env.META_DB && !env.DRIVE) return null;
  const meta = createMetadataStore(env);
  return await meta.get(MODERATION_CONFIG_KEY);
}
__name(getModerationConfig, "getModerationConfig");
async function moderateAndCleanup(env, info) {
  try {
    const cfg = await getModerationConfig(env);
    if (!cfg || !cfg.enabled) return;
    const provider = createModerationProvider(cfg);
    if (!provider) return;
    if (cfg.fileTypes?.length && !cfg.fileTypes.some(
      (t) => t.endsWith("/*") ? info.contentType.startsWith(t.slice(0, -1)) : info.contentType === t
    )) {
      return;
    }
    if (cfg.maxSize && info.size > cfg.maxSize) return;
    let fileUrl;
    if (env.R2_PUBLIC_DOMAIN) {
      fileUrl = `https://${env.R2_PUBLIC_DOMAIN}/${info.key.split("/").map(encodeURIComponent).join("/")}`;
    } else {
      console.warn("Moderation skipped: R2_PUBLIC_DOMAIN not configured");
      return;
    }
    let result;
    try {
      result = await provider.moderate({
        url: fileUrl,
        contentType: info.contentType,
        size: info.size
      });
    } catch (e) {
      console.error("Moderation API error (treated as safe):", e);
      return;
    }
    const adultThreshold = cfg.thresholds?.adult ?? 0.9;
    const racyThreshold = cfg.thresholds?.racy ?? 0.7;
    let action = "kept";
    let reason = "safe";
    let label = result.label;
    if (label === "adult" || (result.scores.adult ?? 0) >= adultThreshold) {
      action = "deleted";
      reason = "adult";
    } else if (label === "racy" || (result.scores.racy ?? 0) >= racyThreshold) {
      action = "kept";
      reason = "racy";
    } else {
      action = "kept";
      reason = "safe";
    }
    if (action === "deleted") {
      try {
        const engine = await createStorageEngine(env);
        await engine.delete(info.key);
      } catch (e) {
        console.error("Failed to delete moderated file:", e);
      }
    }
    const logEntry = {
      time: (/* @__PURE__ */ new Date()).toISOString(),
      key: info.key,
      name: info.name,
      size: info.size,
      contentType: info.contentType,
      ip: info.ip,
      ua: info.ua,
      provider: provider.name,
      label,
      scores: result.scores,
      reason,
      action,
      source: info.source
    };
    const meta = createMetadataStore(env);
    const logId = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    await meta.put(MODERATION_LOG_PREFIX + logId, logEntry);
  } catch (e) {
    console.error("moderateAndCleanup failed:", e);
  }
}
__name(moderateAndCleanup, "moderateAndCleanup");

// src/upload.ts
var uploadRoutes = new Hono2();
uploadRoutes.use("*", jwtAuth);
uploadRoutes.post("/single", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const path = body["path"] || "uploads/";
  if (!file || !(file instanceof File)) {
    return c.json({ error: "\u7F3A\u5C11\u6587\u4EF6" }, 400);
  }
  const engine = await createStorageEngine(c.env);
  const key = await uniqueKey(engine, path, file.name);
  const contentType = file.type || "application/octet-stream";
  const buf = await file.arrayBuffer();
  await engine.put(key, buf, { contentType });
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
  let s3Ok = false;
  for (const s3cfg of syncCfgs) {
    try {
      const ok = await s3PutObject(s3cfg, key, buf, contentType);
      if (ok) s3Ok = true;
    } catch (e) {
      console.error("S3 upload error:", e);
    }
  }
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key,
      name: file.name,
      size: file.size,
      ip: c.req.header("CF-Connecting-IP") || "",
      country: c.req.header("CF-IPCountry") || "",
      ua: c.req.header("User-Agent") || "",
      referer: c.req.header("Referer") || "",
      source: "dashboard"
    })
  );
  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key,
      name: file.name,
      size: file.size,
      contentType,
      ip: c.req.header("CF-Connecting-IP") || "",
      ua: c.req.header("User-Agent") || "",
      source: "dashboard"
    })
  );
  return c.json({ ok: true, key, name: file.name, s3: s3Ok });
});
uploadRoutes.post("/init", async (c) => {
  const body = await c.req.json();
  const { filename } = body;
  const path = body.path || "uploads/";
  if (!filename) return c.json({ error: "\u7F3A\u5C11\u6587\u4EF6\u540D" }, 400);
  const engine = await createStorageEngine(c.env);
  const key = await uniqueKey(engine, path, filename);
  const contentType = getContentType(filename);
  const mp = await engine.createMultipartUpload(key, { contentType });
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const s3UploadIds = {};
  for (const s3cfg of s3Cfgs) {
    const s3Uid = await s3CreateMultipart(s3cfg, key, contentType);
    if (s3Uid) s3UploadIds[s3cfg.bucket] = s3Uid;
  }
  if (Object.keys(s3UploadIds).length > 0) {
    const meta = createMetadataStore(c.env);
    await meta.put("_multipart/" + mp.uploadId, { s3UploadIds, key, filename });
  }
  return c.json({ uploadId: mp.uploadId, key });
});
uploadRoutes.post("/part", async (c) => {
  const body = await c.req.parseBody();
  const uploadId = body["uploadId"];
  const key = body["key"];
  const partNumber = parseInt(body["partNumber"], 10);
  const chunk = body["chunk"];
  if (!uploadId || !key || !partNumber || !chunk) return c.json({ error: "\u7F3A\u5C11\u53C2\u6570" }, 400);
  if (!(chunk instanceof File)) return c.json({ error: "\u65E0\u6548\u7684\u6587\u4EF6\u6570\u636E" }, 400);
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const chunkBuf = await chunk.arrayBuffer();
  let partResult;
  const mpData = await meta.get("_multipart/" + uploadId);
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    partResult = await r2mp.uploadPart(partNumber, chunkBuf);
  } else {
    if (!mpData) return c.json({ error: "\u5206\u7247\u4E0A\u4F20\u4F1A\u8BDD\u4E0D\u5B58\u5728" }, 404);
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const primaryS3 = s3Cfgs[0];
    const primaryUid = primaryS3 ? mpData.s3UploadIds?.[primaryS3.bucket] : null;
    if (!primaryS3 || !primaryUid) return c.json({ error: "S3 \u4E3B\u5B58\u50A8\u672A\u914D\u7F6E" }, 500);
    const etag = await s3UploadPart(primaryS3, key, primaryUid, partNumber, chunkBuf);
    if (!etag) return c.json({ error: "S3 \u5206\u7247\u4E0A\u4F20\u5931\u8D25" }, 500);
    partResult = { partNumber, etag };
  }
  if (mpData && mpData.s3UploadIds) {
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = mpData.s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3UploadPart(s3cfg, key, s3Uid, partNumber, chunkBuf).catch((e) => {
        console.error(`S3 sync part failed (bucket=${s3cfg.bucket}, part=${partNumber}):`, e);
      });
    }
  }
  return c.json({ partNumber: partResult.partNumber, etag: partResult.etag });
});
uploadRoutes.post("/complete", async (c) => {
  const body = await c.req.json();
  const { uploadId, key, parts } = body;
  if (!uploadId || !key || !parts?.length) return c.json({ error: "\u7F3A\u5C11\u53C2\u6570" }, 400);
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  let object;
  const mpData = await meta.get("_multipart/" + uploadId);
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    object = await r2mp.complete(parts);
  } else {
    if (mpData) {
      const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
      const primaryS3 = s3Cfgs[0];
      const primaryUid = primaryS3 ? mpData.s3UploadIds?.[primaryS3.bucket] : null;
      if (primaryS3 && primaryUid) {
        await s3CompleteMultipart(primaryS3, key, primaryUid, parts);
      }
    }
    object = { key, size: 0 };
  }
  if (object.size === 0) {
    try {
      const head = await engine.head(key);
      if (head) object.size = head.size;
    } catch {
    }
  }
  if (mpData && mpData.s3UploadIds) {
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = mpData.s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3CompleteMultipart(s3cfg, key, s3Uid, parts).catch((e) => {
        console.error(`S3 sync complete failed (bucket=${s3cfg.bucket}):`, e);
      });
    }
    await meta.delete("_multipart/" + uploadId).catch(() => {
    });
  }
  const name = key.split("/").pop() || key;
  const filename = mpData?.filename || name;
  const contentType = getContentType(filename) || "application/octet-stream";
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key,
      name,
      size: object.size,
      ip: c.req.header("CF-Connecting-IP") || "",
      country: c.req.header("CF-IPCountry") || "",
      ua: c.req.header("User-Agent") || "",
      referer: c.req.header("Referer") || "",
      source: "dashboard"
    })
  );
  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key,
      name,
      size: object.size,
      contentType,
      ip: c.req.header("CF-Connecting-IP") || "",
      ua: c.req.header("User-Agent") || "",
      source: "dashboard"
    })
  );
  return c.json({ ok: true, key: object.key, name });
});
uploadRoutes.post("/abort", async (c) => {
  const body = await c.req.json();
  const { uploadId, key } = body;
  if (!uploadId || !key) return c.json({ error: "\u7F3A\u5C11\u53C2\u6570" }, 400);
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    await r2mp.abort();
  }
  const mpData = await meta.get("_multipart/" + uploadId).catch(() => null);
  if (mpData) {
    try {
      if (mpData.s3UploadIds) {
        const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
        for (const s3cfg of s3Cfgs) {
          const s3Uid = mpData.s3UploadIds?.[s3cfg.bucket];
          if (s3Uid) s3AbortMultipart(s3cfg, key, s3Uid).catch(() => {
          });
        }
      }
    } catch {
    }
  }
  await meta.delete("_multipart/" + uploadId).catch(() => {
  });
  return c.json({ ok: true });
});

// src/share.ts
var SHARES_PREFIX = "_shares/";
var sharePublicRoutes = new Hono2();
sharePublicRoutes.get("/info/:token", async (c) => {
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const token = c.req.param("token");
  const record = await meta.get(SHARES_PREFIX + token);
  if (!record) {
    return c.json({ error: "\u5206\u4EAB\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F" }, 404);
  }
  if (record.expires && new Date(record.expires) < /* @__PURE__ */ new Date()) {
    return c.json({ error: "\u5206\u4EAB\u94FE\u63A5\u5DF2\u8FC7\u671F" }, 410);
  }
  const fileInfo = await engine.head(record.key);
  return c.json({
    token: record.token,
    key: record.key,
    name: record.name,
    size: fileInfo?.size || 0,
    created: record.created,
    noAd: record.noAd,
    downloads: record.downloads
  });
});
var shareRoutes = new Hono2();
shareRoutes.use("*", jwtAuth);
shareRoutes.post("/", async (c) => {
  const meta = createMetadataStore(c.env);
  const body = await c.req.json();
  const { key, name, noAd } = body;
  if (!key) {
    return c.json({ error: "\u7F3A\u5C11\u6587\u4EF6 key" }, 400);
  }
  const token = generateToken();
  const record = {
    token,
    key,
    name: name || key.split("/").pop() || key,
    created: (/* @__PURE__ */ new Date()).toISOString(),
    noAd: noAd || false,
    downloads: 0
  };
  await meta.put(SHARES_PREFIX + token, record);
  return c.json({ token, url: "/s/" + token });
});
shareRoutes.get("/", async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list(SHARES_PREFIX, { limit: 500 });
  const shares = [];
  for (const key of keys) {
    const rec = await meta.get(key);
    if (rec) shares.push(rec);
  }
  shares.sort((a, b) => b.created.localeCompare(a.created));
  return c.json({ shares });
});
shareRoutes.delete("/:token", async (c) => {
  const meta = createMetadataStore(c.env);
  const token = c.req.param("token");
  await meta.delete(SHARES_PREFIX + token);
  return c.json({ ok: true });
});
shareRoutes.post("/batch", async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await c.req.json();
  if (!keys?.length) return c.json({ error: "no keys" }, 400);
  const shares = [];
  for (const key of keys) {
    if (key.endsWith("/")) continue;
    const token = generateToken();
    const name = key.split("/").pop() || key;
    const record = { token, key, name, created: (/* @__PURE__ */ new Date()).toISOString(), noAd: false, downloads: 0 };
    await meta.put(SHARES_PREFIX + token, record);
    shares.push({ token, name });
  }
  return c.json({ shares, count: shares.length });
});
async function incrementShareDownload(meta, token) {
  const record = await meta.get(SHARES_PREFIX + token);
  if (!record) return null;
  record.downloads = (record.downloads || 0) + 1;
  await meta.put(SHARES_PREFIX + token, record);
  return record;
}
__name(incrementShareDownload, "incrementShareDownload");
function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const arr = new Uint8Array(16);
  let idx = 0;
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) {
    while (idx < arr.length && arr[idx] >= 248) idx++;
    if (idx >= arr.length) {
      crypto.getRandomValues(arr);
      idx = 0;
    }
    result += chars[arr[idx] % chars.length];
    idx++;
  }
  return result;
}
__name(generateToken, "generateToken");

// src/download.ts
var downloadRoutes = new Hono2();
downloadRoutes.get("/logs", jwtAuth, async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list("_dl_logs/", { limit: 500 });
  const logs = [];
  for (const key of keys) {
    try {
      const entry = await meta.get(key);
      if (entry) {
        logs.push({ ...entry, logKey: key + ".json" });
      }
    } catch {
    }
  }
  logs.sort((a, b) => a.time > b.time ? -1 : 1);
  return c.json({ logs });
});
downloadRoutes.delete("/logs", jwtAuth, async (c) => {
  const meta = createMetadataStore(c.env);
  let deleted = 0;
  let cursor;
  do {
    const { keys, cursor: nextCursor } = await meta.list("_dl_logs/", { limit: 1e3, cursor });
    if (keys.length > 0) {
      await meta.delete(keys);
      deleted += keys.length;
    }
    cursor = nextCursor;
  } while (cursor);
  return c.json({ ok: true, deleted });
});
downloadRoutes.delete("/logs/:logKey{.+}", jwtAuth, async (c) => {
  const meta = createMetadataStore(c.env);
  const logKey = c.req.param("logKey");
  let key = logKey;
  if (key.endsWith(".json")) key = key.slice(0, -5);
  if (!key.startsWith("_dl_logs/")) {
    return c.json({ error: "invalid log key" }, 400);
  }
  await meta.delete(key);
  return c.json({ ok: true });
});
downloadRoutes.get("/url/:key{.+}", jwtAuth, async (c) => {
  const key = c.req.param("key");
  const r2Domain = c.env.R2_PUBLIC_DOMAIN;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return c.redirect("https://" + r2Domain + "/" + encoded, 302);
});
downloadRoutes.get("/presign/:key{.+}", jwtAuth, async (c) => {
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const key = c.req.param("key");
  const head = await engine.head(key);
  if (!head) return c.json({ error: "\u6587\u4EF6\u4E0D\u5B58\u5728" }, 404);
  const ip = c.req.header("CF-Connecting-IP") || "";
  const ua = c.req.header("User-Agent") || "";
  const parsed = parseUA(ua);
  const name = key.split("/").pop() || key;
  let presignedUrl = null;
  let source = "r2";
  if (c.env.R2_ACCESS_KEY && c.env.R2_SECRET_KEY && c.env.R2_ACCOUNT_ID) {
    const r2AccountId = c.env.R2_ACCOUNT_ID;
    presignedUrl = await generatePresignedUrl(
      r2AccountId + ".r2.cloudflarestorage.com",
      c.env.R2_BUCKET,
      "auto",
      c.env.R2_ACCESS_KEY,
      c.env.R2_SECRET_KEY,
      key,
      300,
      name
    );
  } else {
    const s3Configs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    if (s3Configs.length > 0) {
      const cfg = s3Configs[0];
      presignedUrl = await generatePresignedUrl(
        cfg.endpoint,
        cfg.bucket,
        cfg.region,
        cfg.accessKey,
        cfg.secretKey,
        key,
        300,
        name,
        cfg.pathStyle
      );
      source = "s3";
    }
  }
  if (!presignedUrl) {
    return c.json({ error: "\u5B58\u50A8\u51ED\u8BC1\u672A\u914D\u7F6E\uFF08\u9700\u8981 R2 \u6216 S3 \u51ED\u8BC1\uFF09" }, 500);
  }
  const logEntry = {
    time: (/* @__PURE__ */ new Date()).toISOString(),
    key,
    name,
    size: head.size,
    ip,
    country: c.req.header("CF-IPCountry") || "",
    ua,
    shareToken: "direct",
    source,
    referer: c.req.header("Referer") || "",
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType
  };
  const logId = "direct_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const logKey = "_dl_logs/" + logId;
  await meta.put(logKey, logEntry);
  return c.json({ url: presignedUrl, logKey: logKey + ".json", name, size: head.size });
});
downloadRoutes.post("/token", async (c) => {
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const body = await c.req.json();
  const { shareToken, turnstile } = body;
  if (!shareToken || !turnstile) return c.json({ error: "\u53C2\u6570\u4E0D\u5B8C\u6574" }, 400);
  const ip = c.req.header("CF-Connecting-IP") || "";
  if (!await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip)) {
    return c.json({ error: "\u4EBA\u673A\u9A8C\u8BC1\u5931\u8D25" }, 403);
  }
  const record = await incrementShareDownload(meta, shareToken);
  if (!record) return c.json({ error: "\u5206\u4EAB\u94FE\u63A5\u4E0D\u5B58\u5728" }, 404);
  const head = await engine.head(record.key);
  if (!head) return c.json({ error: "\u6587\u4EF6\u4E0D\u5B58\u5728" }, 404);
  let r2Url = null;
  if (c.env.R2_ACCESS_KEY && c.env.R2_SECRET_KEY && c.env.R2_ACCOUNT_ID) {
    try {
      r2Url = await generatePresignedUrl(
        c.env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
        c.env.R2_BUCKET || "",
        "auto",
        c.env.R2_ACCESS_KEY,
        c.env.R2_SECRET_KEY,
        record.key,
        300,
        record.name
      );
    } catch (e) {
      console.error("R2 presign error:", e);
    }
  }
  const s3Urls = [];
  try {
    const s3Configs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    for (const cfg of s3Configs) {
      try {
        const url = await generatePresignedUrl(
          cfg.endpoint,
          cfg.bucket,
          cfg.region,
          cfg.accessKey,
          cfg.secretKey,
          record.key,
          300,
          record.name,
          cfg.pathStyle
        );
        s3Urls.push({ name: cfg.bucket, url });
      } catch (e) {
        console.error(`S3 presign error (${cfg.bucket}):`, e);
      }
    }
  } catch (e) {
    console.error("S3 presign error:", e);
  }
  if (!r2Url && s3Urls.length > 0) {
    r2Url = s3Urls[0].url;
  }
  if (!r2Url) return c.json({ error: "\u751F\u6210\u4E0B\u8F7D\u94FE\u63A5\u5931\u8D25" }, 500);
  const ua = c.req.header("User-Agent") || "";
  const parsed = parseUA(ua);
  const logEntry = {
    time: (/* @__PURE__ */ new Date()).toISOString(),
    key: record.key,
    name: record.name,
    size: head.size,
    ip,
    country: c.req.header("CF-IPCountry") || "",
    ua,
    shareToken,
    source: s3Urls.length > 0 ? "r2+s3" : "r2",
    referer: c.req.header("Referer") || "",
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType
  };
  const logId = shareToken + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const logKey = "_dl_logs/" + logId;
  await meta.put(logKey, logEntry);
  const s3Url = s3Urls.length > 0 ? s3Urls[0].url : null;
  return c.json({ r2Url, s3Url, s3Urls, logKey: logKey + ".json", name: record.name, size: head.size });
});
downloadRoutes.post("/beacon", async (c) => {
  const meta = createMetadataStore(c.env);
  const { logKey, event } = await c.req.json();
  if (!logKey || !event) return c.json({ error: "missing params" }, 400);
  let key = logKey;
  if (key.endsWith(".json")) key = key.slice(0, -5);
  if (!key.startsWith("_dl_logs/")) {
    return c.json({ error: "invalid log key" }, 400);
  }
  if (event === "complete") {
    try {
      const entry = await meta.get(key);
      if (entry) {
        entry.completed = true;
        await meta.put(key, entry);
      }
    } catch {
    }
  }
  return c.json({ ok: true });
});
async function generatePresignedUrl(endpoint, bucket, region, accessKey, secretKey, key, expiresIn, filename, pathStyle) {
  const now = /* @__PURE__ */ new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "").slice(0, 8);
  const amzDate2 = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "") + "Z";
  const encodedKey = "/" + encodeURIComponent(key).replace(/%2F/g, "/");
  let host;
  if (pathStyle) {
    host = endpoint;
  } else {
    host = bucket + "." + endpoint;
  }
  const credentialScope = dateStamp + "/" + region + "/s3/aws4_request";
  const credential = accessKey + "/" + credentialScope;
  const rawParams = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", credential],
    ["X-Amz-Date", amzDate2],
    ["X-Amz-Expires", String(expiresIn)],
    ["X-Amz-SignedHeaders", "host"]
  ];
  rawParams.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const canonicalQS = rawParams.map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
  const canonicalUri = pathStyle ? "/" + bucket + encodedKey : encodedKey;
  const canonicalRequest = ["GET", canonicalUri, canonicalQS, "host:" + host + "\n", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate2, credentialScope, await sha256Hex3(canonicalRequest)].join("\n");
  const signingKey = await getSigningKey2(secretKey, dateStamp, region, "s3");
  const signature = await hmacHex2(signingKey, stringToSign);
  const urlParams = rawParams.map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
  const urlPath = pathStyle ? "/" + bucket + encodedKey : encodedKey;
  return "https://" + host + urlPath + "?" + urlParams + "&X-Amz-Signature=" + signature;
}
__name(generatePresignedUrl, "generatePresignedUrl");
async function sha256Hex3(data) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex3, "sha256Hex");
async function hmacBytes2(key, data) {
  const k = key instanceof Uint8Array ? await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]) : key;
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}
__name(hmacBytes2, "hmacBytes");
async function hmacHex2(key, data) {
  return [...await hmacBytes2(key, data)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex2, "hmacHex");
async function getSigningKey2(secret, date, region, service) {
  const enc = new TextEncoder();
  const kSecret = await crypto.subtle.importKey("raw", enc.encode("AWS4" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kDate = await hmacBytes2(kSecret, date);
  const kDateKey = await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kRegion = await hmacBytes2(kDateKey, region);
  const kRegionKey = await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kService = await hmacBytes2(kRegionKey, service);
  const kServiceKey = await crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await hmacBytes2(kServiceKey, "aws4_request");
}
__name(getSigningKey2, "getSigningKey");

// src/upload-keys.ts
var UPLOAD_KEYS_PREFIX = "_upload_keys/";
var uploadKeyRoutes = new Hono2();
uploadKeyRoutes.use("*", jwtAuth);
uploadKeyRoutes.post("/", async (c) => {
  const meta = createMetadataStore(c.env);
  const body = await c.req.json();
  const { label, expiresHours } = body;
  let path = body.path || "uploads/";
  if (!path.endsWith("/")) path += "/";
  if (!label) return c.json({ error: "\u7F3A\u5C11\u6807\u7B7E" }, 400);
  if (!expiresHours || expiresHours <= 0) return c.json({ error: "\u6709\u6548\u671F\u65E0\u6548" }, 400);
  const id = generateId();
  const now = /* @__PURE__ */ new Date();
  const expires = new Date(now.getTime() + expiresHours * 3600 * 1e3);
  const key = {
    id,
    label,
    path,
    created: now.toISOString(),
    expires: expires.toISOString(),
    usedCount: 0,
    active: true
  };
  await meta.put(UPLOAD_KEYS_PREFIX + id, key);
  return c.json({ id, url: "/u/" + id, expires: key.expires });
});
uploadKeyRoutes.get("/", async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list(UPLOAD_KEYS_PREFIX, { limit: 500 });
  const out = [];
  for (const k of keys) {
    try {
      const item = await meta.get(k);
      if (item) out.push(item);
    } catch {
    }
  }
  out.sort((a, b) => a.created > b.created ? -1 : 1);
  return c.json({ keys: out });
});
uploadKeyRoutes.delete("/:id", async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param("id");
  await meta.delete(UPLOAD_KEYS_PREFIX + id);
  return c.json({ ok: true });
});
var uploadKeyPublicRoutes = new Hono2();
uploadKeyPublicRoutes.get("/validate/:id", async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param("id");
  const key = await meta.get(UPLOAD_KEYS_PREFIX + id);
  if (!key) return c.json({ valid: false, error: "\u94FE\u63A5\u4E0D\u5B58\u5728" });
  if (!key.active) return c.json({ valid: false, error: "\u94FE\u63A5\u5DF2\u7981\u7528" });
  if (new Date(key.expires) < /* @__PURE__ */ new Date()) return c.json({ valid: false, error: "\u94FE\u63A5\u5DF2\u8FC7\u671F", expired: true });
  return c.json({ valid: true, label: key.label, path: key.path });
});
async function incrementUploadKeyUsage(meta, id) {
  const key = await meta.get(UPLOAD_KEYS_PREFIX + id);
  if (!key) return null;
  key.usedCount = (key.usedCount || 0) + 1;
  await meta.put(UPLOAD_KEYS_PREFIX + id, key);
  return key;
}
__name(incrementUploadKeyUsage, "incrementUploadKeyUsage");
function generateId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(16);
  let result = "", idx = 0;
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) {
    while (idx < arr.length && arr[idx] >= 248) idx++;
    if (idx >= arr.length) {
      crypto.getRandomValues(arr);
      idx = 0;
    }
    result += chars[arr[idx] % chars.length];
    idx++;
  }
  return result;
}
__name(generateId, "generateId");

// src/upload-public.ts
var uploadPublicRoutes = new Hono2();
function getPublicUploadPath(env) {
  const p = env.PUBLIC_UPLOAD_PATH || "uploads/public/";
  return p.endsWith("/") ? p : p + "/";
}
__name(getPublicUploadPath, "getPublicUploadPath");
uploadPublicRoutes.post("/single", async (c) => {
  const ip = c.req.header("CF-Connecting-IP") || "";
  const body = await c.req.parseBody();
  const file = body["file"];
  const turnstile = body["turnstile"];
  const uploadKeyId = body["uploadKeyId"];
  let path = body["path"] || getPublicUploadPath(c.env);
  if (!file || !(file instanceof File)) return c.json({ error: "\u7F3A\u5C11\u6587\u4EF6" }, 400);
  if (!turnstile) return c.json({ error: "\u7F3A\u5C11\u4EBA\u673A\u9A8C\u8BC1" }, 400);
  if (!await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip)) {
    return c.json({ error: "\u4EBA\u673A\u9A8C\u8BC1\u5931\u8D25" }, 403);
  }
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  let keyLabel;
  if (uploadKeyId) {
    const key = await incrementUploadKeyUsage(meta, uploadKeyId);
    if (!key) return c.json({ error: "\u4E0A\u4F20\u94FE\u63A5\u4E0D\u5B58\u5728" }, 404);
    if (!key.active) return c.json({ error: "\u4E0A\u4F20\u94FE\u63A5\u5DF2\u7981\u7528" }, 403);
    if (new Date(key.expires) < /* @__PURE__ */ new Date()) return c.json({ error: "\u4E0A\u4F20\u94FE\u63A5\u5DF2\u8FC7\u671F" }, 410);
    path = key.path;
    keyLabel = key.label;
  }
  if (!path.endsWith("/")) path += "/";
  const key2 = await uniqueKey(engine, path, file.name);
  const contentType = file.type || "application/octet-stream";
  const buf = await file.arrayBuffer();
  await engine.put(key2, buf, { contentType });
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
  let s3Ok = false;
  for (const s3cfg of syncCfgs) {
    try {
      const ok = await s3PutObject(s3cfg, key2, buf, contentType);
      if (ok) s3Ok = true;
    } catch (e) {
      console.error("S3 upload error:", e);
    }
  }
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key: key2,
      name: file.name,
      size: file.size,
      ip,
      country: c.req.header("CF-IPCountry") || "",
      ua: c.req.header("User-Agent") || "",
      referer: c.req.header("Referer") || "",
      source: uploadKeyId ? "upload-key" : "public",
      uploadKeyId,
      uploadKeyLabel: keyLabel
    })
  );
  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key: key2,
      name: file.name,
      size: file.size,
      contentType,
      ip,
      ua: c.req.header("User-Agent") || "",
      source: uploadKeyId ? "upload-key" : "public"
    })
  );
  return c.json({ ok: true, key: key2, name: file.name, s3: s3Ok });
});
uploadPublicRoutes.post("/init", async (c) => {
  const ip = c.req.header("CF-Connecting-IP") || "";
  const body = await c.req.json();
  const { filename, turnstile, uploadKeyId } = body;
  let path = body.path || getPublicUploadPath(c.env);
  if (!filename) return c.json({ error: "\u7F3A\u5C11\u6587\u4EF6\u540D" }, 400);
  if (!turnstile) return c.json({ error: "\u7F3A\u5C11\u4EBA\u673A\u9A8C\u8BC1" }, 400);
  if (!await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip)) {
    return c.json({ error: "\u4EBA\u673A\u9A8C\u8BC1\u5931\u8D25" }, 403);
  }
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  let keyLabel;
  if (uploadKeyId) {
    const key = await incrementUploadKeyUsage(meta, uploadKeyId);
    if (!key) return c.json({ error: "\u4E0A\u4F20\u94FE\u63A5\u4E0D\u5B58\u5728" }, 404);
    if (!key.active) return c.json({ error: "\u4E0A\u4F20\u94FE\u63A5\u5DF2\u7981\u7528" }, 403);
    if (new Date(key.expires) < /* @__PURE__ */ new Date()) return c.json({ error: "\u4E0A\u4F20\u94FE\u63A5\u5DF2\u8FC7\u671F" }, 410);
    path = key.path;
    keyLabel = key.label;
  }
  if (!path.endsWith("/")) path += "/";
  const key2 = await uniqueKey(engine, path, filename);
  const ct = getContentType(filename);
  const mp = await engine.createMultipartUpload(key2, { contentType: ct });
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const s3UploadIds = {};
  for (const s3cfg of s3Cfgs) {
    const s3Uid = await s3CreateMultipart(s3cfg, key2, ct);
    if (s3Uid) s3UploadIds[s3cfg.bucket] = s3Uid;
  }
  if (Object.keys(s3UploadIds).length > 0) {
    await meta.put("_multipart/" + mp.uploadId, {
      s3UploadIds,
      key: key2,
      filename,
      uploadKeyId,
      uploadKeyLabel: keyLabel,
      source: uploadKeyId ? "upload-key" : "public"
    });
  }
  return c.json({ uploadId: mp.uploadId, key: key2 });
});
uploadPublicRoutes.post("/part", async (c) => {
  const body = await c.req.parseBody();
  const uploadId = body["uploadId"];
  const key = body["key"];
  const partNumber = parseInt(body["partNumber"], 10);
  const chunk = body["chunk"];
  if (!uploadId || !key || !partNumber || !chunk) return c.json({ error: "\u7F3A\u5C11\u53C2\u6570" }, 400);
  if (!(chunk instanceof File)) return c.json({ error: "\u65E0\u6548\u7684\u6587\u4EF6\u6570\u636E" }, 400);
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const chunkBuf = await chunk.arrayBuffer();
  let partResult;
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    partResult = await r2mp.uploadPart(partNumber, chunkBuf);
  } else {
    const mpData = await meta.get("_multipart/" + uploadId);
    if (!mpData) throw new Error("\u5206\u7247\u4E0A\u4F20\u4F1A\u8BDD\u4E0D\u5B58\u5728");
    const { s3UploadIds } = mpData;
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const primaryS3 = s3Cfgs[0];
    const primaryUid = primaryS3 ? s3UploadIds[primaryS3.bucket] : null;
    if (!primaryS3 || !primaryUid) throw new Error("S3 \u4E3B\u5B58\u50A8\u672A\u914D\u7F6E");
    const etag = await s3UploadPart(primaryS3, key, primaryUid, partNumber, chunkBuf);
    if (!etag) throw new Error("S3 \u5206\u7247\u4E0A\u4F20\u5931\u8D25");
    partResult = { partNumber, etag };
  }
  const mpData2 = await meta.get("_multipart/" + uploadId);
  if (mpData2) {
    const { s3UploadIds } = mpData2;
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3UploadPart(s3cfg, key, s3Uid, partNumber, chunkBuf).catch(() => {
      });
    }
  }
  return c.json({ partNumber: partResult.partNumber, etag: partResult.etag });
});
uploadPublicRoutes.post("/complete", async (c) => {
  const body = await c.req.json();
  const { uploadId, key, parts } = body;
  if (!uploadId || !key || !parts?.length) return c.json({ error: "\u7F3A\u5C11\u53C2\u6570" }, 400);
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  let object;
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    object = await r2mp.complete(parts);
  } else {
    const mpData = await meta.get("_multipart/" + uploadId);
    if (mpData) {
      const { s3UploadIds } = mpData;
      const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
      const primaryS3 = s3Cfgs[0];
      const primaryUid = primaryS3 ? s3UploadIds[primaryS3.bucket] : null;
      if (primaryS3 && primaryUid) await s3CompleteMultipart(primaryS3, key, primaryUid, parts);
    }
    object = { key, size: 0 };
  }
  if (object.size === 0) {
    try {
      const head = await engine.head(key);
      if (head) object.size = head.size;
    } catch {
    }
  }
  const mpMeta = await meta.get("_multipart/" + uploadId);
  if (mpMeta) {
    const { s3UploadIds } = mpMeta;
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3CompleteMultipart(s3cfg, key, s3Uid, parts).catch(() => {
      });
    }
    await meta.delete("_multipart/" + uploadId);
  }
  const name = key.split("/").pop() || key;
  const mpData2 = await meta.get("_multipart/" + uploadId).catch(() => null);
  const filename = mpData2?.filename || name;
  const contentType = getContentType(filename);
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key,
      name,
      size: object.size,
      ip: c.req.header("CF-Connecting-IP") || "",
      country: c.req.header("CF-IPCountry") || "",
      ua: c.req.header("User-Agent") || "",
      referer: c.req.header("Referer") || "",
      source: mpMeta?.source || "public",
      uploadKeyId: mpMeta?.uploadKeyId,
      uploadKeyLabel: mpMeta?.uploadKeyLabel
    })
  );
  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key,
      name,
      size: object.size,
      contentType,
      ip: c.req.header("CF-Connecting-IP") || "",
      ua: c.req.header("User-Agent") || "",
      source: mpMeta?.source || "public"
    })
  );
  return c.json({ ok: true, key: object.key, name });
});
uploadPublicRoutes.post("/abort", async (c) => {
  const body = await c.req.json();
  const { uploadId, key } = body;
  if (!uploadId || !key) return c.json({ error: "\u7F3A\u5C11\u53C2\u6570" }, 400);
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    await r2mp.abort();
  }
  const mpData = await meta.get("_multipart/" + uploadId).catch(() => null);
  if (mpData) {
    try {
      if (mpData.s3UploadIds) {
        const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
        for (const s3cfg of s3Cfgs) {
          const s3Uid = mpData.s3UploadIds?.[s3cfg.bucket];
          if (s3Uid) s3AbortMultipart(s3cfg, key, s3Uid).catch(() => {
          });
        }
      }
    } catch {
    }
  }
  await meta.delete("_multipart/" + uploadId).catch(() => {
  });
  return c.json({ ok: true });
});

// src/storage-config.ts
var storageConfigRoutes = new Hono2();
storageConfigRoutes.use("*", jwtAuth);
var CONFIG_KEY = "_config/storage";
async function loadConfig(meta) {
  return await meta.get(CONFIG_KEY) || { backends: [], credentials: {}, updatedAt: "" };
}
__name(loadConfig, "loadConfig");
async function saveConfig(meta, data) {
  data.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await meta.put(CONFIG_KEY, data);
}
__name(saveConfig, "saveConfig");
storageConfigRoutes.get("/providers", (c) => {
  return c.json(PROVIDERS);
});
storageConfigRoutes.get("/backends", async (c) => {
  const meta = createMetadataStore(c.env);
  const data = await loadConfig(meta);
  const backends = data.backends.map((b) => ({
    ...b,
    hasCredentials: !!data.credentials[b.name],
    // 脱敏显示密钥
    accessKey: data.credentials[b.name]?.accessKey ? data.credentials[b.name].accessKey.slice(0, 6) + "***" : "",
    secretKey: data.credentials[b.name]?.secretKey ? "********" : ""
  }));
  return c.json({ backends, updatedAt: data.updatedAt, r2Available: !!c.env.DRIVE });
});
storageConfigRoutes.post("/backends", async (c) => {
  const meta = createMetadataStore(c.env);
  const body = await c.req.json();
  const { name, provider, endpoint, bucket, region, accessKey, secretKey } = body;
  if (!name || !provider || !endpoint || !bucket || !region || !accessKey || !secretKey) {
    return c.json({ error: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5" }, 400);
  }
  const data = await loadConfig(meta);
  if (data.backends.some((b) => b.name === name)) {
    return c.json({ error: `\u540E\u7AEF\u300C${name}\u300D\u5DF2\u5B58\u5728` }, 409);
  }
  const pathStyle = body.pathStyle !== void 0 ? body.pathStyle : detectPathStyle(endpoint, provider);
  const backend = {
    name,
    provider,
    endpoint,
    bucket,
    region,
    pathStyle,
    primary: body.primary || false,
    sync: body.sync !== false
    // 默认同步
  };
  data.backends.push(backend);
  data.credentials[name] = { accessKey, secretKey };
  if (backend.primary) {
    for (const b of data.backends) {
      if (b.name !== name) b.primary = false;
    }
  }
  await saveConfig(meta, data);
  return c.json({ ok: true, backend });
});
storageConfigRoutes.put("/backends/:name", async (c) => {
  const meta = createMetadataStore(c.env);
  const name = c.req.param("name");
  const body = await c.req.json();
  const data = await loadConfig(meta);
  const idx = data.backends.findIndex((b) => b.name === name);
  if (idx === -1) return c.json({ error: `\u540E\u7AEF\u300C${name}\u300D\u4E0D\u5B58\u5728` }, 404);
  const backend = data.backends[idx];
  if (body.provider !== void 0) backend.provider = body.provider;
  if (body.endpoint !== void 0) backend.endpoint = body.endpoint;
  if (body.bucket !== void 0) backend.bucket = body.bucket;
  if (body.region !== void 0) backend.region = body.region;
  if (body.pathStyle !== void 0) backend.pathStyle = body.pathStyle;
  if (body.sync !== void 0) backend.sync = body.sync;
  if (body.accessKey || body.secretKey) {
    const cred = data.credentials[name] || { accessKey: "", secretKey: "" };
    if (body.accessKey) cred.accessKey = body.accessKey;
    if (body.secretKey) cred.secretKey = body.secretKey;
    data.credentials[name] = cred;
  }
  if (body.primary !== void 0) {
    backend.primary = body.primary;
    if (body.primary) {
      for (const b of data.backends) {
        if (b.name !== name) b.primary = false;
      }
    }
  }
  if ((body.endpoint || body.provider) && body.pathStyle === void 0) {
    backend.pathStyle = detectPathStyle(backend.endpoint, backend.provider);
  }
  await saveConfig(meta, data);
  return c.json({ ok: true, backend });
});
storageConfigRoutes.delete("/backends/:name", async (c) => {
  const meta = createMetadataStore(c.env);
  const name = c.req.param("name");
  const data = await loadConfig(meta);
  const idx = data.backends.findIndex((b) => b.name === name);
  if (idx === -1) return c.json({ error: `\u540E\u7AEF\u300C${name}\u300D\u4E0D\u5B58\u5728` }, 404);
  data.backends.splice(idx, 1);
  delete data.credentials[name];
  await saveConfig(meta, data);
  return c.json({ ok: true });
});
storageConfigRoutes.post("/test", async (c) => {
  const body = await c.req.json();
  const { endpoint, bucket, region, accessKey, secretKey } = body;
  if (!endpoint || !bucket || !region || !accessKey || !secretKey) {
    return c.json({ error: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5" }, 400);
  }
  const pathStyle = body.pathStyle !== void 0 ? body.pathStyle : detectPathStyle(endpoint, body.provider);
  try {
    const host = pathStyle ? endpoint : `${bucket}.${endpoint}`;
    const urlPath = pathStyle ? `/${bucket}?list-type=2&max-keys=1` : "/?list-type=2&max-keys=1";
    const amzDate2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "") + "Z";
    const dateStamp = amzDate2.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const headers = {
      "Host": host,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      "x-amz-date": amzDate2
    };
    const signedHeaderNames = ["host", "x-amz-content-sha256", "x-amz-date"];
    const signedHeaders = signedHeaderNames.join(";");
    const canonicalHeaders = signedHeaderNames.map((k) => `${k}:${headers[k]}`).join("\n") + "\n";
    const canonicalRequest = [
      "GET",
      urlPath.split("?")[0],
      urlPath.split("?")[1] || "",
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD"
    ].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate2, credentialScope, await sha256Hex4(canonicalRequest)].join("\n");
    const signingKey = await getSigningKey3(secretKey, dateStamp, region, "s3");
    const signature = await hmacHex3(signingKey, stringToSign);
    headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`https://${host}${urlPath}`, {
      method: "GET",
      headers
    });
    if (res.ok) {
      return c.json({ ok: true, message: "\u8FDE\u63A5\u6210\u529F" });
    } else {
      const errText = await res.text().catch(() => "");
      return c.json({ ok: false, error: `HTTP ${res.status}: ${res.statusText}`, detail: errText.slice(0, 500) });
    }
  } catch (e) {
    return c.json({ ok: false, error: e?.message || String(e) });
  }
});
storageConfigRoutes.post("/status", async (c) => {
  const body = await c.req.json();
  const { name } = body;
  if (!name) return c.json({ error: "\u7F3A\u5C11\u540E\u7AEF\u540D\u79F0" }, 400);
  const start = Date.now();
  try {
    if (name === "_r2_") {
      if (!c.env.DRIVE) return c.json({ ok: false, error: "R2 \u7ED1\u5B9A\u672A\u914D\u7F6E", responseTime: 0 });
      const listed = await c.env.DRIVE.list({ limit: 1 });
      const responseTime2 = Date.now() - start;
      return c.json({ ok: true, responseTime: responseTime2, fileCount: listed.objects.length > 0 ? "1+" : 0 });
    }
    const meta = createMetadataStore(c.env);
    const data = await loadConfig(meta);
    const backend = data.backends.find((b) => b.name === name);
    if (!backend) return c.json({ ok: false, error: `\u540E\u7AEF\u300C${name}\u300D\u4E0D\u5B58\u5728`, responseTime: 0 });
    const cred = data.credentials[name];
    if (!cred) return c.json({ ok: false, error: "\u672A\u914D\u7F6E\u5BC6\u94A5", responseTime: 0 });
    const pathStyle = backend.pathStyle !== void 0 ? backend.pathStyle : detectPathStyle(backend.endpoint, backend.provider);
    const host = pathStyle ? backend.endpoint : `${backend.bucket}.${backend.endpoint}`;
    const urlPath = pathStyle ? `/${backend.bucket}?list-type=2&max-keys=1` : "/?list-type=2&max-keys=1";
    const amzDate2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "") + "Z";
    const dateStamp = amzDate2.slice(0, 8);
    const credentialScope = `${dateStamp}/${backend.region}/s3/aws4_request`;
    const headers = {
      "Host": host,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      "x-amz-date": amzDate2
    };
    const signedHeaderNames = ["host", "x-amz-content-sha256", "x-amz-date"];
    const signedHeaders = signedHeaderNames.join(";");
    const canonicalHeaders = signedHeaderNames.map((k) => `${k}:${headers[k]}`).join("\n") + "\n";
    const canonicalRequest = [
      "GET",
      urlPath.split("?")[0],
      urlPath.split("?")[1] || "",
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD"
    ].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate2, credentialScope, await sha256Hex4(canonicalRequest)].join("\n");
    const signingKey = await getSigningKey3(cred.secretKey, dateStamp, backend.region, "s3");
    const signature = await hmacHex3(signingKey, stringToSign);
    headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${cred.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`https://${host}${urlPath}`, { method: "GET", headers });
    const responseTime = Date.now() - start;
    if (res.ok) {
      const xml = await res.text();
      const isTruncated = xml.includes("<IsTruncated>true</IsTruncated>");
      const contents = xml.split("<Contents>").length - 1;
      const prefixes = xml.split("<CommonPrefixes>").length - 1;
      const count = contents + prefixes;
      return c.json({ ok: true, responseTime, fileCount: isTruncated ? `${count}+` : count });
    } else {
      const errText = await res.text().catch(() => "");
      return c.json({ ok: false, responseTime, error: `HTTP ${res.status}: ${res.statusText}`, detail: errText.slice(0, 300) });
    }
  } catch (e) {
    return c.json({ ok: false, responseTime: Date.now() - start, error: e?.message || String(e) });
  }
});
async function sha256Hex4(data) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex4, "sha256Hex");
async function hmacBytes3(key, data) {
  const k = key instanceof Uint8Array ? await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]) : key;
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}
__name(hmacBytes3, "hmacBytes");
async function hmacHex3(key, data) {
  return [...await hmacBytes3(key, data)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex3, "hmacHex");
async function getSigningKey3(secret, date, region, service) {
  const enc = new TextEncoder();
  const kSecret = await crypto.subtle.importKey("raw", enc.encode("AWS4" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kDate = await hmacBytes3(kSecret, date);
  const kDateKey = await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kRegion = await hmacBytes3(kDateKey, region);
  const kRegionKey = await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kService = await hmacBytes3(kRegionKey, service);
  const kServiceKey = await crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await hmacBytes3(kServiceKey, "aws4_request");
}
__name(getSigningKey3, "getSigningKey");

// src/html/dashboard.ts
function renderDashboard(isDemo = false) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>\u2601\uFE0F</text></svg>">
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--border:#e5e5e5;--text:#111;--sub:#888;--accent:#111;--accent-fg:#fff;--hover:#f0f0f0;--row-hover:#f8f8fa;--shadow:0 2px 12px rgba(0,0,0,0.06);--fab-shadow:0 4px 16px rgba(0,0,0,0.15);--up-bg:#fff;--modal-shadow:0 8px 32px rgba(0,0,0,0.12)}
    [data-theme="dark"]{--bg:#09090b;--card:#18181b;--border:#27272a;--text:#fafafa;--sub:#71717a;--accent:#fafafa;--accent-fg:#18181b;--hover:#27272a;--row-hover:#1f1f23;--shadow:0 2px 12px rgba(0,0,0,0.3);--fab-shadow:0 4px 16px rgba(0,0,0,0.4);--up-bg:#18181b;--modal-shadow:0 8px 32px rgba(0,0,0,0.4)}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);background:var(--bg);transition:background .35s,color .35s}
    .layout{display:flex;height:100vh;overflow:hidden}
    .side{width:220px;background:var(--card);border-right:1px solid var(--border);padding:20px 0;display:flex;flex-direction:column;transition:background .35s,border .35s,transform .3s cubic-bezier(.34,1.56,.64,1);flex-shrink:0;z-index:50}
    .side-logo{display:flex;align-items:center;gap:8px;padding:4px 20px 24px;font-size:17px;font-weight:700;color:var(--text)}
    .side-logo svg{width:26px;height:26px;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
    .side-logo:hover svg{transform:rotate(-10deg) scale(1.12)}
    .nav{display:flex;align-items:center;gap:10px;padding:9px 20px;color:var(--sub);font-size:13px;font-weight:500;cursor:pointer;border-radius:0 10px 10px 0;transition:all .2s cubic-bezier(.34,1.56,.64,1);text-decoration:none;margin-right:12px}
    .nav:hover{background:var(--hover);color:var(--text);transform:translateX(2px)}
    .nav.on{background:var(--hover);color:var(--text);font-weight:600}
    .nav svg{width:18px;height:18px;flex-shrink:0}
    .side-bottom{margin-top:auto;padding:16px 20px}
    .pill{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;cursor:pointer;transition:all .2s;font-size:13px;color:var(--sub)}
    .pill:hover{background:var(--hover);color:var(--text)}
    .pill .dot{width:28px;height:28px;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
    .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
    #page-files,#page-downloads,#page-uploads,#page-uploadkeys{flex:1;display:flex;flex-direction:column;overflow:hidden}
    #page-account{flex:1;display:flex;flex-direction:column;overflow:hidden}
    #page-moderation{flex:1;display:flex;flex-direction:column;overflow:hidden}
    #page-downloads>div,#page-uploads>div,#page-shares>div,#page-uploadkeys>div,#page-moderation>div{flex:1;min-height:0}

    .mod-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
    .mod-badge.deleted{background:rgba(239,68,68,0.12);color:#ef4444}
    .mod-badge.racy{background:rgba(245,158,11,0.12);color:#f59e0b}
    .mod-badge.kept{background:rgba(16,185,129,0.12);color:#10b981}

    /* \u2500\u2500 Hamburger \u2500\u2500 */
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--text);flex-shrink:0;border-radius:6px;transition:background .2s}
    .hamburger:hover{background:var(--hover)}
    .hamburger svg{width:22px;height:22px}

    /* \u2500\u2500 Mobile sidebar overlay \u2500\u2500 */
    .side-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:40;backdrop-filter:blur(2px)}
    .side-overlay.on{display:block}
    .side-close{display:none;align-items:center;justify-content:space-between;padding:4px 12px 16px}
    .side-close button{background:none;border:none;cursor:pointer;padding:6px;border-radius:6px;color:var(--sub);transition:all .2s}
    .side-close button:hover{background:var(--hover);color:var(--text)}

    .topbar{display:flex;align-items:center;padding:12px 24px;gap:12px;border-bottom:1px solid var(--border);background:var(--card);transition:all .35s;flex-shrink:0}
    .search{flex:1;max-width:560px;position:relative;min-width:140px}
    .search input{width:100%;padding:9px 14px 9px 38px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;outline:none;background:var(--bg);color:var(--text);transition:all .25s}
    .search input:focus{border-color:var(--accent);background:var(--card);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}
    .search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--sub)}
    .topbar-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .theme-btn{background:none;border:1.5px solid var(--border);cursor:pointer;padding:7px 10px;border-radius:8px;font-size:15px;transition:all .2s;color:var(--sub)}
    .theme-btn:hover{background:var(--hover);transform:scale(1.08)}
    .icon-btn{background:none;border:1.5px solid var(--border);cursor:pointer;padding:7px;border-radius:8px;font-size:15px;transition:all .2s;color:var(--sub);line-height:1;display:inline-flex;align-items:center;justify-content:center}
    .icon-btn:hover{background:var(--hover);transform:scale(1.08)}
    .icon-btn svg{width:16px;height:16px}

    /* \u2500\u2500 Breadcrumbs \u2500\u2500 */
    .breadcrumbs{display:flex;align-items:center;gap:4px;padding:8px 24px;font-size:13px;color:var(--sub);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap}
    .breadcrumbs .bc-item{cursor:pointer;transition:color .2s;padding:2px 4px;border-radius:4px}
    .breadcrumbs .bc-item:hover{color:var(--text);background:var(--hover)}
    .breadcrumbs .bc-item.bc-cur{color:var(--text);font-weight:500;cursor:default}
    .breadcrumbs .bc-item.bc-cur:hover{background:none}
    .breadcrumbs .bc-sep{color:var(--border);margin:0 2px}
    .backend-selector{display:flex;align-items:center;gap:6px;padding:6px 24px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--card)}
    .backend-selector label{font-size:12px;color:var(--sub);font-weight:600;white-space:nowrap}
    .backend-selector select{padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg);color:var(--text);outline:none;cursor:pointer;max-width:200px}
    .backend-selector select:focus{border-color:var(--accent)}
    .backend-tag{font-size:11px;padding:2px 8px;border-radius:6px;background:#8b5cf6;color:#fff;font-weight:600}

    /* \u2500\u2500 Selection toolbar \u2500\u2500 */
    .sel-toolbar{display:none;align-items:center;gap:12px;padding:8px 24px;background:var(--card);border-bottom:1px solid var(--border);font-size:13px;flex-shrink:0;animation:fadeIn .2s ease}
    .sel-toolbar .sel-count{color:var(--sub);font-weight:500;margin-right:auto}
    .sel-toolbar .sel-actions{display:flex;gap:6px}
    @keyframes fadeIn{0%{opacity:0}100%{opacity:1}}

    /* \u2500\u2500 List grid (6 columns with checkbox) \u2500\u2500 */
    .list-head{display:grid;grid-template-columns:28px 28px 1fr 100px 140px 80px;padding:10px 24px;font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid var(--border);flex-shrink:0;align-items:center}
    .list-head input[type=checkbox]{cursor:pointer;accent-color:var(--accent)}
    .list{flex:1;overflow-y:auto}
    .row{display:grid;grid-template-columns:28px 28px 1fr 100px 140px 80px;align-items:center;padding:10px 24px;font-size:14px;border-bottom:1px solid transparent;cursor:pointer;transition:background .15s,transform .2s cubic-bezier(.34,1.56,.64,1);animation:slideUp .35s cubic-bezier(.34,1.56,.64,1) both}
    .row:hover{background:var(--row-hover);transform:scale(1.005)}
    .row .chk{display:flex;align-items:center;justify-content:center}
    .row .chk input[type=checkbox]{cursor:pointer;accent-color:var(--accent)}
    @keyframes slideUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
    .row .ic{font-size:18px;transition:transform .3s cubic-bezier(.34,1.56,.64,1);text-align:center}
    .row:hover .ic{transform:scale(1.15) rotate(-5deg)}
    .row .nm{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .row .sz,.row .dt{color:var(--sub);font-size:13px}
    .row .ac{display:flex;gap:2px;opacity:0;transition:opacity .15s,transform .2s;transform:translateX(4px)}
    .row:hover .ac{opacity:1;transform:translateX(0)}
    .folder-row{color:var(--text)}
    .folder-row .nm{font-weight:600}
    .folder-row:hover{background:var(--row-hover);transform:scale(1.005)}
    .ac button{background:none;border:none;cursor:pointer;padding:5px;border-radius:6px;font-size:15px;color:var(--sub);transition:all .15s}
    .ac button:hover{background:var(--hover);color:var(--text);transform:scale(1.2)}
    .empty{padding:80px;text-align:center;color:var(--sub);font-size:14px}
    .fab{position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:16px;background:var(--accent);color:var(--accent-fg);border:none;cursor:pointer;font-size:24px;box-shadow:var(--fab-shadow);transition:all .25s cubic-bezier(.34,1.56,.64,1);z-index:100;display:flex;align-items:center;justify-content:center}
    .fab:hover{transform:scale(1.1) rotate(90deg)}
    .up-panel{position:fixed;bottom:0;right:24px;width:360px;max-width:calc(100vw - 16px);background:var(--up-bg);border-radius:16px 16px 0 0;box-shadow:var(--modal-shadow);z-index:150;display:none}
    .up-panel.on{display:block;animation:slideUp .4s cubic-bezier(.34,1.56,.64,1)}
    .up-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600}
    .up-head button{background:none;border:none;font-size:18px;cursor:pointer;color:var(--sub)}
    .up-item{padding:12px 18px;border-bottom:1px solid var(--border)}
    .up-item .nm{font-size:13px;font-weight:500;margin-bottom:6px;word-break:break-all}
    .up-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .up-bar .fl{height:100%;background:var(--accent);border-radius:2px;transition:width .2s}
    .up-item .st{font-size:11px;color:var(--sub);margin-top:4px}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px);padding:16px}
    .modal{background:var(--card);border-radius:18px;padding:30px;min-width:340px;max-width:500px;width:100%;box-shadow:var(--modal-shadow);animation:pop .4s cubic-bezier(.34,1.56,.64,1);transition:background .35s}
    @keyframes pop{0%{opacity:0;transform:scale(.9) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .modal h2{font-size:17px;font-weight:700;margin-bottom:14px}
    .modal label{font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.3px}
    .modal input[type=text]{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;margin:6px 0 12px;outline:none;background:var(--bg);color:var(--text);transition:all .2s}
    .modal input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}
    .btn-row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap}
    .btn{padding:9px 20px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
    .btn:hover{transform:translateY(-1px)}
    .btn:active{transform:scale(0.96)}
    .btn-p{background:var(--accent);color:var(--accent-fg)}
    .btn-s{background:var(--bg);color:var(--text);border:1px solid var(--border)}
    .drop{position:fixed;inset:0;z-index:50;display:none;pointer-events:none;background:rgba(100,100,100,0.06);border:3px dashed var(--accent);backdrop-filter:blur(2px)}
    .drop.on{display:flex;align-items:center;justify-content:center;pointer-events:auto}
    .drop-text{font-size:20px;font-weight:700;color:var(--accent);opacity:0.6;text-align:center;padding:16px}

    /* \u2500\u2500 Downloads / Uploads log pages \u2500\u2500 */
    .dl-stats{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
    .dl-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;min-width:100px;flex:1 1 auto;transition:all .35s}
    .dl-stat .num{font-size:24px;font-weight:700;color:var(--text)}
    .dl-stat .label{font-size:12px;color:var(--sub);margin-top:2px}
    .log-search{width:100%;max-width:320px;margin-bottom:16px}
    .log-search input{width:100%;padding:9px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);color:var(--text);outline:none}
    .log-search input:focus{border-color:var(--accent);background:var(--card)}
    .log-list{display:flex;flex-direction:column;gap:10px}
    .log-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all .2s}
    .log-card:hover{background:var(--row-hover);transform:scale(1.005);border-color:var(--accent)}
    .log-card .lc-icon{width:40px;height:40px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .log-card .lc-main{flex:1;min-width:0}
    .log-card .lc-name{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
    .log-card .lc-meta{font-size:12px;color:var(--sub);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .log-card .lc-tags{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
    .log-card .lc-tag{font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg);color:var(--sub);border:1px solid var(--border);white-space:nowrap}
    .log-card .lc-tag.src-r2{color:#3b82f6;background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.2)}
    .log-card .lc-tag.src-s3{color:#f59e0b;background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.2)}
    .log-card .lc-tag.src-dashboard{color:#22c55e;background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.2)}
    .log-card .lc-tag.src-public{color:#8b5cf6;background:rgba(139,92,246,0.08);border-color:rgba(139,92,246,0.2)}
    .log-card .lc-tag.src-upload-key{color:#06b6d4;background:rgba(6,182,212,0.08);border-color:rgba(6,182,212,0.2)}
    .log-card .lc-actions{display:flex;gap:4px;margin-left:4px}
    .log-card .lc-actions button{background:none;border:none;cursor:pointer;padding:5px;border-radius:6px;font-size:13px;color:var(--sub);transition:all .15s}
    .log-card .lc-actions button:hover{background:var(--hover);color:var(--text)}
    .log-card .lc-actions button.danger:hover{color:#ef4444;background:rgba(239,68,68,0.08)}
    .log-empty{padding:80px 20px;text-align:center;color:var(--sub)}
    .log-empty .icon{font-size:40px;margin-bottom:12px;opacity:0.5}

    /* \u2500\u2500 Public upload card \u2500\u2500 */
    .public-upload-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:20px}
    .public-upload-card input[type=text]{flex:1;min-width:200px;font-family:monospace;font-size:12px}

    /* \u2500\u2500 Upload keys table \u2500\u2500 */
    .dl-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--card)}
    .dl-table{width:100%;border-collapse:collapse;font-size:13px}
    .dl-table thead{background:var(--bg);position:sticky;top:0;z-index:1}
    .dl-table th{padding:12px 16px;text-align:left;font-weight:600;color:var(--sub);font-size:12px;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid var(--border);white-space:nowrap}
    .dl-table td{padding:12px 16px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
    .dl-table tr:last-child td{border-bottom:none}
    .dl-table tr:hover{background:var(--row-hover)}
    .dl-table .btn{font-size:12px;padding:6px 12px}
    .dl-table .btn-danger{color:#ef4444}
    .dl-table .btn-danger:hover{background:rgba(239,68,68,0.08)}

    /* \u2500\u2500 Modal select \u2500\u2500 */
    .modal select{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;margin:6px 0 12px;outline:none;background:var(--bg);color:var(--text);transition:all .2s;cursor:pointer}
    .modal select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}
    .batch-share-list{max-height:260px;overflow-y:auto;margin:8px 0;border:1px solid var(--border);border-radius:8px}
    .batch-share-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);font-size:12px;gap:8px}
    .batch-share-item:last-child{border-bottom:none}
    .batch-share-item .bs-name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .batch-share-item .bs-url{color:var(--sub);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .batch-share-item .bs-cp{flex-shrink:0}

    /* \u2500\u2500 Demo mode \u2500\u2500 */
    body.demo .fab, body.demo .up-panel, body.demo .drop { display: none !important; }
    .demo-banner { display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 16px; background:var(--accent); color:var(--accent-fg); font-size:13px; font-weight:600; flex-shrink:0; }
    body.demo .demo-hidden { display: none !important; }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       RESPONSIVE BREAKPOINTS
       \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

    /* \u2500\u2500 Tablet (\u22641024px) \u2500\u2500 */
    @media(max-width:1024px){
      .side{width:200px}
      .list-head,.row{grid-template-columns:24px 24px 1fr 80px 100px 50px;padding-left:16px;padding-right:16px;font-size:13px}
      .row .chk input[type=checkbox]{transform:scale(0.9)}
    }

    /* \u2500\u2500 Small tablet / landscape phone (\u2264768px) \u2500\u2500 */
    @media(max-width:768px){
      .side{position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%);box-shadow:4px 0 20px rgba(0,0,0,0.15)}
      .side.open{transform:translateX(0)}
      .side-close{display:flex}
      .hamburger{display:flex}
      .topbar{padding:10px 16px;gap:8px}
      .search{max-width:none}
      .search input{padding:8px 12px 8px 34px;font-size:13px}
      .search svg{left:10px;width:16px;height:16px}
      .breadcrumbs{padding:6px 12px;font-size:12px}
      .sel-toolbar{padding:6px 12px;font-size:12px;flex-wrap:wrap}
      .list-head,.row{grid-template-columns:24px 24px 1fr;padding-left:12px;padding-right:12px}
      .list-head .sz,.row .sz,.list-head .dt,.row .dt{display:none}
      .row .chk input[type=checkbox]{transform:scale(0.85)}
      .ac button{padding:4px;font-size:14px}
      .row .ac{opacity:1;transform:none}
      .empty{padding:60px 16px;font-size:13px}
      .fab{bottom:24px;right:16px;width:48px;height:48px;border-radius:14px;font-size:22px}
      .up-panel{right:8px;width:calc(100vw - 16px);max-width:360px;border-radius:14px 14px 0 0}
      .modal{min-width:unset;margin:0;padding:24px 20px}
      .dl-stat{padding:12px 16px;min-width:80px}
      .dl-stat .num{font-size:20px}
      .log-card{padding:12px 14px;gap:10px}
      .log-card .lc-icon{width:36px;height:36px;font-size:18px}
      .log-card .lc-tags{display:none}
      .dl-table-wrap{margin:0 -12px;border-radius:0;border-left:none;border-right:none}
      .dl-table th:nth-child(3),.dl-table td:nth-child(3),
      .dl-table th:nth-child(4),.dl-table td:nth-child(4){display:none}
    }

    /* \u2500\u2500 Phone (\u2264480px) \u2500\u2500 */
    @media(max-width:480px){
      .topbar{padding:8px 12px;gap:6px}
      .search input{font-size:12px;padding:7px 10px 7px 30px}
      .search svg{left:8px;width:14px;height:14px}
      .breadcrumbs{padding:4px 10px;font-size:11px}
      .list-head,.row{grid-template-columns:22px 22px 1fr;padding-left:10px;padding-right:10px;font-size:13px}
      .row .ic{font-size:16px}
      .row .chk input[type=checkbox]{transform:scale(0.8)}
      .dl-stats{gap:8px}
      .dl-stat{padding:10px 12px;min-width:70px;flex:1 0 40%;border-radius:10px}
      .dl-stat .num{font-size:18px}
      .dl-stat .label{font-size:11px}
      .modal h2{font-size:15px}
      .modal input[type=text]{font-size:12px;padding:8px 10px}
      .btn{padding:8px 16px;font-size:12px}
      .fab{bottom:20px;right:12px;width:44px;height:44px;border-radius:12px;font-size:20px}
      .up-panel{right:4px;width:calc(100vw - 8px);border-radius:12px 12px 0 0}
      .row .ac{opacity:1;transform:none}
      .row .nm{font-size:13px}
      .dl-table th:nth-child(5),.dl-table td:nth-child(5),
      .dl-table th:nth-child(6),.dl-table td:nth-child(6){display:none}
      .dl-table td{padding:10px 12px}
    }
    /* \u2500\u2500 Touch device: disable sticky hover \u2500\u2500 */
    @media(hover:none){.row:hover{background:none;transform:none}.log-card:hover{background:none;transform:none;border-color:var(--border)}.nav:hover{background:none;transform:none}.pill:hover{background:none}}

    /* \u2500\u2500 Storage config \u2500\u2500 */
    .storage-card{background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:12px;transition:all .2s}
    .storage-card:hover{border-color:var(--accent);box-shadow:var(--shadow)}
    .storage-card .sc-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .storage-card .sc-name{font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px}
    .storage-card .sc-badge{font-size:10px;padding:2px 8px;border-radius:6px;font-weight:600;background:var(--hover);color:var(--sub)}
    .storage-card .sc-badge.primary{background:#10b981;color:#fff}
    .storage-card .sc-badge.sync{background:#3b82f6;color:#fff}
    .storage-card .sc-badge.builtin{background:#8b5cf6;color:#fff}
    .storage-card .sc-info{font-size:12px;color:var(--sub);margin-top:8px;display:flex;gap:16px;flex-wrap:wrap}
    .storage-card .sc-actions{display:flex;gap:4px;margin-top:10px;align-items:center;flex-wrap:wrap}
    .sc-status{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:4px 10px;border-radius:6px;background:var(--bg);border:1px solid var(--border)}
    .sc-status .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .sc-status .dot.online{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.4)}
    .sc-status .dot.offline{background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.4)}
    .sc-status .dot.checking{background:#f59e0b;animation:pulse 1s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    .form-group{margin-bottom:14px}
    .form-group label{display:block;font-size:12px;font-weight:600;color:var(--sub);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.3px}
    .form-group input,.form-group select{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);color:var(--text);outline:none;transition:all .2s}
    .form-group input:focus,.form-group select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}

    /* \u2500\u2500 Account settings \u2500\u2500 */
    .ac-card{background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:20px 22px;margin-bottom:16px;transition:all .35s;animation:cardIn .45s cubic-bezier(.34,1.56,.64,1) both}
    .ac-card:nth-child(2){animation-delay:.08s}
    .ac-card:nth-child(3){animation-delay:.14s}
    .ac-card:hover{border-color:var(--accent);box-shadow:var(--shadow)}
    .ac-card-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .ac-card-title .ac-icon{width:32px;height:32px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:15px}
    @keyframes cardIn{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
    .ac-result{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;opacity:0;transform:translateY(-4px);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
    .ac-result.show{opacity:1;transform:translateY(0)}
    .ac-result.ok{color:#10b981;background:rgba(16,185,129,0.08)}
    .ac-result.err{color:#ef4444;background:rgba(239,68,68,0.08)}
    @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}

    /* \u2500\u2500 Storage modal advanced options \u2500\u2500 */
    #sm-adv-options{overflow:hidden;transition:max-height .35s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;max-height:0;opacity:0}
    #sm-adv-options.open{max-height:220px;opacity:1}
    .sm-test-result{font-size:12px;padding:10px 14px;border-radius:8px;margin-top:10px;opacity:0;transform:translateY(-4px);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
    .sm-test-result.show{opacity:1;transform:translateY(0)}
    .sm-test-result.ok{color:#10b981;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15)}
    .sm-test-result.err{color:#ef4444;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15)}
    .sm-test-result.testing{color:#f59e0b;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.15)}
    @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
  </style>
</head>
<body${isDemo ? ' class="demo"' : ""}>
  ${isDemo ? '<div class="demo-banner">\u{1F512} \u6F14\u793A\u73AF\u5883 \u2014 \u6587\u4EF6\u4E0A\u4F20\u5DF2\u7981\u7528\uFF0C\u4EC5\u53EF\u6D4F\u89C8\u548C\u4E0B\u8F7D</div>' : ""}
  <div class="side-overlay" id="side-overlay" onclick="closeSide()"></div>
  <div class="layout">
    <nav class="side" id="side">
      <div class="side-logo">
        <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ioDrive
      </div>
      <div class="side-close" id="side-close">
        <span style="font-size:12px;color:var(--sub)">\u83DC\u5355</span>
        <button onclick="closeSide()" title="\u5173\u95ED">\u2715</button>
      </div>
      <a class="nav on" data-nav="files" onclick="go('files')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>
        \u6587\u4EF6
      </a>
      <a class="nav" data-nav="uploads" onclick="go('uploads')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
        \u4E0A\u4F20\u8BB0\u5F55
      </a>
      <a class="nav" data-nav="downloads" onclick="go('downloads')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
        \u4E0B\u8F7D\u8BB0\u5F55
      </a>
      <a class="nav" data-nav="shares" onclick="go('shares')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
        \u5206\u4EAB\u94FE\u63A5
      </a>
      <a class="nav" data-nav="uploadkeys" onclick="go('uploadkeys')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        \u4E0A\u4F20\u94FE\u63A5
      </a>
      <a class="nav" data-nav="storage" onclick="go('storage')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        \u5B58\u50A8\u914D\u7F6E
      </a>
      <a class="nav" data-nav="moderation" onclick="go('moderation')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        \u5BA1\u6838\u65E5\u5FD7
      </a>
      <a class="nav" data-nav="account" onclick="go('account')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        \u8D26\u53F7\u8BBE\u7F6E
      </a>
      <div class="side-bottom">
        <div class="pill" onclick="localStorage.removeItem('iodrive_token');location.href='/login'">
          <div class="dot">A</div>
          <span>\u9000\u51FA</span>
        </div>
      </div>
    </nav>
    <div class="main">
      <header class="topbar">
        <button class="hamburger" id="hamburger" onclick="toggleSide()" title="\u83DC\u5355">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <div class="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="\u641C\u7D22\u6587\u4EF6" id="q" oninput="render()">
        </div>
        <div class="topbar-actions">
          <button class="icon-btn demo-hidden" onclick="createFolder()" title="\u65B0\u5EFA\u6587\u4EF6\u5939">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </button>
          <button class="theme-btn" onclick="toggleTheme()" title="\u5916\u89C2" id="theme-btn">\u{1F319}</button>
        </div>
      </header>

      <!-- Files page -->
      <div id="page-files">
        <div class="breadcrumbs" id="breadcrumbs"></div>
        <div class="backend-selector">
          <label>\u5B58\u50A8\uFF1A</label>
          <select id="backend-select" onchange="switchBackend(this.value)">
            <option value="">R2 (\u9ED8\u8BA4)</option>
          </select>
          <span id="backend-active-tag" class="backend-tag" style="display:none">R2</span>
        </div>
        <div class="sel-toolbar" id="sel-toolbar">
          <span class="sel-count" id="sel-count">\u5DF2\u9009\u62E9 0 \u9879</span>
          <div class="sel-actions">
            <button class="btn btn-s" onclick="batchShare()">\u5206\u4EAB</button>
            <button class="btn btn-s" onclick="batchMove()">\u79FB\u52A8</button>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="batchDelete()">\u5220\u9664</button>
          </div>
          <button class="btn btn-s" onclick="clearSelection()">\u53D6\u6D88</button>
        </div>
        <div class="list-head"><span><input type="checkbox" id="select-all" onchange="toggleSelectAll(this.checked)"></span><span></span><span>\u540D\u79F0</span><span class="sz">\u5927\u5C0F</span><span class="dt">\u4FEE\u6539\u65E5\u671F</span><span></span></div>
        <div class="list" id="file-list"></div>
      </div>

      <!-- Downloads page -->
      <div id="page-downloads" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="dl-stats" id="dl-stats"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="log-search"><input type="text" id="dl-search" placeholder="\u641C\u7D22\u6587\u4EF6\u6216 IP" oninput="renderLogs('downloads')"></div>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="clearDownloadLogs()">\u6E05\u7A7A</button>
          </div>
          <div class="log-list" id="dl-list"></div>
          <div id="dl-empty" style="display:none" class="log-empty"><div class="icon">\u{1F4CA}</div><div style="font-size:15px;font-weight:600">\u6682\u65E0\u4E0B\u8F7D\u8BB0\u5F55</div><div style="font-size:12px;margin-top:6px">\u6587\u4EF6\u88AB\u4E0B\u8F7D\u540E\uFF0C\u8BB0\u5F55\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002</div></div>
        </div>
      </div>

      <!-- Shares page -->
      <div id="page-shares" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="dl-stats" id="sh-stats"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="log-search"><input type="text" id="sh-search" placeholder="\u641C\u7D22\u6587\u4EF6\u6216\u8DEF\u5F84" oninput="renderShares()"></div>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="clearShares()">\u6E05\u7A7A</button>
          </div>
          <div class="log-list" id="sh-list"></div>
          <div id="sh-empty" style="display:none" class="log-empty"><div class="icon">\u{1F517}</div><div style="font-size:15px;font-weight:600">\u6682\u65E0\u5206\u4EAB\u94FE\u63A5</div><div style="font-size:12px;margin-top:6px">\u5728\u6587\u4EF6\u5217\u8868\u4E2D\u70B9\u51FB\u201C\u5206\u4EAB\u201D\u521B\u5EFA\u94FE\u63A5\u3002</div></div>
        </div>
      </div>

      <!-- Uploads page -->
      <div id="page-uploads" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="dl-stats" id="ul-stats"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="log-search"><input type="text" id="ul-search" placeholder="\u641C\u7D22\u6587\u4EF6\u6216 IP" oninput="renderLogs('uploads')"></div>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="clearUploadLogs()">\u6E05\u7A7A</button>
          </div>
          <div class="log-list" id="ul-list"></div>
          <div id="ul-empty" style="display:none" class="log-empty"><div class="icon">\u{1F4E4}</div><div style="font-size:15px;font-weight:600">\u6682\u65E0\u4E0A\u4F20\u7EDF\u8BA1</div><div style="font-size:12px;margin-top:6px">\u6587\u4EF6\u4E0A\u4F20\u6210\u529F\u540E\uFF0C\u8BB0\u5F55\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002</div></div>
        </div>
      </div>

      <!-- Upload Keys page -->
      <div id="page-uploadkeys" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="public-upload-card">
            <div style="font-size:15px;font-weight:700;color:var(--text)">\u516C\u5F00\u4E0A\u4F20</div>
            <div style="font-size:12px;color:var(--sub);margin-top:4px;line-height:1.5">\u65E0\u9700\u8D26\u53F7\uFF0C\u5B8C\u6210\u9A8C\u8BC1\u5373\u53EF\u4E0A\u4F20\u3002\u6587\u4EF6\u4F1A\u4FDD\u5B58\u5230 uploads/public/\u3002</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap">
              <input type="text" readonly id="public-upload-url" style="flex:1;min-width:200px;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);outline:none">
              <button class="btn btn-p" style="font-size:12px;padding:8px 16px" onclick="copyPublicUploadUrl()">\u590D\u5236</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px">
            <div style="font-size:16px;font-weight:700;color:var(--text)">\u4E0A\u4F20\u94FE\u63A5</div>
            <button class="btn btn-p demo-hidden" onclick="createUploadKey()">+ \u65B0\u5EFA</button>
          </div>
          <div class="dl-table-wrap">
            <table class="dl-table">
              <thead><tr><th>\u6807\u7B7E</th><th>\u8DEF\u5F84</th><th>\u521B\u5EFA\u65F6\u95F4</th><th>\u8FC7\u671F\u65F6\u95F4</th><th>\u4F7F\u7528\u6B21\u6570</th><th>\u72B6\u6001</th><th>\u64CD\u4F5C</th></tr></thead>
              <tbody id="uk-tbody"></tbody>
            </table>
          </div>
          <div id="uk-empty" style="display:none;padding:60px;text-align:center;color:var(--sub)">\u6682\u65E0\u4E0A\u4F20\u94FE\u63A5</div>
        </div>
      </div>

      <!-- Storage Config page -->
      <div id="page-storage" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text)">\u5B58\u50A8\u540E\u7AEF</div>
              <div style="font-size:12px;color:var(--sub);margin-top:4px">\u7BA1\u7406\u6587\u4EF6\u5B58\u50A8\u540E\u7AEF\uFF0C\u652F\u6301 R2\u3001AWS S3\u3001MinIO \u7B49\u591A\u79CD S3 \u517C\u5BB9\u5B58\u50A8</div>
            </div>
            <button class="btn btn-p demo-hidden" onclick="showAddStorage()">+ \u6DFB\u52A0\u540E\u7AEF</button>
          </div>
          <div id="storage-list"></div>
          <div id="storage-empty" style="display:none;padding:60px;text-align:center;color:var(--sub)">
            <div style="font-size:32px;margin-bottom:12px">\u2601\uFE0F</div>
            <div style="font-size:15px;font-weight:600">\u6682\u672A\u914D\u7F6E\u989D\u5916\u5B58\u50A8\u540E\u7AEF</div>
            <div style="font-size:12px;margin-top:6px">\u70B9\u51FB\u300C\u6DFB\u52A0\u540E\u7AEF\u300D\u914D\u7F6E S3 \u517C\u5BB9\u5B58\u50A8\u4F5C\u4E3A\u5907\u7528\u4E0B\u8F7D\u6E90</div>
          </div>
        </div>
      </div>

      <!-- Storage Add/Edit Modal -->
      <div id="storage-modal" onclick="if(event.target===this)closeStorageModal()" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4);backdrop-filter:blur(2px);align-items:center;justify-content:center">
        <div style="background:var(--card);border-radius:16px;box-shadow:var(--modal-shadow);width:520px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)">
            <div style="font-size:15px;font-weight:700" id="storage-modal-title">\u6DFB\u52A0\u5B58\u50A8\u540E\u7AEF</div>
            <button onclick="closeStorageModal()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--sub)">\u2715</button>
          </div>
          <div style="padding:20px">
            <div class="form-group">
              <label>\u63D0\u4F9B\u5546</label>
              <select id="sm-provider" onchange="onProviderChange()">
                <option value="aws">AWS S3</option>
                <option value="r2">Cloudflare R2 (S3 API)</option>
                <option value="b2">Backblaze B2</option>
                <option value="minio">MinIO (\u81EA\u5EFA)</option>
                <option value="alibaba">\u963F\u91CC\u4E91 OSS</option>
                <option value="tencent">\u817E\u8BAF\u4E91 COS</option>
                <option value="wasabi">Wasabi</option>
                <option value="digitalocean">DigitalOcean Spaces</option>
                <option value="volcengine">\u706B\u5C71\u5F15\u64CE TOS</option>
                <option value="custom">\u81EA\u5B9A\u4E49 S3 \u517C\u5BB9</option>
              </select>
            </div>
            <div class="form-group">
              <label>\u540D\u79F0 <span style="color:var(--sub);font-size:11px">(\u552F\u4E00\u6807\u8BC6)</span></label>
              <input type="text" id="sm-name" placeholder="\u4F8B: backup, b2-main">
            </div>
            <div class="form-group">
              <label>\u5B58\u50A8\u6876 <span style="color:var(--sub);font-size:11px">(Bucket)</span></label>
              <input type="text" id="sm-bucket" placeholder="my-bucket">
            </div>
            <div class="form-group">
              <label>Access Key</label>
              <input type="text" id="sm-accesskey" placeholder="Access Key ID">
            </div>
            <div class="form-group">
              <label>Secret Key</label>
              <input type="password" id="sm-secretkey" placeholder="Secret Access Key">
            </div>
            <div id="sm-cred-hint" style="font-size:12px;margin-top:-8px;margin-bottom:12px;display:none"></div>

            <!-- \u9AD8\u7EA7\u9009\u9879\u6298\u53E0 -->
            <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
              <button type="button" onclick="toggleAdvOptions()" style="background:none;border:none;font-size:12px;color:var(--sub);cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px">
                <span id="sm-adv-arrow">\u25B6</span> \u9AD8\u7EA7\u9009\u9879
              </button>
              <div id="sm-adv-options">
                <div class="form-group" style="margin-top:8px">
                  <label>Endpoint <span style="color:var(--sub);font-size:11px">(\u81EA\u52A8\u586B\u5145)</span></label>
                  <input type="text" id="sm-endpoint" placeholder="s3.amazonaws.com">
                </div>
                <div class="form-group">
                  <label>Region <span style="color:var(--sub);font-size:11px">(\u81EA\u52A8\u586B\u5145)</span></label>
                  <input type="text" id="sm-region" placeholder="us-east-1">
                </div>
                <div style="display:flex;gap:16px;margin:12px 0">
                  <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                    <input type="checkbox" id="sm-primary" onchange="if(this.checked&&!confirm('\u8BBE\u4E3A\u4E3B\u5B58\u50A8\u540E\uFF0C\u5176\u4ED6\u540E\u7AEF\u7684\u4E3B\u5B58\u50A8\u6807\u8BB0\u5C06\u88AB\u53D6\u6D88\u3002\u662F\u5426\u7EE7\u7EED\uFF1F'))this.checked=false"> \u8BBE\u4E3A\u4E3B\u5B58\u50A8
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer" title="\u5F00\u542F\u540E\uFF0C\u6587\u4EF6\u4E0A\u4F20\u65F6\u4F1A\u81EA\u52A8\u540C\u6B65\u5199\u5165\u6B64\u5B58\u50A8\u540E\u7AEF">
                    <input type="checkbox" id="sm-sync" checked> \u4E0A\u4F20\u65F6\u540C\u6B65 <span style="color:var(--sub);font-size:11px;cursor:help">\u24D8</span>
                  </label>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-s" onclick="testStorageConnection()" id="sm-test-btn">\u6D4B\u8BD5\u8FDE\u63A5</button>
              <button class="btn btn-p" onclick="saveStorageBackend()" id="sm-save-btn">\u4FDD\u5B58</button>
            </div>
            <div id="sm-test-result" class="sm-test-result"></div>
          </div>
        </div>
      </div>

      <!-- Moderation page -->
      <div id="page-moderation" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">\u5185\u5BB9\u5BA1\u6838</div>
          <div style="font-size:12px;color:var(--sub);margin-bottom:20px">\u9ED8\u8BA4\u5173\u95ED\u3002\u914D\u7F6E\u540E\u4E0A\u4F20\u56FE\u7247\u4F1A\u88AB\u5F02\u6B65\u9001\u5BA1\uFF0C\u547D\u4E2D\u89C4\u5219\u7684\u6587\u4EF6\u4F1A\u88AB\u81EA\u52A8\u5220\u9664\u3002</div>

          <!-- \u914D\u7F6E\u5361\u7247 -->
          <div class="ac-card" style="margin-bottom:20px">
            <div class="ac-card-title"><span class="ac-icon">\u{1F6E1}\uFE0F</span>\u5BA1\u6838\u914D\u7F6E</div>
            <div class="form-group">
              <label><input type="checkbox" id="mod-enabled" style="width:auto;margin-right:6px">\u542F\u7528\u5BA1\u6838</label>
            </div>
            <div class="form-group">
              <label>\u5BA1\u6838\u670D\u52A1</label>
              <select id="mod-provider" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);outline:none">
                <option value="none">\u5173\u95ED</option>
                <option value="moderatecontent">ModerateContent\uFF08\u5B98\u65B9 API\uFF09</option>
                <option value="nsfwjs">NSFWJS\uFF08\u81EA\u90E8\u7F72\uFF09</option>
              </select>
            </div>
            <div class="form-group" id="mod-apikey-group">
              <label>API Key\uFF08ModerateContent\uFF09</label>
              <input type="text" id="mod-apikey" placeholder="ModerateContent API key">
            </div>
            <div class="form-group" id="mod-apipath-group" style="display:none">
              <label>API \u5730\u5740\uFF08NSFWJS\uFF09</label>
              <input type="text" id="mod-apipath" placeholder="https://your-nsfwjs.example.com/classify">
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
              <button class="btn btn-s" onclick="testModeration()">\u6D4B\u8BD5</button>
              <button class="btn btn-p" onclick="saveModeration()">\u4FDD\u5B58</button>
            </div>
            <div id="mod-test-result" class="sm-test-result"></div>
          </div>

          <!-- \u65E5\u5FD7 -->
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
            <div style="font-size:14px;font-weight:600">\u5BA1\u6838\u65E5\u5FD7 <span id="mod-count" style="color:var(--sub);font-weight:400"></span></div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-s" onclick="loadModerationLogs()">\u5237\u65B0</button>
              <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="clearModerationLogs()">\u6E05\u7A7A</button>
            </div>
          </div>
          <div class="log-list" id="mod-list"></div>
          <div id="mod-empty" style="display:none" class="log-empty"><div class="icon">\u{1F6E1}\uFE0F</div><div style="font-size:15px;font-weight:600">\u6682\u65E0\u5BA1\u6838\u8BB0\u5F55</div><div style="font-size:12px;margin-top:6px">\u542F\u7528\u5BA1\u6838\u540E\uFF0C\u547D\u4E2D\u89C4\u5219\u7684\u6587\u4EF6\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002</div></div>
        </div>
      </div>

      <!-- Account Settings page -->
      <div id="page-account" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%;max-width:560px">
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">\u8D26\u53F7\u8BBE\u7F6E</div>
          <div style="font-size:12px;color:var(--sub);margin-bottom:24px">\u4FEE\u6539\u7BA1\u7406\u5458\u7528\u6237\u540D\u548C\u5BC6\u7801\uFF0C\u914D\u7F6E\u4FDD\u5B58\u5728 R2 \u5B58\u50A8\u4E2D</div>

          <!-- \u5F53\u524D\u51ED\u8BC1\u5361\u7247 -->
          <div class="ac-card">
            <div class="ac-card-title"><span class="ac-icon">\u{1F511}</span>\u5F53\u524D\u51ED\u8BC1</div>
            <div class="form-group">
              <label>\u7528\u6237\u540D</label>
              <input type="text" id="ac-username" placeholder="admin" autocomplete="username">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>\u5F53\u524D\u5BC6\u7801 <span style="color:var(--sub);font-size:11px">(\u5FC5\u586B)</span></label>
              <input type="password" id="ac-current-pass" placeholder="\u8F93\u5165\u5F53\u524D\u5BC6\u7801" autocomplete="current-password">
            </div>
          </div>

          <!-- \u4FEE\u6539\u5BC6\u7801\u5361\u7247 -->
          <div class="ac-card">
            <div class="ac-card-title"><span class="ac-icon">\u{1F512}</span>\u4FEE\u6539\u5BC6\u7801</div>
            <div class="form-group">
              <label>\u65B0\u5BC6\u7801 <span style="color:var(--sub);font-size:11px">(\u81F3\u5C11 6 \u4F4D)</span></label>
              <input type="password" id="ac-new-pass" placeholder="\u8F93\u5165\u65B0\u5BC6\u7801" autocomplete="new-password">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>\u786E\u8BA4\u65B0\u5BC6\u7801</label>
              <input type="password" id="ac-confirm-pass" placeholder="\u518D\u6B21\u8F93\u5165\u65B0\u5BC6\u7801" autocomplete="new-password">
            </div>
          </div>

          <!-- \u64CD\u4F5C\u680F -->
          <div style="display:flex;gap:12px;align-items:center;margin-top:4px">
            <button class="btn btn-p" onclick="saveAdminConfig()" id="ac-save-btn">\u4FDD\u5B58\u4FEE\u6539</button>
            <span class="ac-result" id="ac-result"></span>
          </div>

          <div id="ac-hint" style="margin-top:20px;padding:14px 16px;background:var(--bg);border:1px solid var(--border);border-radius:10px;font-size:12px;color:var(--sub);line-height:1.6">
            \u{1F4A1} \u4FEE\u6539\u7528\u6237\u540D\u548C\u5BC6\u7801\u540E\uFF0C\u4E0B\u6B21\u767B\u5F55\u9700\u8981\u4F7F\u7528\u65B0\u51ED\u8BC1\u3002\u5F53\u524D\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\u3002
          </div>
        </div>
      </div>
    </div>
  </div>

  <button class="fab demo-hidden" onclick="pickFile()" title="\u4E0A\u4F20">+</button>
  <div class="up-panel" id="up-panel">
    <div class="up-head"><span>\u4E0A\u4F20\u4E2D</span><button onclick="document.getElementById('up-panel').classList.remove('on')">\xD7</button></div>
    <div id="up-list"></div>
  </div>
  <div class="drop" id="drop"><div class="drop-text">\u62D6\u62FD\u6587\u4EF6\u5230\u6B64\u5904\u4E0A\u4F20</div></div>

  <script>
    if(!localStorage.getItem('iodrive_token'))location.href='/login';
    const PS=20*1024*1024,MC=6;
    const IS_DEMO=${isDemo ? "true" : "false"};
    let files=[],downloads=[],uploads=[],shares=[],folders=[],currentPath='uploads/',ancestors=[];
    let selectedKeys=new Set();
    let currentBackend='';

    // Theme
    function initTheme(){var t=localStorage.getItem('iodrive_theme')||'light';if(t==='dark')document.documentElement.setAttribute('data-theme','dark');updThemeUI()}
    function toggleTheme(){var d=document.documentElement.getAttribute('data-theme')==='dark';if(d){document.documentElement.removeAttribute('data-theme');localStorage.setItem('iodrive_theme','light')}else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('iodrive_theme','dark')}updThemeUI()}
    function updThemeUI(){var d=document.documentElement.getAttribute('data-theme')==='dark';document.getElementById('theme-btn').textContent=d?'\u2600\uFE0F':'\u{1F319}'}
    initTheme();

    // ESC \u952E\u5173\u95ED\u5F39\u7A97
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){
        var modal=document.getElementById('storage-modal');
        if(modal&&modal.style.display!=='none'){closeStorageModal();return}
        var overlays=document.querySelectorAll('.overlay');
        if(overlays.length>0){overlays[overlays.length-1].remove()}
      }
    });

    function fmt(b){if(!b)return'0 B';var u=['B','KB','MB','GB','TB'],i=0,s=b;while(s>=1024&&i<u.length-1){s/=1024;i++}return s.toFixed(i?1:0)+' '+u[i]}
    function fmtS(b){return fmt(b)+'/s'}
    function fmtE(s){if(!s||!isFinite(s))return'';if(s<60)return Math.ceil(s)+'s';if(s<3600)return Math.ceil(s/60)+'m';return(s/3600).toFixed(1)+'h'}
    function fi(n){var e=n.split('.').pop().toLowerCase(),m={pdf:'\\u{1F4C4}',doc:'\\u{1F4DD}',txt:'\\u{1F4DD}',jpg:'\\u{1F5BC}',png:'\\u{1F5BC}',mp4:'\\u{1F3AC}',mp3:'\\u{1F3B5}',zip:'\\u{1F4E6}',rar:'\\u{1F4E6}',exe:'\\u2699\\uFE0F'};return m[e]||'\\u{1F4C4}'}
    function fmtTime(iso){var d=new Date(iso);return d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
    function relTime(iso){var d=new Date(iso),now=new Date(),diff=(now.getTime()-d.getTime())/1000;if(diff<60)return'\u521A\u521A';if(diff<3600)return Math.floor(diff/60)+' \u5206\u949F\u524D';if(diff<86400)return Math.floor(diff/3600)+' \u5C0F\u65F6\u524D';if(diff<604800)return Math.floor(diff/86400)+' \u5929\u524D';return fmtTime(iso)}
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
    function trunc(s,n){if(!s||s.length<=n)return s;return s.slice(0,n)+'\u2026'}
    function checkDlScroll(){var w=document.getElementById('dl-table-wrap'),t=w?w.querySelector('table'):null;if(!w||!t)return;w.classList.toggle('can-scroll',t.scrollWidth>w.clientWidth)}

    async function api(p,o){o=o||{};var h=o.headers||{};var t=localStorage.getItem('iodrive_token');if(t)h['Authorization']='Bearer '+t;o.headers=h;try{var r=await fetch(p,o);if(r.status===401){localStorage.removeItem('iodrive_token');location.href='/login';return}return r}catch(e){console.error('API:',e);return null}}

    // Navigation
    function go(page){
      document.querySelectorAll('.nav').forEach(function(n){n.classList.remove('on')});
      var el=document.querySelector('[data-nav="'+page+'"]');if(el)el.classList.add('on');
      document.getElementById('page-files').style.display=page==='files'?'':'none';
      document.getElementById('page-uploads').style.display=page==='uploads'?'':'none';
      document.getElementById('page-downloads').style.display=page==='downloads'?'':'none';
      document.getElementById('page-shares').style.display=page==='shares'?'':'none';
      document.getElementById('page-uploadkeys').style.display=page==='uploadkeys'?'':'none';
      document.getElementById('page-storage').style.display=page==='storage'?'':'none';
      document.getElementById('page-moderation').style.display=page==='moderation'?'':'none';
      document.getElementById('page-account').style.display=page==='account'?'':'none';
      if(page==='files')loadFiles();
      if(page==='uploads')loadUploads();
      if(page==='downloads')loadDownloads();
      if(page==='shares')loadShares();
      if(page==='uploadkeys')loadUploadKeys();
      if(page==='storage')loadStorageBackends();
      if(page==='moderation'){loadModerationConfig();loadModerationLogs();}
      if(page==='account')loadAdminInfo();
      closeSide();
    }

    // Mobile sidebar
    function toggleSide(){document.getElementById('side').classList.toggle('open');document.getElementById('side-overlay').classList.toggle('on')}
    function closeSide(){document.getElementById('side').classList.remove('open');document.getElementById('side-overlay').classList.remove('on')}

    // \u2500\u2500 Files \u2500\u2500
    async function loadFiles(){
      var url='/api/files?prefix='+encodeURIComponent(currentPath);
      if(currentBackend)url+='&backend='+encodeURIComponent(currentBackend);
      var r=await api(url);
      if(!r)return;var d=await r.json();
      files=d.files||[];folders=d.folders||[];ancestors=d.ancestors||[];
      clearSelection();render();
    }

    // \u52A0\u8F7D\u53EF\u7528\u7684\u5B58\u50A8\u540E\u7AEF\u5217\u8868\uFF08\u7528\u4E8E\u6587\u4EF6\u6D4F\u89C8\u5207\u6362\uFF09
    async function loadBackendOptions(){
      var r=await api('/api/storage/backends');
      if(!r)return;var d=await r.json();
      var sel=document.getElementById('backend-select');
      var opts='<option value="">R2 (\u9ED8\u8BA4)</option>';
      if(d.backends){
        d.backends.forEach(function(b){
          opts+='<option value="'+esc(b.name)+'">'+esc(b.name)+' ('+esc(PROVIDER_PRESETS[b.provider]?PROVIDER_PRESETS[b.provider].name:b.provider)+')</option>';
        });
      }
      sel.innerHTML=opts;
      sel.value=currentBackend;
    }
    loadProviderPresets().then(function(){loadBackendOptions()});

    function switchBackend(name){
      currentBackend=name;
      // \u975E R2 \u540E\u7AEF\u7684\u6839\u8DEF\u5F84\u4E3A / \u800C\u975E uploads/
      currentPath=name?'':'uploads/';
      var tag=document.getElementById('backend-active-tag');
      if(name){tag.style.display='';tag.textContent=name}else{tag.style.display='none'}
      loadFiles();
    }

    // Breadcrumbs
    function renderBreadcrumbs(){
      var bc=document.getElementById('breadcrumbs');
      var rootPath=currentBackend?'':'uploads/';
      var rootLabel=currentBackend?'\u{1F4E6} '+esc(currentBackend)+' \u6839\u76EE\u5F55':'\u{1F4C2} \u6839\u76EE\u5F55';
      var h='<span class="bc-item" onclick="navigateTo(&apos;'+rootPath+'&apos;)">'+rootLabel+'</span>';
      for(var i=0;i<ancestors.length;i++){
        var a=ancestors[i];
        h+='<span class="bc-sep">/</span>';
        if(i===ancestors.length-1)h+='<span class="bc-item bc-cur">'+esc(a.name)+'</span>';
        else h+='<span class="bc-item" onclick="navigateTo(&apos;'+esc(a.path)+'&apos;)">'+esc(a.name)+'</span>';
      }
      bc.innerHTML=h;
    }
    function navigateTo(path){currentPath=path;loadFiles()}

    // Selection
    function toggleSelectAll(checked){
      document.querySelectorAll('.row-chk').forEach(function(cb){
        cb.checked=checked;var key=cb.dataset.key;
        if(checked)selectedKeys.add(key);else selectedKeys.delete(key);
      });
      updSelUI();
    }
    function updSelUI(){
      var tb=document.getElementById('sel-toolbar'),cnt=document.getElementById('sel-count');
      var n=selectedKeys.size;
      if(n>0){tb.style.display='flex';cnt.textContent='\u5DF2\u9009\u62E9 '+n+' \u9879'}
      else{tb.style.display='none';document.getElementById('select-all').checked=false}
    }
    function clearSelection(){
      selectedKeys.clear();
      document.querySelectorAll('.row-chk').forEach(function(cb){cb.checked=false});
      document.getElementById('select-all').checked=false;
      updSelUI();
    }

    function render(){
      var c=document.getElementById('file-list');if(!c)return;
      renderBreadcrumbs();
      var q=(document.getElementById('q').value||'').toLowerCase();
      var h='';
      // Folders
      for(var i=0;i<folders.length;i++){
        var f=folders[i];
        h+='<div class="row folder-row" data-fpath="'+esc(f.path)+'" style="animation-delay:'+Math.min(i*30,300)+'ms">'+
          '<div class="chk"><input type="checkbox" class="row-chk" data-key="'+esc(f.path)+'"></div>'+
          '<div class="ic">\u{1F4C1}</div>'+
          '<div class="nm" title="'+esc(f.name)+'">'+esc(f.name)+'</div>'+
          '<div class="sz">--</div><div class="dt"></div><div class="ac"></div></div>';
      }
      // Files (ff stores {f:file, i:originalIndex} to fix search + action mismatch)
      var ff=q?files.map(function(x,i){return{f:x,i:i}}).filter(function(o){return o.f.name.toLowerCase().includes(q)}):files.map(function(x,i){return{f:x,i:i}});
      for(var j=0;j<ff.length;j++){
        var x=ff[j].f,oi=ff[j].i,e=esc(x.name),fiIdx=folders.length+j;
        h+='<div class="row" data-i="'+oi+'" style="animation-delay:'+Math.min(fiIdx*30,300)+'ms">'+
          '<div class="chk"><input type="checkbox" class="row-chk" data-key="'+esc(x.key)+'"></div>'+
          '<div class="ic">'+fi(x.name)+'</div>'+
          '<div class="nm" title="'+e+'">'+e+'</div>'+
          '<div class="sz">'+fmt(x.size)+'</div>'+
          '<div class="dt">'+new Date(x.uploaded).toLocaleDateString('zh-CN')+'</div>'+
          '<div class="ac"><button data-act="share" data-i="'+oi+'" title="\u5206\u4EAB">\u{1F4E4}</button>'+
          '<button data-act="dl" data-i="'+oi+'" title="\u4E0B\u8F7D">\u2B07\uFE0F</button>'+
          (IS_DEMO?'':'<button data-act="del" data-i="'+oi+'" title="\u5220\u9664">\u{1F5D1}\uFE0F</button>')+'</div></div>';
      }
      if(!h)h='<div class="empty">'+(q?'\u672A\u627E\u5230\u5339\u914D\u7684\u6587\u4EF6':(IS_DEMO?'\u6B64\u6587\u4EF6\u5939\u4E3A\u7A7A':'\u6B64\u6587\u4EF6\u5939\u4E3A\u7A7A<br><span style="font-size:12px;margin-top:8px;display:inline-block;color:var(--sub)">\u5C06\u6587\u4EF6\u62D6\u5230\u8FD9\u91CC\uFF0C\u6216\u70B9\u51FB\u53F3\u4E0B\u89D2 +</span>'))+'</div>';
      c.innerHTML=h;
    }

    document.addEventListener('change',function(e){
      if(e.target.classList.contains('row-chk')){
        var key=e.target.dataset.key;
        if(e.target.checked)selectedKeys.add(key);else selectedKeys.delete(key);
        updSelUI();
      }
    });

    document.addEventListener('click',function(e){
      // \u5982\u679C\u70B9\u51FB\u7684\u662F\u590D\u9009\u6846\uFF0C\u4E0D\u89E6\u53D1\u8FDB\u5165\u6587\u4EF6\u5939
      if(e.target.classList.contains('row-chk'))return;
      var folderRow=e.target.closest('[data-fpath]');
      if(folderRow){currentPath=folderRow.dataset.fpath;loadFiles();return}
      var btn=e.target.closest('[data-act]');if(!btn)return;
      var idx=parseInt(btn.dataset.i),f=files[idx];if(!f)return;
      if(btn.dataset.act==='share')share(f.key,f.name);
      else if(btn.dataset.act==='dl')dl(f.key,f.name);
      else if(btn.dataset.act==='del')del(f.key,f.name);
    });

    // \u2500\u2500 Downloads \u2500\u2500
    async function loadDownloads(){
      var stats=document.getElementById('dl-stats');
      try{
        var r=await api('/api/download/logs');
        if(!r){stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">\u52A0\u8F7D\u5931\u8D25</div></div>';return}
        var d=await r.json();downloads=d.logs||[];
        var total=downloads.length,ips=new Set(downloads.map(function(x){return x.ip||''})).size,sources={r2:0,s3:0};
        downloads.forEach(function(x){if(x.source==='s3')sources.s3++;else sources.r2++});
        stats.innerHTML='<div class="dl-stat"><div class="num">'+total+'</div><div class="label">\u603B\u4E0B\u8F7D</div></div><div class="dl-stat"><div class="num">'+ips+'</div><div class="label">\u72EC\u7ACBIP</div></div><div class="dl-stat"><div class="num">'+sources.r2+'</div><div class="label">R2</div></div><div class="dl-stat"><div class="num">'+sources.s3+'</div><div class="label">S3</div></div>';
        renderLogs('downloads');
      }catch(e){console.error('loadDownloads:',e);stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">\u52A0\u8F7D\u5931\u8D25</div></div>'}
    }

    // \u2500\u2500 Uploads \u2500\u2500
    async function loadUploads(){
      var stats=document.getElementById('ul-stats');
      try{
        var r=await api('/api/upload-logs/logs');
        if(!r){stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">\u52A0\u8F7D\u5931\u8D25</div></div>';return}
        var d=await r.json();uploads=d.logs||[];
        var total=uploads.length,sources={dashboard:0,public:0,'upload-key':0};
        uploads.forEach(function(x){if(sources[x.source]!==undefined)sources[x.source]++});
        stats.innerHTML='<div class="dl-stat"><div class="num">'+total+'</div><div class="label">\u603B\u4E0A\u4F20</div></div><div class="dl-stat"><div class="num">'+sources.dashboard+'</div><div class="label">\u540E\u53F0</div></div><div class="dl-stat"><div class="num">'+sources.public+'</div><div class="label">\u516C\u5F00</div></div><div class="dl-stat"><div class="num">'+sources['upload-key']+'</div><div class="label">\u94FE\u63A5</div></div>';
        renderLogs('uploads');
      }catch(e){console.error('loadUploads:',e);stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">\u52A0\u8F7D\u5931\u8D25</div></div>'}
    }

    function renderLogs(type){
      var arr=type==='downloads'?downloads:uploads;
      var list=document.getElementById(type==='downloads'?'dl-list':'ul-list');
      var empty=document.getElementById(type==='downloads'?'dl-empty':'ul-empty');
      var q=(document.getElementById(type==='downloads'?'dl-search':'ul-search').value||'').toLowerCase();
      var filtered=q?arr.filter(function(x){return (x.name||'').toLowerCase().includes(q)||(x.ip||'').toLowerCase().includes(q)}):arr;
      if(!filtered.length){list.innerHTML='';empty.style.display='block';return}
      empty.style.display='none';
      var h='';
      for(var i=filtered.length-1;i>=0&&i>=filtered.length-200;i--){
        var x=filtered[i],idx=arr.indexOf(x);
        var icon=fi(x.name||x.key||'');
        var tags='';
        if(type==='downloads'){
          var srcClass=x.source==='s3'?'src-s3':'src-r2';
          tags+='<span class="lc-tag '+srcClass+'">'+(x.source==='s3'?'S3':'R2')+'</span>';
          tags+='<span class="lc-tag">'+(x.completed?'\u5DF2\u5B8C\u6210':'\u4E0B\u8F7D\u4E2D')+'</span>';
        }else{
          var srcMap={dashboard:['src-dashboard','\u540E\u53F0'],public:['src-public','\u516C\u5F00'],'upload-key':['src-upload-key','\u94FE\u63A5']};
          var sm=srcMap[x.source]||['','-'];
          tags+='<span class="lc-tag '+sm[0]+'">'+sm[1]+'</span>';
          if(x.uploadKeyLabel)tags+='<span class="lc-tag">'+esc(trunc(x.uploadKeyLabel,16))+'</span>';
        }
        h+='<div class="log-card" onclick="showLogDetail(&apos;'+type+'&apos;,'+idx+')">'+
          '<div class="lc-icon">'+icon+'</div>'+
          '<div class="lc-main">'+
            '<div class="lc-name">'+esc(x.name||x.key)+'</div>'+
            '<div class="lc-meta">'+relTime(x.time)+' \xB7 '+fmt(x.size)+' \xB7 '+esc(x.ip||'-')+' \xB7 '+esc(x.country||'-')+'</div>'+
          '</div>'+
          '<div class="lc-tags">'+tags+'</div>'+
          '<div class="lc-actions" onclick="event.stopPropagation()">'+
            '<button onclick="showLogDetail(&apos;'+type+'&apos;,'+idx+')" title="\u8BE6\u60C5">\u2139\uFE0F</button>'+
            '<button class="danger" onclick="deleteLog(&apos;'+type+'&apos;,&apos;'+esc(x.logKey||'')+'&apos;)" title="\u5220\u9664">\u{1F5D1}</button>'+
          '</div>'+
        '</div>';
      }
      list.innerHTML=h;
    }

    // \u2500\u2500 Shares \u2500\u2500
    async function loadShares(){
      var stats=document.getElementById('sh-stats');
      try{
        var r=await api('/api/share');
        if(!r){stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">\u52A0\u8F7D\u5931\u8D25</div></div>';return}
        var d=await r.json();shares=d.shares||[];
        var total=shares.length,expired=0,downloads=0;
        shares.forEach(function(x){if(x.expires&&new Date(x.expires)<new Date())expired++;downloads+=x.downloads||0});
        stats.innerHTML='<div class="dl-stat"><div class="num">'+total+'</div><div class="label">\u603B\u5206\u4EAB</div></div><div class="dl-stat"><div class="num">'+downloads+'</div><div class="label">\u603B\u4E0B\u8F7D</div></div><div class="dl-stat"><div class="num">'+expired+'</div><div class="label">\u5DF2\u8FC7\u671F</div></div>';
        renderShares();
      }catch(e){console.error('loadShares:',e);stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">\u52A0\u8F7D\u5931\u8D25</div></div>'}
    }

    function renderShares(){
      var list=document.getElementById('sh-list');
      var empty=document.getElementById('sh-empty');
      var q=(document.getElementById('sh-search').value||'').toLowerCase();
      var filtered=q?shares.filter(function(x){return (x.name||'').toLowerCase().includes(q)||(x.key||'').toLowerCase().includes(q)}):shares.slice();
      if(!filtered.length){list.innerHTML='';empty.style.display='block';return}
      empty.style.display='none';
      var h='';
      filtered.sort(function(a,b){return new Date(b.created)-new Date(a.created)});
      for(var i=0;i<filtered.length;i++){
        var x=filtered[i],url=location.origin+'/s/'+x.token;
        var expired=x.expires&&new Date(x.expires)<new Date();
        var statusTag=expired?'<span class="lc-tag" style="color:#ef4444;background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.2)">\u5DF2\u8FC7\u671F</span>':'<span class="lc-tag" style="color:#22c55e;background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.2)">\u6709\u6548</span>';
        var icon=fi(x.name||x.key||'');
        h+='<div class="log-card">'+
          '<div class="lc-icon">'+icon+'</div>'+
          '<div class="lc-main">'+
            '<div class="lc-name">'+esc(x.name||x.key)+'</div>'+
            '<div class="lc-meta">'+fmtTime(x.created)+' \xB7 '+esc(x.key)+' \xB7 \u4E0B\u8F7D '+(x.downloads||0)+' \u6B21</div>'+
          '</div>'+
          '<div class="lc-tags">'+statusTag+'</div>'+
          '<div class="lc-actions">'+
            '<button onclick="var b=this;navigator.clipboard.writeText(&apos;'+url+'&apos;);b.textContent=&apos;\u2713&apos;;setTimeout(function(){b.textContent=&apos;\u590D\u5236&apos;},1000)" title="\u590D\u5236\u94FE\u63A5">\u{1F4CB}</button>'+
            '<button onclick="deleteShare(&apos;'+x.token+'&apos;,&apos;'+esc(x.name||x.key)+'&apos;)" class="danger" title="\u5220\u9664">\u{1F5D1}</button>'+
          '</div>'+
        '</div>';
      }
      list.innerHTML=h;
    }

    async function deleteShare(token,name){
      if(IS_DEMO)return;
      if(!confirm('\u5220\u9664\u5206\u4EAB\u300C'+(name||token)+'\u300D\uFF1F'))return;
      var r=await api('/api/share/'+token,{method:'DELETE'});
      if(r&&r.ok)loadShares();
    }

    async function clearShares(){
      if(IS_DEMO)return;
      if(!shares.length)return;
      if(!confirm('\u6E05\u7A7A\u5168\u90E8 '+shares.length+' \u6761\u5206\u4EAB\u94FE\u63A5\uFF1F'))return;
      var ok=0;
      for(var i=0;i<shares.length;i++){
        var r=await api('/api/share/'+shares[i].token,{method:'DELETE'});
        if(r&&r.ok)ok++;
      }
      alert('\u5DF2\u5220\u9664 '+ok+' \u6761\u5206\u4EAB');loadShares();
    }

    function showLogDetail(type,idx){
      var arr=type==='downloads'?downloads:uploads;
      var x=arr[idx];if(!x)return;
      var isDl=type==='downloads';
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      var html='<h2>'+(isDl?'\u4E0B\u8F7D\u8BE6\u60C5':'\u4E0A\u4F20\u8BE6\u60C5')+'</h2>'+
        '<div style="font-size:13px;color:var(--text);line-height:1.7;word-break:break-word">'+
        '<p><b>\u65F6\u95F4\uFF1A</b>'+fmtTime(x.time)+'</p>'+
        '<p><b>\u6587\u4EF6\uFF1A</b>'+esc(x.name||x.key)+'</p>'+
        '<p><b>\u8DEF\u5F84\uFF1A</b><span style="word-break:break-all;font-family:monospace;font-size:12px;color:var(--sub)">'+esc(x.key||'-')+'</span></p>'+
        '<p><b>\u5927\u5C0F\uFF1A</b>'+fmt(x.size)+'</p>';
      if(isDl){
        html+='<p><b>\u6765\u6E90\uFF1A</b>'+esc(x.source||'-')+'</p>'+
          '<p><b>\u5206\u4EAB\u4EE4\u724C\uFF1A</b>'+esc(x.shareToken||'-')+'</p>';
      }else{
        var srcMap={dashboard:'\u540E\u53F0',public:'\u516C\u5F00\u4E0A\u4F20','upload-key':'\u4E0A\u4F20\u94FE\u63A5'};
        html+='<p><b>\u6765\u6E90\uFF1A</b>'+(srcMap[x.source]||x.source)+'</p>';
        if(x.uploadKeyLabel)html+='<p><b>\u94FE\u63A5\u6807\u7B7E\uFF1A</b>'+esc(x.uploadKeyLabel)+'</p>';
      }
      html+='<p><b>IP\uFF1A</b>'+esc(x.ip||'-')+'</p>'+
        '<p><b>\u5730\u533A\uFF1A</b>'+esc(x.country||'-')+'</p>'+
        '<p><b>\u6D4F\u89C8\u5668\uFF1A</b>'+esc(x.browser||'-')+'</p>'+
        '<p><b>\u7CFB\u7EDF\uFF1A</b>'+esc(x.os||'-')+'</p>'+
        '<p><b>\u8BBE\u5907\uFF1A</b>'+esc(x.deviceType||'-')+'</p>'+
        '<p><b>UA\uFF1A</b><span style="word-break:break-all;font-size:12px;color:var(--sub)">'+esc(x.ua||'-')+'</span></p>';
      if(x.referer)html+='<p><b>Referer\uFF1A</b>'+esc(x.referer)+'</p>';
      if(isDl&&x.completed!==undefined)html+='<p><b>\u5B8C\u6210\u72B6\u6001\uFF1A</b>'+(x.completed?'\u5DF2\u5B8C\u6210':'\u672A\u5B8C\u6210')+'</p>';
      html+='</div><div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">\u5173\u95ED</button></div>';
      m.innerHTML=html;o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
    }

    async function deleteLog(type,logKey){
      if(IS_DEMO)return;
      if(!logKey||!confirm('\u5220\u9664\u8FD9\u6761\u8BB0\u5F55\uFF1F'))return;
      var endpoint=type==='downloads'?'/api/download/logs/':'/api/upload-logs/logs/';
      var r=await api(endpoint+logKey.split('/').map(encodeURIComponent).join('/'),{method:'DELETE'});
      if(r&&r.ok){if(type==='downloads')loadDownloads();else loadUploads();}
    }

    async function clearUploadLogs(){
      if(IS_DEMO)return;
      if(!confirm('\u6E05\u7A7A\u6240\u6709\u4E0A\u4F20\u8BB0\u5F55\uFF1F'))return;
      var r=await api('/api/upload-logs/logs',{method:'DELETE'});
      if(r&&r.ok){var d=await r.json();alert('\u5DF2\u6E05\u7A7A '+d.deleted+' \u6761\u8BB0\u5F55');loadUploads()}
    }

    // \u2500\u2500 Upload \u2500\u2500
    function pickFile(){if(IS_DEMO)return;var i=document.createElement('input');i.type='file';i.multiple=true;i.onchange=function(){for(var j=0;j<i.files.length;j++)up(i.files[j])};i.click()}
    async function up(file){if(IS_DEMO)return;document.getElementById('up-panel').classList.add('on');var id='u'+Date.now()+Math.random().toString(36).slice(2,6);document.getElementById('up-list').insertAdjacentHTML('beforeend','<div class="up-item" id="'+id+'"><div class="nm">'+file.name+' ('+fmt(file.size)+')</div><div class="up-bar"><div class="fl" style="width:0%"></div></div><div class="st">\u51C6\u5907...</div></div>');try{if(file.size<=PS)await upS(file,id);else await upM(file,id);st(id,'\u2705 \u5B8C\u6210');loadFiles()}catch(e){st(id,'\u274C '+e.message)}}
    function xhrUp(url,fd,id){return new Promise(function(ok,no){var x=new XMLHttpRequest(),t0=Date.now();x.open('POST',url);var tk=localStorage.getItem('iodrive_token');if(tk)x.setRequestHeader('Authorization','Bearer '+tk);x.upload.onprogress=function(e){if(e.lengthComputable){var el=(Date.now()-t0)/1000,sp=el>0?e.loaded/el:0,pct=Math.round(e.loaded/e.total*100),rm=sp>0?(e.total-e.loaded)/sp:0;prog(id,pct);st(id,fmtS(sp)+' \xB7 '+pct+'% \xB7 \u5269\u4F59 '+fmtE(rm))}};x.onload=function(){if(x.status>=200&&x.status<300){try{ok(JSON.parse(x.responseText))}catch{ok(x.responseText)}}else{try{no(new Error(JSON.parse(x.responseText).error))}catch{no(new Error('\u5931\u8D25 '+x.status))}}};x.onerror=function(){no(new Error('\u7F51\u7EDC\u9519\u8BEF'))};x.send(fd)})}
    async function upS(f,id){var fd=new FormData();fd.append('file',f);fd.append('path',currentPath);await xhrUp('/api/upload/single',fd,id)}
    async function upM(f,id){var r=await api('/api/upload/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,size:f.size,path:currentPath})});if(!r||!r.ok)throw new Error('\u521D\u59CB\u5316\u5931\u8D25');var d=await r.json(),uid=d.uploadId,key=d.key;var tp=Math.ceil(f.size/PS),parts=[],pp=new Array(tp).fill(0),t0=Date.now(),q=[];for(var i=0;i<tp;i++){(function(pi,pn){var s=pi*PS,e=Math.min(s+PS,f.size),ch=f.slice(s,e);q.push(function(){return new Promise(function(ok,no){var fd=new FormData();fd.append('uploadId',uid);fd.append('key',key);fd.append('partNumber',String(pn));fd.append('chunk',ch);var x=new XMLHttpRequest();x.open('POST','/api/upload/part');var tk=localStorage.getItem('iodrive_token');if(tk)x.setRequestHeader('Authorization','Bearer '+tk);x.upload.onprogress=function(ev){if(ev.lengthComputable){pp[pi]=ev.loaded;var td=0;for(var j=0;j<pp.length;j++)td+=pp[j];var el=(Date.now()-t0)/1000,sp=el>0?td/el:0,pct=Math.round(td/f.size*100),rm=sp>0?(f.size-td)/sp:0;prog(id,pct);st(id,fmtS(sp)+' \xB7 '+pct+'% (\u5206\u7247 '+pn+'/'+tp+') \xB7 '+fmtE(rm))}};x.onload=function(){if(x.status>=200&&x.status<300){parts.push({partNumber:pn,etag:JSON.parse(x.responseText).etag});ok()}else{no(new Error('\u5206\u7247'+pn+'\u5931\u8D25'))}};x.onerror=function(){no(new Error('\u7F51\u7EDC\u9519\u8BEF'))};x.send(fd)})})})(i,i+1)}try{await conc(q,MC)}catch(e){api('/api/upload/abort',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key})}).catch(function(){});throw e}parts.sort(function(a,b){return a.partNumber-b.partNumber});var cr=await api('/api/upload/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key,parts:parts})});if(!cr||!cr.ok)throw new Error('\u5B8C\u6210\u5931\u8D25')}
    async function conc(ts,lim){var ex=new Set();for(var i=0;i<ts.length;i++){if(ex.size>=lim)await Promise.race(ex);let p=ts[i]().then(function(){ex.delete(p)}).catch(function(){ex.delete(p)});ex.add(p)}await Promise.all(ex)}
    function prog(id,p){var f=document.querySelector('#'+id+' .fl');if(f)f.style.width=p+'%'}
    function st(id,t){var e=document.querySelector('#'+id+' .st');if(e)e.textContent=t}
    if(!IS_DEMO){
      var dz=document.getElementById('drop'),dragT;
      document.addEventListener('dragenter',function(e){e.preventDefault();clearTimeout(dragT);dz.classList.add('on')});
      dz.addEventListener('dragleave',function(){dragT=setTimeout(function(){dz.classList.remove('on')},80)});
      dz.addEventListener('dragover',function(e){e.preventDefault()});
      dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('on');for(var i=0;i<e.dataTransfer.files.length;i++)up(e.dataTransfer.files[i])});
    }

    // \u2500\u2500 Share single file \u2500\u2500
    async function share(key,name){
      var r=await api('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key,name:name})});
      if(!r||!r.ok)return alert('\u5206\u4EAB\u5931\u8D25');var d=await r.json(),url=location.origin+'/s/'+d.token;
      showShareModal(url,name);
    }
    function showShareModal(url,name){
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      m.innerHTML='<h2>\u5206\u4EAB</h2><p style="color:var(--sub);font-size:13px;margin-bottom:14px">'+esc(name)+'</p><label>\u94FE\u63A5</label><input type="text" readonly><div class="btn-row"><button class="btn btn-s">\u5173\u95ED</button><button class="btn btn-p">\u590D\u5236</button></div>';
      var inp=m.querySelector('input');inp.value=url;inp.onclick=function(){this.select()};
      m.querySelector('.btn-s').onclick=function(){o.remove()};
      m.querySelector('.btn-p').onclick=function(){var b=this;navigator.clipboard.writeText(url);b.textContent='\u5DF2\u590D\u5236';setTimeout(function(){b.textContent='\u590D\u5236'},1200)};
      o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
    }

    // \u2500\u2500 Download (direct via presigned URL + beacon) \u2500\u2500
    async function dl(key,name){
      if(!key)return;
      var r=await api('/api/download/presign/'+key.split('/').map(encodeURIComponent).join('/'));
      if(!r||!r.ok)return;
      var d=await r.json();
      // \u4F7F\u7528 <a> \u6807\u7B7E\u4E0B\u8F7D\uFF0C\u907F\u514D window.open \u88AB\u5F39\u7A97\u62E6\u622A
      var a=document.createElement('a');a.href=d.url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
      if(d.logKey){
        setTimeout(function(){try{navigator.sendBeacon('/api/download/beacon',JSON.stringify({logKey:d.logKey,event:'complete'}))}catch(e){}},5000);
      }
    }

    // \u2500\u2500 Delete \u2500\u2500
    async function del(key,name){
      if(IS_DEMO)return;
      if(!confirm('\u5220\u9664\u300C'+name+'\u300D\uFF1F'))return;
      var delUrl='/api/files/'+key.split('/').map(encodeURIComponent).join('/')+(currentBackend?'?backend='+encodeURIComponent(currentBackend):'');
      var r=await api(delUrl,{method:'DELETE'});
      if(r&&r.ok)loadFiles();
    }

    // \u2500\u2500 Create folder \u2500\u2500
    function createFolder(){
      if(IS_DEMO)return;
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      m.innerHTML='<h2>\u65B0\u5EFA\u6587\u4EF6\u5939</h2><label>\u540D\u79F0</label><input type="text" id="new-folder-name" placeholder="\u6587\u4EF6\u5939\u540D\u79F0" autofocus><div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">\u53D6\u6D88</button><button class="btn btn-p" id="cf-btn">\u521B\u5EFA</button></div>';
      o.appendChild(m);document.body.appendChild(o);
      m.querySelector('#cf-btn').onclick=async function(){
        var name=document.getElementById('new-folder-name').value.trim();
        if(!name)return;
        var folderUrl='/api/files/folder'+(currentBackend?'?backend='+encodeURIComponent(currentBackend):'');
        var r=await api(folderUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:currentPath+name})});
        if(r&&r.ok){o.remove();loadFiles()}else if(r){r.json().then(function(d){alert(d.error||'\u521B\u5EFA\u5931\u8D25')})}
      };
      m.querySelector('input').onkeydown=function(e){if(e.key==='Enter')m.querySelector('#cf-btn').click()};
      setTimeout(function(){document.getElementById('new-folder-name').focus()},100);
    }

    // \u2500\u2500 Batch operations \u2500\u2500
    async function batchDelete(){
      if(IS_DEMO)return;
      if(!selectedKeys.size)return;
      if(!confirm('\u5220\u9664\u9009\u4E2D\u7684 '+selectedKeys.size+' \u4E2A\u9879\u76EE\uFF1F'))return;
      var keys=Array.from(selectedKeys);
      var delUrl='/api/files/batch-delete'+(currentBackend?'?backend='+encodeURIComponent(currentBackend):'');
      var r=await api(delUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys})});
      if(r&&r.ok){clearSelection();loadFiles()}
    }

    async function batchShare(){
      if(!selectedKeys.size)return;
      var keys=Array.from(selectedKeys);
      var r=await api('/api/share/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys})});
      if(!r||!r.ok)return;
      var d=await r.json();
      if(!d.shares||!d.shares.length){alert('\u6CA1\u6709\u53EF\u5206\u4EAB\u7684\u6587\u4EF6');return}
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      var html='<h2>\u5206\u4EAB '+d.shares.length+' \u4E2A\u6587\u4EF6</h2><div class="batch-share-list">';
      for(var i=0;i<d.shares.length;i++){
        var s=d.shares[i],url=location.origin+'/s/'+s.token;
        html+='<div class="batch-share-item"><span class="bs-name">'+esc(s.name)+'</span><span class="bs-url">'+url+'</span><button class="cp bs-cp" onclick="var b=this;navigator.clipboard.writeText(&apos;'+url+'&apos;);b.textContent=&apos;\u2713&apos;;setTimeout(function(){b.textContent=&apos;\u590D\u5236&apos;},1000)">\u590D\u5236</button></div>';
      }
      html+='</div><div class="btn-row"><button class="btn btn-p" onclick="var t=[];document.querySelectorAll(&apos;.bs-url&apos;).forEach(function(e){t.push(e.textContent)});navigator.clipboard.writeText(t.join(&apos;\\n&apos;));this.textContent=&apos;\u5DF2\u590D\u5236&apos;;var b=this;setTimeout(function(){b.textContent=&apos;\u590D\u5236\u6240\u6709\u94FE\u63A5&apos;},1200)">\u590D\u5236\u6240\u6709\u94FE\u63A5</button><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">\u5173\u95ED</button></div>';
      m.innerHTML=html;o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
      clearSelection();
    }

    async function batchMove(){
      if(!selectedKeys.size)return;
      var bkParam=currentBackend?'?backend='+encodeURIComponent(currentBackend):'';
      var r=await api('/api/files/folders'+bkParam);
      if(!r||!r.ok)return;
      var d=await r.json();
      var allFolders=d.folders||[];
      var rootPath=currentBackend?'':'uploads/';
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      var html='<h2>\u79FB\u52A8\u5230\u6587\u4EF6\u5939</h2><label>\u76EE\u6807\u4F4D\u7F6E</label><select id="move-target">';
      html+='<option value="'+esc(rootPath)+'">\u6839\u76EE\u5F55</option>';
      for(var i=0;i<allFolders.length;i++){var f=allFolders[i];
        if(f===currentPath)continue;
        var label=currentBackend?f:f.replace('uploads/','');
        html+='<option value="'+esc(f)+'">'+esc(label)+'</option>';
      }
      html+='</select><div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">\u53D6\u6D88</button><button class="btn btn-p" id="bm-btn">\u79FB\u52A8</button></div>';
      m.innerHTML=html;o.appendChild(m);document.body.appendChild(o);
      m.querySelector('#bm-btn').onclick=async function(){
        var target=document.getElementById('move-target').value;
        var keys=Array.from(selectedKeys);
        var moveUrl='/api/files/move'+(currentBackend?'?backend='+encodeURIComponent(currentBackend):'');
        var r2=await api(moveUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys:keys,targetPath:target})});
        if(r2&&r2.ok){o.remove();clearSelection();loadFiles()}
      };
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
    }

    // \u2500\u2500 Upload Keys \u2500\u2500
    async function loadUploadKeys(){
      document.getElementById('public-upload-url').value=location.origin+'/upload';
      var tbody=document.getElementById('uk-tbody');
      var empty=document.getElementById('uk-empty');
      try{
        var r=await api('/api/upload-keys');
        if(!r||!r.ok){tbody.innerHTML='';empty.style.display='block';empty.textContent='\u52A0\u8F7D\u5931\u8D25';return}
        var d=await r.json();var keys=d.keys||[];
        if(!keys.length){tbody.innerHTML='';empty.style.display='block';empty.innerHTML='<div style="padding:60px;text-align:center;color:var(--sub)"><div style="font-size:32px;margin-bottom:12px">\u{1F517}</div><p>\u6682\u65E0\u4E0A\u4F20\u94FE\u63A5</p><p style="font-size:12px;margin-top:8px">\u70B9\u51FB + \u65B0\u5EFA\u4E00\u4E2A</p></div>';return}
        empty.style.display='none';
        var h='';
        for(var i=0;i<keys.length;i++){
          var k=keys[i];
          var expired=new Date(k.expires)<new Date();
          var status=expired?'<span style="color:#ef4444">\u5DF2\u8FC7\u671F</span>':k.active?'<span style="color:#22c55e">\u6709\u6548</span>':'<span style="color:var(--sub)">\u5DF2\u505C\u7528</span>';
          h+='<tr><td>'+esc(k.label)+'</td><td style="font-family:monospace;font-size:12px">'+esc(k.path)+'</td>'+
            '<td>'+fmtTime(k.created)+'</td><td>'+fmtTime(k.expires)+'</td><td>'+k.usedCount+'</td><td>'+status+'</td>'+
            '<td><button class="btn btn-s" onclick="copyUploadUrl(&apos;'+k.id+'&apos;)">\u590D\u5236</button> '+
            '<button class="btn btn-s btn-danger" onclick="deleteUploadKey(&apos;'+k.id+'&apos;)">\u5220\u9664</button></td></tr>';
        }
        tbody.innerHTML=h;
      }catch(e){console.error('loadUploadKeys:',e);tbody.innerHTML='';empty.style.display='block';empty.textContent='\u52A0\u8F7D\u5931\u8D25'}
    }
    function copyPublicUploadUrl(){
      var url=location.origin+'/upload';
      navigator.clipboard.writeText(url).then(function(){alert('\u5DF2\u590D\u5236 '+url)});
    }
    function copyUploadUrl(id){
      var url=location.origin+'/u/'+id;
      navigator.clipboard.writeText(url).then(function(){alert('\u5DF2\u590D\u5236 '+url)});
    }
    function createUploadKey(){
      if(IS_DEMO)return;
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      m.innerHTML='<h2>\u65B0\u5EFA\u4E0A\u4F20\u94FE\u63A5</h2>'+
        '<label>\u6807\u7B7E</label><input type="text" id="uk-label" placeholder="\u4F8B\u5982\uFF1A\u5BA2\u6237\u8D44\u6599">'+
        '<label>\u8DEF\u5F84</label><input type="text" id="uk-path" placeholder="uploads/" value="uploads/">'+
        '<label>\u6709\u6548\u671F</label><select id="uk-expires"><option value="1">1 \u5C0F\u65F6</option><option value="6">6 \u5C0F\u65F6</option><option value="24" selected>24 \u5C0F\u65F6</option><option value="168">7 \u5929</option><option value="720">30 \u5929</option></select>'+
        '<div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">\u53D6\u6D88</button><button class="btn btn-p" id="uk-submit">\u521B\u5EFA</button></div>';
      o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
      m.querySelector('#uk-submit').onclick=async function(){
        var label=document.getElementById('uk-label').value.trim();
        var path=document.getElementById('uk-path').value.trim()||'uploads/';
        var hours=parseInt(document.getElementById('uk-expires').value);
        if(!label){alert('\u8F93\u5165\u6807\u7B7E\u4EE5\u7EE7\u7EED');return}
        var r=await api('/api/upload-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:label,path:path,expiresHours:hours})});
        if(!r||!r.ok){alert('\u521B\u5EFA\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5');return}
        var d=await r.json();
        o.remove();
        var url=location.origin+'/u/'+d.id;
        var o2=document.createElement('div');o2.className='overlay';
        var m2=document.createElement('div');m2.className='modal';
        m2.innerHTML='<h2>\u94FE\u63A5\u5DF2\u521B\u5EFA</h2><label>\u4E0A\u4F20\u94FE\u63A5</label><input type="text" readonly id="uk-url-input" style="font-family:monospace;font-size:13px">'+
          '<p style="font-size:12px;color:var(--sub);margin-top:4px">\u8FC7\u671F\u65F6\u95F4\uFF1A'+fmtTime(d.expires)+'</p>'+
          '<div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">\u5173\u95ED</button><button class="btn btn-p" id="uk-copy">\u590D\u5236</button></div>';
        o2.appendChild(m2);document.body.appendChild(o2);
        document.getElementById('uk-url-input').value=url;
        document.getElementById('uk-url-input').onclick=function(){this.select()};
        document.getElementById('uk-copy').onclick=function(){navigator.clipboard.writeText(url);this.textContent='\u5DF2\u590D\u5236';var b=this;setTimeout(function(){b.textContent='\u590D\u5236'},1200)};
        o2.addEventListener('click',function(e){if(e.target===o2)o2.remove()});
        loadUploadKeys();
      };
    }
    async function deleteUploadKey(id){
      if(IS_DEMO)return;
      if(!confirm('\u5220\u9664\u6B64\u4E0A\u4F20\u94FE\u63A5\uFF1F'))return;
      var r=await api('/api/upload-keys/'+id,{method:'DELETE'});
      if(r&&r.ok)loadUploadKeys();
    }

    // \u2500\u2500 Clear download logs \u2500\u2500
    async function clearDownloadLogs(){
      if(IS_DEMO)return;
      if(!confirm('\u6E05\u7A7A\u6240\u6709\u4E0B\u8F7D\u8BB0\u5F55\uFF1F'))return;
      var r=await api('/api/download/logs',{method:'DELETE'});
      if(r&&r.ok){var d=await r.json();alert('\u5DF2\u6E05\u7A7A '+d.deleted+' \u6761\u8BB0\u5F55');loadDownloads()}
    }

    // \u2500\u2500 Storage config \u2500\u2500
    var PROVIDER_PRESETS={};
    var _editingName='';

    async function loadProviderPresets(){
      var r=await api('/api/storage/providers');
      if(r){try{PROVIDER_PRESETS=await r.json()}catch{}}
    }
    // loadProviderPresets \u5728\u6587\u4EF6\u6D4F\u89C8\u521D\u59CB\u5316\u4E2D\u8C03\u7528\uFF08line ~600\uFF09

    async function loadStorageBackends(){
      var r=await api('/api/storage/backends');
      if(!r)return;var d=await r.json();
      var list=document.getElementById('storage-list');
      var empty=document.getElementById('storage-empty');
      var html='';

      // R2 \u5185\u7F6E\u5B58\u50A8\u5361\u7247\uFF08\u59CB\u7EC8\u663E\u793A\u5728\u6700\u4E0A\u65B9\uFF09
      if(d.r2Available){
        html+='<div class="storage-card" id="r2-card">'+
          '<div class="sc-head">'+
            '<div class="sc-name"><span>R2</span><span class="sc-badge builtin">\u5185\u7F6E\u5B58\u50A8</span></div>'+
            '<div class="sc-actions">'+
              '<button class="btn btn-s" onclick="checkStorageStatus(\\'_r2_\\')">\u68C0\u6D4B\u72B6\u6001</button>'+
            '</div>'+
          '</div>'+
          '<div class="sc-info"><span>\u2601\uFE0F Cloudflare R2 (\u7ED1\u5B9A)</span></div>'+
          '<div id="status-_r2_" style="margin-top:8px"></div>'+
        '</div>';
      }

      if(!d.backends||d.backends.length===0){
        if(!d.r2Available){list.innerHTML='';empty.style.display='';return}
        empty.style.display='none';
        list.innerHTML=html;return;
      }
      empty.style.display='none';

      d.backends.forEach(function(b){
        var badges='';
        if(b.primary)badges+='<span class="sc-badge primary">\u4E3B\u5B58\u50A8</span>';
        if(b.sync)badges+='<span class="sc-badge sync">\u540C\u6B65</span>';
        var providerName=PROVIDER_PRESETS[b.provider]?PROVIDER_PRESETS[b.provider].name:b.provider;
        html+='<div class="storage-card">'+
          '<div class="sc-head">'+
            '<div class="sc-name"><span>'+esc(b.name)+'</span>'+badges+'</div>'+
            '<div class="sc-actions">'+
              '<button class="btn btn-s" onclick="checkStorageStatus(\\''+esc(b.name)+'\\')">\u68C0\u6D4B\u72B6\u6001</button>'+
              '<button class="btn btn-s" onclick="editStorageBackend(\\''+esc(b.name)+'\\')">\u7F16\u8F91</button>'+
              '<button class="btn btn-s" style="color:#ef4444" onclick="deleteStorageBackend(\\''+esc(b.name)+'\\')">\u5220\u9664</button>'+
            '</div>'+
          '</div>'+
          '<div class="sc-info">'+
            '<span>\u{1F4E6} '+esc(providerName)+'</span>'+
            '<span>\u{1FAA3} '+esc(b.bucket)+'</span>'+
            '<span>\u{1F310} '+esc(b.endpoint)+'</span>'+
            '<span>\u{1F4CD} '+esc(b.region)+'</span>'+
            (b.hasCredentials?'<span>\u{1F511} \u5DF2\u914D\u7F6E</span>':'<span style="color:#ef4444">\u{1F511} \u672A\u914D\u7F6E</span>')+
          '</div>'+
          '<div id="status-'+esc(b.name)+'" style="margin-top:8px"></div>'+
        '</div>';
      });
      list.innerHTML=html;
    }

    async function checkStorageStatus(name){
      var el=document.getElementById('status-'+name);
      if(!el)return;
      el.innerHTML='<span class="sc-status"><span class="dot checking"></span> \u68C0\u6D4B\u4E2D...</span>';
      var r=await api('/api/storage/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})});
      if(!r){el.innerHTML='<span class="sc-status"><span class="dot offline"></span> \u8BF7\u6C42\u5931\u8D25</span>';return}
      var d=await r.json();
      if(d.ok){
        var extra=d.fileCount!==undefined?' \xB7 '+d.fileCount+' \u4E2A\u5BF9\u8C61':'';
        el.innerHTML='<span class="sc-status"><span class="dot online"></span> \u5728\u7EBF ('+d.responseTime+'ms'+extra+')</span>';
      }else{
        el.innerHTML='<span class="sc-status"><span class="dot offline"></span> \u79BB\u7EBF: '+(d.error||'\u672A\u77E5\u9519\u8BEF')+'</span>';
      }
    }

    function showAddStorage(){
      _editingName='';
      document.getElementById('storage-modal-title').textContent='\u6DFB\u52A0\u5B58\u50A8\u540E\u7AEF';
      document.getElementById('sm-name').value='';document.getElementById('sm-name').disabled=false;
      document.getElementById('sm-endpoint').value='';
      document.getElementById('sm-bucket').value='';
      document.getElementById('sm-region').value='';
      document.getElementById('sm-accesskey').value='';
      document.getElementById('sm-secretkey').value='';
      document.getElementById('sm-primary').checked=false;
      document.getElementById('sm-sync').checked=true;
      document.getElementById('sm-test-result').className='sm-test-result';
      document.getElementById('sm-cred-hint').style.display='none';
      document.getElementById('sm-save-btn').textContent='\u4FDD\u5B58';document.getElementById('sm-save-btn').disabled=false;
      // \u6298\u53E0\u9AD8\u7EA7\u9009\u9879
      document.getElementById('sm-adv-options').classList.remove('open');
      document.getElementById('sm-adv-arrow').textContent='\u25B6';
      // \u521D\u59CB\u5316 provider \u5360\u4F4D\u7B26\u548C\u81EA\u52A8\u586B\u5145
      onProviderChange();
      document.getElementById('storage-modal').style.display='flex';
    }

    function closeStorageModal(){
      document.getElementById('storage-modal').style.display='none';
    }

    function toggleAdvOptions(){
      var opts=document.getElementById('sm-adv-options');
      var arrow=document.getElementById('sm-adv-arrow');
      if(opts.classList.contains('open')){
        opts.classList.remove('open');
        arrow.textContent='\u25B6';
      }else{
        opts.classList.add('open');
        arrow.textContent='\u25BC';
      }
    }

    function onProviderChange(){
      var p=document.getElementById('sm-provider').value;
      var preset=PROVIDER_PRESETS[p];
      if(!preset)return;
      var epField=document.getElementById('sm-endpoint');
      var rgField=document.getElementById('sm-region');
      if(!_editingName){
        // \u65B0\u589E\u6A21\u5F0F\uFF1A\u81EA\u52A8\u586B\u5145
        if(preset.endpoint)epField.value=preset.endpoint;
        if(preset.regions&&preset.regions.length>0)rgField.value=preset.regions[0];
      }else{
        // \u7F16\u8F91\u6A21\u5F0F\uFF1A\u4EC5\u5F53\u5B57\u6BB5\u4E3A\u7A7A\u65F6\u586B\u5145
        if(!epField.value.trim()&&preset.endpoint)epField.value=preset.endpoint;
        if(!rgField.value.trim()&&preset.regions&&preset.regions.length>0)rgField.value=preset.regions[0];
      }
      // \u66F4\u65B0\u5360\u4F4D\u7B26\u4E3A provider \u9884\u8BBE\u7684\u63D0\u793A
      if(preset.endpointPlaceholder)epField.placeholder=preset.endpointPlaceholder;
    }

    async function editStorageBackend(name){
      var r=await api('/api/storage/backends');
      if(!r)return;var d=await r.json();
      var b=d.backends.find(function(x){return x.name===name});
      if(!b)return;
      _editingName=name;
      document.getElementById('storage-modal-title').textContent='\u7F16\u8F91\u5B58\u50A8\u540E\u7AEF';
      document.getElementById('sm-provider').value=b.provider;
      document.getElementById('sm-name').value=b.name;document.getElementById('sm-name').disabled=true;
      document.getElementById('sm-endpoint').value=b.endpoint;
      document.getElementById('sm-bucket').value=b.bucket;
      document.getElementById('sm-region').value=b.region;
      document.getElementById('sm-accesskey').value='';
      document.getElementById('sm-secretkey').value='';
      document.getElementById('sm-primary').checked=!!b.primary;
      document.getElementById('sm-sync').checked=b.sync!==false;
      document.getElementById('sm-test-result').className='sm-test-result';
      document.getElementById('sm-save-btn').textContent='\u66F4\u65B0';document.getElementById('sm-save-btn').disabled=false;
      // \u6298\u53E0\u9AD8\u7EA7\u9009\u9879
      document.getElementById('sm-adv-options').classList.remove('open');
      document.getElementById('sm-adv-arrow').textContent='\u25B6';
      // \u663E\u793A\u51ED\u8BC1\u72B6\u6001\u63D0\u793A
      var credHint=document.getElementById('sm-cred-hint');
      credHint.style.display='block';
      if(b.hasCredentials){credHint.style.color='#10b981';credHint.textContent='\u{1F511} \u5DF2\u914D\u7F6E\u5BC6\u94A5\uFF08\u7559\u7A7A\u5219\u4FDD\u6301\u4E0D\u53D8\uFF09'}
      else{credHint.style.color='#ef4444';credHint.textContent='\u26A0\uFE0F \u672A\u914D\u7F6E\u5BC6\u94A5\uFF0C\u8BF7\u586B\u5199'}
      // \u66F4\u65B0 provider \u5360\u4F4D\u7B26
      var preset=PROVIDER_PRESETS[b.provider];
      if(preset&&preset.endpointPlaceholder)document.getElementById('sm-endpoint').placeholder=preset.endpointPlaceholder;
      document.getElementById('storage-modal').style.display='flex';
    }

    async function saveStorageBackend(){
      var btn=document.getElementById('sm-save-btn');
      if(btn.disabled)return;
      var name=document.getElementById('sm-name').value.trim();
      var provider=document.getElementById('sm-provider').value;
      var endpoint=document.getElementById('sm-endpoint').value.trim();
      var bucket=document.getElementById('sm-bucket').value.trim();
      var region=document.getElementById('sm-region').value.trim();
      var accessKey=document.getElementById('sm-accesskey').value.trim();
      var secretKey=document.getElementById('sm-secretkey').value.trim();
      var primary=document.getElementById('sm-primary').checked;
      var sync=document.getElementById('sm-sync').checked;

      // \u81EA\u52A8\u4ECE provider \u9884\u8BBE\u8865\u5168 endpoint \u548C region
      var preset=PROVIDER_PRESETS[provider];
      if(!endpoint&&preset&&preset.endpoint)endpoint=preset.endpoint;
      if(!region&&preset&&preset.regions&&preset.regions.length>0)region=preset.regions[0];

      if(!name||!endpoint||!bucket||!region){alert('\u8BF7\u586B\u5199\u6240\u6709\u5FC5\u586B\u5B57\u6BB5');return}
      if(!_editingName&&(!accessKey||!secretKey)){alert('\u8BF7\u586B\u5199 Access Key \u548C Secret Key');return}

      var originalText=btn.textContent;
      btn.textContent='\u4FDD\u5B58\u4E2D...';btn.disabled=true;

      var body={name:name,provider:provider,endpoint:endpoint,bucket:bucket,region:region,primary:primary,sync:sync};
      if(accessKey)body.accessKey=accessKey;
      if(secretKey)body.secretKey=secretKey;

      var r;
      if(_editingName){
        r=await api('/api/storage/backends/'+encodeURIComponent(_editingName),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      }else{
        r=await api('/api/storage/backends',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      }
      btn.textContent=originalText;btn.disabled=false;
      var result=document.getElementById('sm-test-result');
      if(r&&r.ok){closeStorageModal();loadStorageBackends()}
      else if(r){var e=await r.json().catch(function(){return{error:'\u64CD\u4F5C\u5931\u8D25'}});result.className='sm-test-result err show';result.textContent='\u274C '+(e.error||'\u64CD\u4F5C\u5931\u8D25')}
      else{result.className='sm-test-result err show';result.textContent='\u274C \u7F51\u7EDC\u5F02\u5E38\uFF0C\u8BF7\u91CD\u8BD5'}
    }

    async function deleteStorageBackend(name){
      if(!confirm('\u786E\u5B9A\u5220\u9664\u5B58\u50A8\u540E\u7AEF\u300C'+name+'\u300D\uFF1F'))return;
      var r=await api('/api/storage/backends/'+encodeURIComponent(name),{method:'DELETE'});
      if(r&&r.ok)loadStorageBackends();
    }

    async function testStorageConnection(){
      var endpoint=document.getElementById('sm-endpoint').value.trim();
      var bucket=document.getElementById('sm-bucket').value.trim();
      var region=document.getElementById('sm-region').value.trim();
      var accessKey=document.getElementById('sm-accesskey').value.trim();
      var secretKey=document.getElementById('sm-secretkey').value.trim();
      if(!endpoint||!bucket||!region||!accessKey||!secretKey){alert('\u8BF7\u586B\u5199\u6240\u6709\u5B57\u6BB5\u540E\u518D\u6D4B\u8BD5');return}

      var provider=document.getElementById('sm-provider').value;
      var pathStyle=PROVIDER_PRESETS[provider]?PROVIDER_PRESETS[provider].pathStyle:false;

      var btn=document.getElementById('sm-test-btn');
      var result=document.getElementById('sm-test-result');
      btn.textContent='\u23F3 \u6D4B\u8BD5\u4E2D...';btn.disabled=true;
      result.className='sm-test-result testing show';
      result.textContent='\u23F3 \u6B63\u5728\u68C0\u6D4B\u8FDE\u63A5...';

      var r=await api('/api/storage/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:endpoint,bucket:bucket,region:region,accessKey:accessKey,secretKey:secretKey,pathStyle:pathStyle,provider:provider})});
      btn.textContent='\u6D4B\u8BD5\u8FDE\u63A5';btn.disabled=false;
      if(r){var d=await r.json();
        if(d.ok){result.className='sm-test-result ok show';result.textContent='\u2705 '+d.message}
        else{result.className='sm-test-result err show';result.textContent='\u274C '+(d.error||'\u8FDE\u63A5\u5931\u8D25')}
      }else{result.className='sm-test-result err show';result.textContent='\u274C \u7F51\u7EDC\u5F02\u5E38'}
    }

    // \u2500\u2500 Account settings \u2500\u2500
    async function loadAdminInfo(){
      var r=await api('/api/auth/admin-config');
      if(!r)return;var d=await r.json();
      document.getElementById('ac-username').value=d.username||'admin';
      document.getElementById('ac-current-pass').value='';
      document.getElementById('ac-new-pass').value='';
      document.getElementById('ac-confirm-pass').value='';
      document.getElementById('ac-result').className='ac-result';
    }

    async function saveAdminConfig(){
      var btn=document.getElementById('ac-save-btn');
      if(btn.disabled)return;
      var username=document.getElementById('ac-username').value.trim();
      var currentPassword=document.getElementById('ac-current-pass').value;
      var newPassword=document.getElementById('ac-new-pass').value;
      var confirmPassword=document.getElementById('ac-confirm-pass').value;
      var resultEl=document.getElementById('ac-result');

      function showResult(ok,msg){
        resultEl.className='ac-result show '+(ok?'ok':'err');
        resultEl.textContent=(ok?'\u2705 ':'\u274C ')+msg;
        resultEl.style.animation='none';
        resultEl.offsetHeight;
        resultEl.style.animation='shake .4s ease';
      }

      if(!currentPassword){showResult(false,'\u8BF7\u8F93\u5165\u5F53\u524D\u5BC6\u7801');document.getElementById('ac-current-pass').focus();return}
      if(!newPassword){showResult(false,'\u8BF7\u8F93\u5165\u65B0\u5BC6\u7801');document.getElementById('ac-new-pass').focus();return}
      if(newPassword.length<6){showResult(false,'\u65B0\u5BC6\u7801\u957F\u5EA6\u4E0D\u80FD\u5C11\u4E8E 6 \u4F4D');return}
      if(newPassword!==confirmPassword){showResult(false,'\u4E24\u6B21\u8F93\u5165\u7684\u5BC6\u7801\u4E0D\u4E00\u81F4');return}

      var originalText=btn.textContent;btn.textContent='\u4FDD\u5B58\u4E2D...';btn.disabled=true;
      var r=await api('/api/auth/admin-config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username,currentPassword:currentPassword,newPassword:newPassword})});
      btn.textContent=originalText;btn.disabled=false;
      if(r&&r.ok){showResult(true,'\u4FDD\u5B58\u6210\u529F\uFF0C\u4E0B\u6B21\u767B\u5F55\u4F7F\u7528\u65B0\u51ED\u8BC1');document.getElementById('ac-current-pass').value='';document.getElementById('ac-new-pass').value='';document.getElementById('ac-confirm-pass').value=''}
      else if(r){var e=await r.json().catch(function(){return{error:'\u64CD\u4F5C\u5931\u8D25'}});showResult(false,e.error||'\u64CD\u4F5C\u5931\u8D25')}
      else{showResult(false,'\u7F51\u7EDC\u5F02\u5E38')}
    }

    // \u2500\u2500 Moderation \u2500\u2500
    function toggleModProviderFields(){
      var p=document.getElementById('mod-provider').value;
      document.getElementById('mod-apikey-group').style.display=p==='moderatecontent'?'':'none';
      document.getElementById('mod-apipath-group').style.display=p==='nsfwjs'?'':'none';
    }
    var modProviderEl=document.getElementById('mod-provider');
    if(modProviderEl)modProviderEl.addEventListener('change',toggleModProviderFields);

    async function loadModerationConfig(){
      var r=await api('/api/moderation/config');
      if(!r)return;
      if(r.ok){var d=await r.json();
        document.getElementById('mod-enabled').checked=!!d.enabled;
        document.getElementById('mod-provider').value=d.provider||'none';
        document.getElementById('mod-apikey').value=d.apiKey||'';
        document.getElementById('mod-apipath').value=d.apiPath||'';
        toggleModProviderFields();
      }
    }

    async function saveModeration(){
      var cfg={
        enabled:document.getElementById('mod-enabled').checked,
        provider:document.getElementById('mod-provider').value,
        apiKey:document.getElementById('mod-apikey').value||undefined,
        apiPath:document.getElementById('mod-apipath').value||undefined,
        thresholds:{adult:0.9,racy:0.7},
        fileTypes:['image/jpeg','image/png','image/webp','image/gif'],
        maxSize:20*1024*1024,
      };
      var r=await api('/api/moderation/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)});
      if(r&&r.ok){showModResult(true,'\u4FDD\u5B58\u6210\u529F')}
      else if(r){var e=await r.json().catch(function(){return{}});showModResult(false,e.error||'\u4FDD\u5B58\u5931\u8D25')}
      else{showModResult(false,'\u7F51\u7EDC\u5F02\u5E38')}
    }

    async function testModeration(){
      var url=prompt('\u8F93\u5165\u8981\u6D4B\u8BD5\u7684\u56FE\u7247 URL\uFF1A','https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/200px-PNG_transparency_demonstration_1.png');
      if(!url)return;
      showModResult('testing','\u6B63\u5728\u6D4B\u8BD5...');
      var r=await api('/api/moderation/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})});
      if(r&&r.ok){var d=await r.json();showModResult(true,'\u7ED3\u679C\uFF1A'+d.label+' (adult='+d.scores.adult.toFixed(2)+')')}
      else if(r){var e=await r.json().catch(function(){return{}});showModResult(false,e.error||'\u6D4B\u8BD5\u5931\u8D25')}
      else{showModResult(false,'\u7F51\u7EDC\u5F02\u5E38')}
    }

    function showModResult(ok,msg){
      var el=document.getElementById('mod-test-result');
      el.className='sm-test-result show '+(ok==='testing'?'testing':(ok?'ok':'err'));
      el.textContent=msg;
    }

    async function loadModerationLogs(){
      var r=await api('/api/moderation/logs');
      if(!r)return;
      if(r.ok){var d=await r.json();renderModLogs(d.entries||[])}
    }

    function renderModLogs(entries){
      var list=document.getElementById('mod-list');
      var empty=document.getElementById('mod-empty');
      var count=document.getElementById('mod-count');
      count.textContent='('+entries.length+')';
      if(entries.length===0){list.innerHTML='';empty.style.display='';return}
      empty.style.display='none';
      list.innerHTML=entries.map(function(e){
        var time=new Date(e.time).toLocaleString('zh-CN');
        var action=e.action==='deleted'?'deleted':(e.label==='racy'?'racy':'kept');
        var actionText=e.action==='deleted'?'\u5DF2\u5220\u9664':(e.label==='racy'?'\u4FDD\u7559(racy)':'\u4FDD\u7559(safe)');
        return '<div class="log-item">'+
          '<div class="log-main"><div class="log-name">'+escapeHtml(e.name||e.key)+'</div>'+
          '<div class="log-meta">'+time+' \xB7 '+escapeHtml(e.ip||'-')+' \xB7 '+(e.provider||'')+' \xB7 adult='+(e.scores?.adult||0).toFixed(2)+' racy='+(e.scores?.racy||0).toFixed(2)+'</div></div>'+
          '<div class="log-actions"><span class="mod-badge '+action+'">'+actionText+'</span></div>'+
        '</div>';
      }).join('');
    }

    async function clearModerationLogs(){
      if(!confirm('\u786E\u8BA4\u6E05\u7A7A\u6240\u6709\u5BA1\u6838\u65E5\u5FD7\uFF1F'))return;
      var r=await api('/api/moderation/logs',{method:'DELETE'});
      if(r&&r.ok)loadModerationLogs();
    }

    loadFiles();
  <\/script>
</body>
</html>`;
}
__name(renderDashboard, "renderDashboard");

// src/html/login.ts
function renderLogin(siteKey) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - \u767B\u5F55</title>
  <meta name="description" content="ioDrive \u9AD8\u901F\u4E91\u76D8">
  <meta name="robots" content="index, follow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>\u2601\uFE0F</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer><\/script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--input-bg:#fafafa;--accent:#111;--accent-hover:#333;--err-bg:#fef2f2;--err-border:#fecaca;--err-text:#dc2626}
    @media(prefers-color-scheme:dark){:root{--bg:#0a0a0a;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--input-bg:#27272a;--accent:#fafafa;--accent-hover:#d4d4d8;--err-bg:#2a1215;--err-border:#5c1a1a;--err-text:#f87171}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background .4s;padding:16px}
    .card{width:380px;max-width:100%;background:var(--card);border-radius:20px;padding:48px 36px;box-shadow:0 2px 24px rgba(0,0,0,0.06);animation:pop .5s cubic-bezier(.34,1.56,.64,1);transition:background .4s,box-shadow .4s}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:36px}
    .logo-row svg{width:32px;height:32px;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
    .logo-row:hover svg{transform:rotate(-8deg) scale(1.1)}
    .logo-row span{font-size:20px;font-weight:700;color:var(--text);letter-spacing:-0.3px}
    .card h1{font-size:22px;font-weight:700;color:var(--text);margin-bottom:4px}
    .card .sub{font-size:14px;color:var(--sub);margin-bottom:28px}
    .field{margin-bottom:18px}
    .field label{display:block;font-size:12px;font-weight:600;color:var(--sub);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
    .field input{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;color:var(--text);background:var(--input-bg);outline:none;transition:border .25s,background .25s,box-shadow .25s,transform .15s}
    .field input:focus{border-color:var(--accent);background:var(--card);box-shadow:0 0 0 3px rgba(100,100,100,0.1);transform:scale(1.01)}
    .field input::placeholder{color:var(--sub)}
    .cf-wrap{margin:20px 0;min-height:65px;display:flex;justify-content:center}
    .submit{width:100%;padding:13px;border:none;border-radius:10px;background:var(--accent);color:var(--bg);font-size:15px;font-weight:600;cursor:pointer;transition:opacity .2s,transform .15s,box-shadow .2s;margin-top:4px}
    .submit:hover:not(:disabled){opacity:0.85;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
    .submit:active:not(:disabled){transform:scale(0.98)}
    .submit:disabled{opacity:0.35;cursor:not-allowed}
    .err{background:var(--err-bg);color:var(--err-text);padding:10px 14px;border-radius:8px;font-size:13px;margin-top:14px;display:none;border:1px solid var(--err-border);animation:shake .4s cubic-bezier(.36,.07,.19,.97)}
    @keyframes shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-3px)}40%,60%{transform:translateX(3px)}}

    /* \u2500\u2500 Tablet (\u2264600px) \u2500\u2500 */
    @media(max-width:600px){.card{border-radius:16px;padding:40px 28px}}

    /* \u2500\u2500 Phone (\u2264440px) \u2500\u2500 */
    @media(max-width:440px){body{padding:12px;align-items:flex-start;padding-top:10vh}.card{border-radius:14px;padding:28px 20px}.logo-row{margin-bottom:28px}.card h1{font-size:20px}.field input{padding:10px 12px;font-size:14px}.submit{padding:12px;font-size:14px}.cf-wrap{transform:scale(0.85);margin:16px -10px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>ioDrive</span>
    </div>
    <h1>\u767B\u5F55</h1>
    <p class="sub">\u8F93\u5165\u8D26\u53F7\u548C\u5BC6\u7801\u4EE5\u7EE7\u7EED</p>
    <div class="field"><label>\u7528\u6237\u540D</label><input type="text" id="username" placeholder="admin" autocomplete="username"></div>
    <div class="field"><label>\u5BC6\u7801</label><input type="password" id="password" placeholder="\u5BC6\u7801" autocomplete="current-password"></div>
    <div class="cf-wrap"><div class="cf-turnstile" data-sitekey="${siteKey.replace(/"/g, "&quot;")}" data-callback="onTS"></div></div>
    <button class="submit" id="login-btn" disabled>\u767B\u5F55</button>
    <div class="err" id="login-error"></div>
  </div>
  <script>
    let tsToken='';
    function onTS(t){tsToken=t;document.getElementById('login-btn').disabled=false}
    async function doLogin(){
      const u=document.getElementById('username').value,p=document.getElementById('password').value,e=document.getElementById('login-error'),b=document.getElementById('login-btn');
      if(!u||!p){e.textContent='\u8BF7\u8F93\u5165\u7528\u6237\u540D\u548C\u5BC6\u7801';e.style.display='block';return}
      if(!tsToken){e.textContent='\u8BF7\u5148\u5B8C\u6210\u9A8C\u8BC1';e.style.display='block';return}
      b.disabled=true;b.textContent='\u767B\u5F55\u4E2D\u2026';e.style.display='none';
      try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,turnstile:tsToken})});const d=await r.json();
      if(d.token){localStorage.setItem('iodrive_token',d.token);location.href='/dashboard'}else{e.textContent=d.error||'\u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5';e.style.display='block';b.disabled=false;b.textContent='\u767B\u5F55'}}
      catch(x){e.textContent='\u7F51\u7EDC\u5F02\u5E38\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5';e.style.display='block';b.disabled=false;b.textContent='\u767B\u5F55'}
    }
    document.getElementById('login-btn').onclick=doLogin;
    document.getElementById('password').onkeydown=function(e){if(e.key==='Enter')doLogin()};
    document.getElementById('username').onkeydown=function(e){if(e.key==='Enter')document.getElementById('password').focus()};
  <\/script>
</body>
</html>`;
}
__name(renderLogin, "renderLogin");

// src/html/share.ts
function renderSharePage(token, siteKey) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - \u4E0B\u8F7D</title>
  <meta name="description" content="ioDrive \u6587\u4EF6\u4E0B\u8F7D">
  <meta name="robots" content="index, follow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>\u2601\uFE0F</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer><\/script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--code-bg:#18181b;--code-text:#e4e4e7;--code-sub:#a1a1aa;--glow:rgba(0,0,0,0.08)}
    @media(prefers-color-scheme:dark){:root{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--code-bg:#09090b;--code-text:#d4d4d8;--code-sub:#71717a;--glow:rgba(255,255,255,0.06)}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background .4s;padding:16px}

    .card{width:440px;max-width:100%;background:var(--card);border-radius:22px;padding:48px 36px 36px;box-shadow:0 2px 24px rgba(0,0,0,0.06);text-align:center;animation:pop .5s cubic-bezier(.34,1.56,.64,1);transition:background .4s}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}

    /* File info */
    .file-info{margin-bottom:32px;animation:slideUp .5s cubic-bezier(.34,1.56,.64,1) .1s both}
    @keyframes slideUp{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
    .file-icon{font-size:56px;margin-bottom:14px;display:inline-block;animation:bounce .6s cubic-bezier(.34,1.56,.64,1) .15s both}
    @keyframes bounce{0%{opacity:0;transform:scale(0) rotate(-12deg)}60%{transform:scale(1.1) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    .file-name{font-size:19px;font-weight:700;color:var(--text);margin-bottom:4px;word-break:break-all;line-height:1.3}
    .file-size{font-size:14px;color:var(--sub)}

    /* Turnstile */
    .ts-section{margin:24px 0;animation:slideUp .5s cubic-bezier(.34,1.56,.64,1) .2s both}
    .ts-hint{font-size:13px;color:var(--sub);margin-bottom:14px}
    .ts-box{display:flex;justify-content:center;min-height:65px}

    /* Download button */
    .dl-section{display:none;margin:24px 0}
    .dl-section.show{display:block;animation:pop .5s cubic-bezier(.34,1.56,.64,1)}
    .dl-btn{display:inline-flex;align-items:center;gap:10px;padding:16px 44px;border:none;border-radius:14px;background:var(--accent);color:var(--accent-fg);font-size:17px;font-weight:700;cursor:pointer;transition:all .25s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden;letter-spacing:0.3px;max-width:100%}
    .dl-btn::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,var(--glow),transparent 70%);animation:pulse 2s ease-in-out infinite;pointer-events:none}
    @keyframes pulse{0%,100%{opacity:0;transform:scale(0.8)}50%{opacity:1;transform:scale(1.4)}}
    .dl-btn:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 8px 28px rgba(0,0,0,0.18)}
    .dl-btn:active{transform:scale(0.97)}
    .dl-btn.going{opacity:0.7;pointer-events:none}
    .dl-btn-s3{margin-top:8px;padding:12px 36px;font-size:15px;background:var(--sub);color:var(--bg);display:inline-flex;align-items:center;gap:8px;border:none;border-radius:12px;font-weight:700;cursor:pointer;transition:all .25s cubic-bezier(.34,1.56,.64,1);max-width:100%}
    .dl-btn-s3.hidden{display:none}
    .dl-btn-s3.going{opacity:0.7;pointer-events:none}

    /* More options toggle */
    .more-toggle{margin-top:20px;font-size:13px;color:var(--sub);cursor:pointer;transition:color .2s;user-select:none;display:inline-flex;align-items:center;gap:4px}
    .more-toggle:hover{color:var(--text)}
    .more-toggle .arrow{transition:transform .3s;display:inline-block}
    .more-toggle.open .arrow{transform:rotate(180deg)}

    /* curl section */
    .curl-wrap{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.34,1.56,.64,1),opacity .3s;opacity:0}
    .curl-wrap.open{max-height:400px;opacity:1}
    .curl-inner{padding-top:16px;text-align:left}
    .curl-title{font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px}
    .curl-box{background:var(--code-bg);color:var(--code-text);padding:12px 36px 12px 14px;border-radius:10px;font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:12px;margin-bottom:6px;position:relative;word-break:break-all;line-height:1.7;transition:background .3s;overflow-x:auto}
    .curl-box code{white-space:pre-wrap;word-break:break-all}
    .curl-box .lbl{color:var(--code-sub);font-size:11px;margin-bottom:2px;display:block}
    .cp{position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:var(--code-sub);padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;transition:all .2s cubic-bezier(.34,1.56,.64,1);flex-shrink:0}
    .cp:hover{background:rgba(255,255,255,0.12);color:var(--code-text);transform:scale(1.05)}
    .cp:active{transform:scale(0.95)}

    /* Error */
    .error-icon{font-size:48px;margin-bottom:12px}
    .error-text{font-size:15px;color:var(--sub)}

    .foot{margin-top:28px;font-size:11px;color:var(--sub)}

    /* \u2500\u2500 Tablet (\u2264600px) \u2500\u2500 */
    @media(max-width:600px){.card{border-radius:16px;padding:40px 28px 32px}.dl-btn{padding:14px 32px;font-size:16px}.curl-box{font-size:11px;padding:10px 32px 10px 12px}}

    /* \u2500\u2500 Phone (\u2264500px) \u2500\u2500 */
    @media(max-width:500px){.card{border-radius:14px;padding:32px 16px 24px}.file-icon{font-size:44px}.file-name{font-size:17px}.dl-btn{padding:14px 24px;font-size:15px;width:100%;justify-content:center}.dl-btn-s3{width:100%;justify-content:center;padding:12px 20px;font-size:14px}.curl-box{font-size:10px;padding:8px 28px 8px 10px;border-radius:8px}.cp{padding:2px 8px;font-size:10px;top:6px;right:6px}.ts-section{transform:scale(0.9)}.more-toggle{font-size:12px}}
  </style>
</head>
<body>
  <div class="card" id="card">
    <!-- Loading -->
    <div id="loading">
      <div class="file-icon" style="animation:none;opacity:0.3">\u{1F4C4}</div>
      <div class="file-name" style="color:var(--sub)">\u52A0\u8F7D\u4E2D...</div>
    </div>

    <!-- File info (shown after load) -->
    <div id="file-info" class="file-info" style="display:none">
      <div class="file-icon" id="fi">\u{1F4C4}</div>
      <div class="file-name" id="fn"></div>
      <div class="file-size" id="fs"></div>
    </div>

    <!-- Turnstile -->
    <div id="ts-section" class="ts-section">
      <div class="ts-hint">\u5B8C\u6210\u9A8C\u8BC1\u540E\u5373\u53EF\u4E0B\u8F7D</div>
      <div class="ts-box">
        <div class="cf-turnstile" data-sitekey="${siteKey.replace(/"/g, "&quot;")}" data-callback="onVerified"></div>
      </div>
    </div>

    <!-- Download (hidden until verified) -->
    <div id="dl-section" class="dl-section">
      <button class="dl-btn" id="dl-btn" onclick="doDownload()">\u2B07\uFE0F \u4E0B\u8F7D</button>
      <button class="dl-btn-s3 hidden" id="dl-btn-s3" onclick="doDownloadS3()">\u{1F4E6} S3 \u4E0B\u8F7D</button>
      <div class="more-toggle" id="more-toggle" onclick="toggleMore()"><span class="arrow">\u25BC</span> \u66F4\u591A\u65B9\u5F0F</div>
      <div class="curl-wrap" id="curl-wrap">
        <div class="curl-inner">
          <div class="curl-title">curl \u547D\u4EE4 (R2)</div>
          <div class="curl-box"><button class="cp" onclick="cpCmd(this)">\u590D\u5236</button><span class="lbl">\u65AD\u70B9\u7EED\u4F20</span><code id="c1"></code></div>
          <div class="curl-box"><button class="cp" onclick="cpCmd(this)">\u590D\u5236</button><span class="lbl">8 \u7EBF\u7A0B\u5E76\u884C (aria2)</span><code id="c2"></code></div>
          <div id="curl-s3" style="display:none">
            <div class="curl-title" style="margin-top:12px">curl \u547D\u4EE4 (S3)</div>
            <div class="curl-box"><button class="cp" onclick="cpCmd(this)">\u590D\u5236</button><span class="lbl">\u65AD\u70B9\u7EED\u4F20</span><code id="c3"></code></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div id="error-view" style="display:none">
      <div class="error-icon">\u274C</div>
      <div class="error-text" id="error-text"></div>
    </div>

    <div class="foot">ioDrive \xB7 Cloudflare R2</div>
  </div>

  <script>
    function _js(s){return s.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'").replace(/</g,'\\x3c')}
    var SHARE_TOKEN=_js('${token}');
    var r2Url='',s3Url='',dlName='',logKey='';

    // Load share info (NO URL exposed)
    async function load(){
      try{
        var r=await fetch('/api/share/info/'+SHARE_TOKEN);
        if(!r.ok){showError('\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F');return}
        var d=await r.json();
        dlName=d.name;
        document.getElementById('fn').textContent=d.name;
        document.getElementById('fs').textContent=fmt(d.size);
        var ext=d.name.split('.').pop().toLowerCase();
        var ic={pdf:'\u{1F4C4}',jpg:'\u{1F5BC}',jpeg:'\u{1F5BC}',png:'\u{1F5BC}',gif:'\u{1F5BC}',webp:'\u{1F5BC}',mp4:'\u{1F3AC}',mkv:'\u{1F3AC}',mp3:'\u{1F3B5}',wav:'\u{1F3B5}',zip:'\u{1F4E6}',rar:'\u{1F4E6}','7z':'\u{1F4E6}',exe:'\u2699\uFE0F'};
        document.getElementById('fi').textContent=ic[ext]||'\u{1F4C4}';
        document.getElementById('loading').style.display='none';
        document.getElementById('file-info').style.display='block';
      }catch(e){showError('\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5')}
    }

    function showError(msg){
      document.getElementById('loading').style.display='none';
      document.getElementById('file-info').style.display='none';
      document.getElementById('ts-section').style.display='none';
      document.getElementById('error-text').textContent=msg;
      document.getElementById('error-view').style.display='block';
    }

    function fmt(b){if(!b)return'0 B';var u=['B','KB','MB','GB','TB'],i=0,s=b;while(s>=1024&&i<u.length-1){s/=1024;i++}return s.toFixed(i?1:0)+' '+u[i]}

    function fireBeacon(){
      if(logKey){
        try{navigator.sendBeacon('/api/download/beacon',JSON.stringify({logKey:logKey,event:'complete'}))}catch(e){}
      }
    }

    // Turnstile callback \u2014 verify server-side, get presigned URLs
    async function onVerified(tsResponse){
      document.getElementById('ts-section').style.display='none';
      try{
        var r=await fetch('/api/download/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({shareToken:SHARE_TOKEN,turnstile:tsResponse})});
        if(!r.ok){var d=await r.json();showError(d.error||'\u9A8C\u8BC1\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5');return}
        var d=await r.json();
        r2Url=d.r2Url;s3Url=d.s3Url;logKey=d.logKey||'';
        document.getElementById('c1').textContent='curl -C - -o "'+dlName+'" "'+r2Url+'"';
        document.getElementById('c2').textContent='aria2c -x 8 -s 8 -o "'+dlName+'" "'+r2Url+'"';
        if(s3Url){
          document.getElementById('dl-btn-s3').classList.remove('hidden');
          document.getElementById('c3').textContent='curl -C - -o "'+dlName+'" "'+s3Url+'"';
          document.getElementById('curl-s3').style.display='block';
        }
        document.getElementById('dl-section').classList.add('show');
      }catch(e){showError('\u7F51\u7EDC\u5F02\u5E38\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5')}
    }

    function doDownload(){
      if(!r2Url)return;
      var btn=document.getElementById('dl-btn');
      btn.classList.add('going');btn.innerHTML='\u23F3 \u6B63\u5728\u6253\u5F00\u2026';
      var a=document.createElement('a');a.href=r2Url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
      fireBeacon();
      setTimeout(function(){btn.classList.remove('going');btn.innerHTML='\u2B07\uFE0F \u4E0B\u8F7D'},2000);
    }

    function doDownloadS3(){
      if(!s3Url)return;
      var btn=document.getElementById('dl-btn-s3');
      btn.classList.add('going');btn.innerHTML='\u23F3 \u6B63\u5728\u6253\u5F00\u2026';
      var a=document.createElement('a');a.href=s3Url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
      fireBeacon();
      setTimeout(function(){btn.classList.remove('going');btn.innerHTML='\u{1F4E6} S3 \u4E0B\u8F7D'},2000);
    }

    function toggleMore(){
      var t=document.getElementById('more-toggle'),w=document.getElementById('curl-wrap');
      t.classList.toggle('open');w.classList.toggle('open');
    }

    function cpCmd(btn){
      var code=btn.parentElement.querySelector('code');
      navigator.clipboard.writeText(code.textContent).then(function(){
        btn.textContent='\u2713';btn.style.transform='scale(1.15)';
        setTimeout(function(){btn.textContent='\u590D\u5236';btn.style.transform=''},1200);
      });
    }

    load();
  <\/script>
</body>
</html>`;
}
__name(renderSharePage, "renderSharePage");

// src/html/upload-key.ts
function renderUploadKeyPage(keyId, siteKey) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - \u4E0A\u4F20\u6587\u4EF6</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>\u2601\uFE0F</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer><\/script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--glow:rgba(0,0,0,0.08)}
    @media(prefers-color-scheme:dark){:root{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--glow:rgba(255,255,255,0.06)}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background .4s;padding:16px}
    .card{width:480px;max-width:100%;background:var(--card);border-radius:22px;padding:48px 36px 36px;box-shadow:0 2px 24px rgba(0,0,0,0.06);text-align:center;animation:pop .5s cubic-bezier(.34,1.56,.64,1);transition:background .4s}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .file-icon{font-size:56px;margin-bottom:14px}
    .title{font-size:19px;font-weight:700;color:var(--text);margin-bottom:4px}
    .sub{font-size:14px;color:var(--sub);margin-bottom:24px}
    .ts-section{margin:20px 0}.ts-hint{font-size:13px;color:var(--sub);margin-bottom:14px}
    .ts-box{display:flex;justify-content:center;min-height:65px}
    .drop-zone{border:2px dashed var(--border);border-radius:14px;padding:40px 20px;margin:20px 0;cursor:pointer;transition:all .25s;color:var(--sub);font-size:14px}
    .drop-zone:hover,.drop-zone.dragover{border-color:var(--accent);background:var(--glow)}
    .drop-zone .icon{font-size:36px;margin-bottom:8px}
    .file-list{text-align:left;margin:16px 0;max-height:200px;overflow-y:auto}
    .file-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;font-size:13px}
    .file-item .name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
    .file-item .size{color:var(--sub);font-size:12px}
    .file-item .remove{background:none;border:none;cursor:pointer;color:var(--sub);font-size:16px;padding:2px 6px;border-radius:4px}
    .file-item .remove:hover{color:#ef4444;background:rgba(239,68,68,0.1)}
    .upload-btn{width:100%;padding:14px;border:none;border-radius:12px;background:var(--accent);color:var(--accent-fg);font-size:16px;font-weight:700;cursor:pointer;transition:all .25s;margin-top:12px}
    .upload-btn:hover:not(:disabled){opacity:0.85;transform:translateY(-1px)}
    .upload-btn:disabled{opacity:0.35;cursor:not-allowed}
    .upload-btn.going{opacity:0.7;pointer-events:none}
    .progress-wrap{margin:16px 0;text-align:left}
    .progress-item{margin-bottom:12px}
    .progress-item .pi-name{font-size:13px;font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .progress-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .progress-bar .fill{height:100%;background:var(--accent);border-radius:2px;transition:width .2s}
    .progress-item .pi-status{font-size:11px;color:var(--sub);margin-top:4px}
    .done{text-align:center;padding:20px 0}
    .done .icon{font-size:48px;margin-bottom:12px}
    .done .msg{font-size:15px;color:var(--text);font-weight:600}
    .done .sub2{font-size:13px;color:var(--sub);margin-top:4px}
    .error-icon{font-size:48px;margin-bottom:12px}
    .error-text{font-size:15px;color:var(--sub)}
    .foot{margin-top:28px;font-size:11px;color:var(--sub)}
    @media(max-width:500px){.card{border-radius:14px;padding:32px 16px 24px}.title{font-size:17px}.drop-zone{padding:30px 16px}}
  </style>
</head>
<body>
  <div class="card" id="card">
    <div id="loading"><div class="file-icon" style="opacity:0.3">\u{1F4C4}</div><div class="title" style="color:var(--sub)">\u6B63\u5728\u9A8C\u8BC1\u2026</div></div>
    <div id="upload-view" style="display:none">
      <div class="file-icon">\u{1F4E4}</div>
      <div class="title" id="key-label"></div>
      <div class="sub">\u9009\u62E9\u8981\u4E0A\u4F20\u7684\u6587\u4EF6</div>
      <div class="ts-section"><div class="ts-hint">\u5B8C\u6210\u9A8C\u8BC1\u540E\u5F00\u59CB\u4E0A\u4F20</div><div class="ts-box"><div class="cf-turnstile" data-sitekey="${siteKey.replace(/"/g, "&quot;")}" data-callback="onTS"></div></div></div>
      <div id="file-area" style="display:none">
        <div class="drop-zone" id="drop-zone"><div class="icon">\u{1F4C1}</div>\u70B9\u51FB\u9009\u62E9\u6216\u62D6\u62FD\u6587\u4EF6\u5230\u6B64\u5904</div>
        <div class="file-list" id="file-list"></div>
        <button class="upload-btn" id="upload-btn" disabled onclick="startUpload()">\u4E0A\u4F20</button>
      </div>
      <div class="progress-wrap" id="progress-wrap" style="display:none"></div>
      <div class="done" id="done-view" style="display:none"><div class="icon">\u2705</div><div class="msg">\u4E0A\u4F20\u5B8C\u6210</div><div class="sub2" id="done-count"></div></div>
    </div>
    <div id="error-view" style="display:none"><div class="error-icon">\u274C</div><div class="error-text" id="error-text"></div></div>
    <div class="foot">ioDrive</div>
  </div>
  <input type="file" id="file-input" multiple style="display:none">
  <script>
    function _js(s){return s.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'").replace(/</g,'\\x3c')}
    var KEY_ID=_js('${keyId}');
    var tsToken='',uploadPath='uploads/',selectedFiles=[];
    var PS=20*1024*1024,MC=6;

    function onTS(t){tsToken=t;document.getElementById('upload-btn').disabled=selectedFiles.length===0?true:false;document.getElementById('file-area').style.display=''}
    function fmt(b){if(!b)return'0 B';var u=['B','KB','MB','GB','TB'],i=0,s=b;while(s>=1024&&i<u.length-1){s/=1024;i++}return s.toFixed(i?1:0)+' '+u[i]}
    function fmtS(b){return fmt(b)+'/s'}
    function fmtE(s){if(!s||!isFinite(s))return'';if(s<60)return Math.ceil(s)+'s';if(s<3600)return Math.ceil(s/60)+'m';return(s/3600).toFixed(1)+'h'}

    async function init(){
      try{
        var r=await fetch('/api/upload-keys/validate/'+KEY_ID);
        if(!r.ok){showError('\u94FE\u63A5\u4E0D\u5B58\u5728');return}
        var d=await r.json();
        if(!d.valid){showError(d.error||'\u94FE\u63A5\u65E0\u6548');return}
        uploadPath=d.path||'uploads/';
        document.getElementById('key-label').textContent=d.label||'\u4E0A\u4F20\u6587\u4EF6';
        document.getElementById('loading').style.display='none';
        document.getElementById('upload-view').style.display='block';
      }catch(e){showError('\u9A8C\u8BC1\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5')}
    }
    function showError(msg){
      document.getElementById('loading').style.display='none';
      document.getElementById('upload-view').style.display='none';
      document.getElementById('error-text').textContent=msg;
      document.getElementById('error-view').style.display='block';
    }

    // File selection
    var fileInput=document.getElementById('file-input');
    var dropZone=document.getElementById('drop-zone');
    dropZone.onclick=function(){fileInput.click()};
    fileInput.onchange=function(){addFiles(fileInput.files)};
    dropZone.ondragover=function(e){e.preventDefault();dropZone.classList.add('dragover')};
    dropZone.ondragleave=function(){dropZone.classList.remove('dragover')};
    dropZone.ondrop=function(e){e.preventDefault();dropZone.classList.remove('dragover');addFiles(e.dataTransfer.files)};
    function addFiles(fl){
      for(var i=0;i<fl.length;i++)selectedFiles.push(fl[i]);
      renderFiles();
      if(tsToken)document.getElementById('upload-btn').disabled=selectedFiles.length===0;
    }
    function removeFile(i){selectedFiles.splice(i,1);renderFiles();if(tsToken)document.getElementById('upload-btn').disabled=selectedFiles.length===0}
    function renderFiles(){
      var el=document.getElementById('file-list');
      if(!selectedFiles.length){el.innerHTML='';document.getElementById('file-area').style.display='';return}
      document.getElementById('file-area').style.display='';
      var h='';
      for(var i=0;i<selectedFiles.length;i++){
        var f=selectedFiles[i];
        h+='<div class="file-item"><span class="name">'+esc(f.name)+'</span><span class="size">'+fmt(f.size)+'</span><button class="remove" onclick="removeFile('+i+')">\u2715</button></div>';
      }
      el.innerHTML=h;
    }
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    async function startUpload(){
      if(!tsToken||!selectedFiles.length)return;
      document.getElementById('upload-btn').classList.add('going');
      document.getElementById('upload-btn').textContent='\u4E0A\u4F20\u4E2D\u2026';
      document.getElementById('progress-wrap').style.display='';
      var pw=document.getElementById('progress-wrap');
      pw.innerHTML='';
      for(var i=0;i<selectedFiles.length;i++){
        pw.innerHTML+='<div class="progress-item" id="pi'+i+'"><div class="pi-name">'+esc(selectedFiles[i].name)+' ('+fmt(selectedFiles[i].size)+')</div><div class="progress-bar"><div class="fill" style="width:0%"></div></div><div class="pi-status">\u51C6\u5907...</div></div>';
      }
      var ok=0,fail=0;
      for(var i=0;i<selectedFiles.length;i++){
        try{
          if(selectedFiles[i].size<=PS)await upSingle(selectedFiles[i],i);
          else await upMulti(selectedFiles[i],i);
          piStatus(i,'\u2705 \u5B8C\u6210');ok++;
        }catch(e){piStatus(i,'\u274C '+e.message);fail++}
      }
      document.getElementById('progress-wrap').style.display='none';
      document.getElementById('done-view').style.display='';
      document.getElementById('done-count').textContent='\u6210\u529F '+ok+' \u4E2A'+(fail?'\uFF0C\u5931\u8D25 '+fail+' \u4E2A':'');
    }
    function piProg(i,p){var f=document.querySelector('#pi'+i+' .fill');if(f)f.style.width=p+'%'}
    function piStatus(i,t){var e=document.querySelector('#pi'+i+' .pi-status');if(e)e.textContent=t}

    function xhrUp(url,fd,idx){
      return new Promise(function(ok,no){
        var x=new XMLHttpRequest(),t0=Date.now();
        x.open('POST',url);
        x.upload.onprogress=function(e){
          if(e.lengthComputable){
            var el=(Date.now()-t0)/1000,sp=el>0?e.loaded/el:0,pct=Math.round(e.loaded/e.total*100),rm=sp>0?(e.total-e.loaded)/sp:0;
            piProg(idx,pct);piStatus(idx,fmtS(sp)+' \xB7 '+pct+'% \xB7 \u5269\u4F59 '+fmtE(rm));
          }
        };
        x.onload=function(){
          if(x.status>=200&&x.status<300){try{ok(JSON.parse(x.responseText))}catch{ok(x.responseText)}}
          else{try{no(new Error(JSON.parse(x.responseText).error))}catch{no(new Error('\u4E0A\u4F20\u5931\u8D25 '+x.status))}}
        };
        x.onerror=function(){no(new Error('\u7F51\u7EDC\u5F02\u5E38'))};
        x.send(fd);
      });
    }

    async function upSingle(f,idx){
      var fd=new FormData();fd.append('file',f);fd.append('path',uploadPath);fd.append('turnstile',tsToken);fd.append('uploadKeyId',KEY_ID);
      await xhrUp('/api/upload-public/single',fd,idx);
    }

    async function upMulti(f,idx){
      var r=await fetch('/api/upload-public/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,size:f.size,path:uploadPath,turnstile:tsToken,uploadKeyId:KEY_ID})});
      if(!r.ok)throw new Error('\u65E0\u6CD5\u5F00\u59CB\u4E0A\u4F20');
      var d=await r.json(),uid=d.uploadId,key=d.key;
      var tp=Math.ceil(f.size/PS),parts=[],pp=new Array(tp).fill(0),t0=Date.now(),q=[];
      for(var i=0;i<tp;i++){
        (function(pi,pn){
          var s=pi*PS,e=Math.min(s+PS,f.size),ch=f.slice(s,e);
          q.push(function(){
            return new Promise(function(ok,no){
              var fd=new FormData();fd.append('uploadId',uid);fd.append('key',key);fd.append('partNumber',String(pn));fd.append('chunk',ch);
              var x=new XMLHttpRequest();x.open('POST','/api/upload-public/part');
              x.upload.onprogress=function(ev){
                if(ev.lengthComputable){
                  pp[pi]=ev.loaded;var td=0;for(var j=0;j<pp.length;j++)td+=pp[j];
                  var el=(Date.now()-t0)/1000,sp=el>0?td/el:0,pct=Math.round(td/f.size*100),rm=sp>0?(f.size-td)/sp:0;
                  piProg(idx,pct);piStatus(idx,fmtS(sp)+' \xB7 '+pct+'% (\u5206\u7247 '+pn+'/'+tp+') \xB7 '+fmtE(rm));
                }
              };
              x.onload=function(){if(x.status>=200&&x.status<300){parts.push({partNumber:pn,etag:JSON.parse(x.responseText).etag});ok()}else{no(new Error('\u5206\u7247 '+pn+' \u4E0A\u4F20\u5931\u8D25'))}};
              x.onerror=function(){no(new Error('\u7F51\u7EDC\u5F02\u5E38'))};
              x.send(fd);
            });
          });
        })(i,i+1);
      }
      try{await conc(q,MC)}catch(e){fetch('/api/upload-public/abort',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key})}).catch(function(){});throw e}
      parts.sort(function(a,b){return a.partNumber-b.partNumber});
      var cr=await fetch('/api/upload-public/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key,parts:parts})});
      if(!cr.ok)throw new Error('\u4E0A\u4F20\u5B8C\u6210\u5931\u8D25');
    }

    async function conc(ts,lim){
      var ex=new Set();
      for(var i=0;i<ts.length;i++){if(ex.size>=lim)await Promise.race(ex);let p=ts[i]().then(function(){ex.delete(p)}).catch(function(){ex.delete(p)});ex.add(p)}
      await Promise.all(ex);
    }

    init();
  <\/script>
</body>
</html>`;
}
__name(renderUploadKeyPage, "renderUploadKeyPage");

// src/html/public-upload.ts
function renderPublicUploadPage(siteKey) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - \u4E0A\u4F20\u6587\u4EF6</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>\u2601\uFE0F</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer><\/script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--glow:rgba(0,0,0,0.08)}
    @media(prefers-color-scheme:dark){:root{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--glow:rgba(255,255,255,0.06)}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background .4s;padding:16px}
    .card{width:480px;max-width:100%;background:var(--card);border-radius:22px;padding:48px 36px 36px;box-shadow:0 2px 24px rgba(0,0,0,0.06);text-align:center;animation:pop .5s cubic-bezier(.34,1.56,.64,1);transition:background .4s}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .file-icon{font-size:56px;margin-bottom:14px}
    .title{font-size:19px;font-weight:700;color:var(--text);margin-bottom:4px}
    .sub{font-size:14px;color:var(--sub);margin-bottom:24px}
    .ts-section{margin:20px 0}.ts-hint{font-size:13px;color:var(--sub);margin-bottom:14px}
    .ts-box{display:flex;justify-content:center;min-height:65px}
    .drop-zone{border:2px dashed var(--border);border-radius:14px;padding:40px 20px;margin:20px 0;cursor:pointer;transition:all .25s;color:var(--sub);font-size:14px}
    .drop-zone:hover,.drop-zone.dragover{border-color:var(--accent);background:var(--glow)}
    .drop-zone .icon{font-size:36px;margin-bottom:8px}
    .file-list{text-align:left;margin:16px 0;max-height:200px;overflow-y:auto}
    .file-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;font-size:13px}
    .file-item .name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
    .file-item .size{color:var(--sub);font-size:12px}
    .file-item .remove{background:none;border:none;cursor:pointer;color:var(--sub);font-size:16px;padding:2px 6px;border-radius:4px}
    .file-item .remove:hover{color:#ef4444;background:rgba(239,68,68,0.1)}
    .upload-btn{width:100%;padding:14px;border:none;border-radius:12px;background:var(--accent);color:var(--accent-fg);font-size:16px;font-weight:700;cursor:pointer;transition:all .25s;margin-top:12px}
    .upload-btn:hover:not(:disabled){opacity:0.85;transform:translateY(-1px)}
    .upload-btn:disabled{opacity:0.35;cursor:not-allowed}
    .upload-btn.going{opacity:0.7;pointer-events:none}
    .progress-wrap{margin:16px 0;text-align:left}
    .progress-item{margin-bottom:12px}
    .progress-item .pi-name{font-size:13px;font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .progress-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .progress-bar .fill{height:100%;background:var(--accent);border-radius:2px;transition:width .2s}
    .progress-item .pi-status{font-size:11px;color:var(--sub);margin-top:4px}
    .done{text-align:center;padding:20px 0}
    .done .icon{font-size:48px;margin-bottom:12px}
    .done .msg{font-size:15px;color:var(--text);font-weight:600}
    .done .sub2{font-size:13px;color:var(--sub);margin-top:4px}
    .foot{margin-top:28px;font-size:11px;color:var(--sub)}
    @media(max-width:500px){.card{border-radius:14px;padding:32px 16px 24px}.title{font-size:17px}.drop-zone{padding:30px 16px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="file-icon">\u{1F4E4}</div>
    <div class="title">\u4E0A\u4F20\u6587\u4EF6</div>
    <div class="sub">\u516C\u5F00\u4E0A\u4F20 \xB7 \u65E0\u9700\u8D26\u53F7</div>
    <div class="ts-section"><div class="ts-hint">\u5B8C\u6210\u9A8C\u8BC1\u540E\u5F00\u59CB\u4E0A\u4F20</div><div class="ts-box"><div class="cf-turnstile" data-sitekey="${siteKey.replace(/"/g, "&quot;")}" data-callback="onTS"></div></div></div>
    <div id="file-area" style="display:none">
      <div class="drop-zone" id="drop-zone"><div class="icon">\u{1F4C1}</div>\u70B9\u51FB\u9009\u62E9\u6216\u62D6\u62FD\u6587\u4EF6\u5230\u6B64\u5904</div>
      <div class="file-list" id="file-list"></div>
      <button class="upload-btn" id="upload-btn" disabled onclick="startUpload()">\u4E0A\u4F20</button>
    </div>
    <div class="progress-wrap" id="progress-wrap" style="display:none"></div>
    <div class="done" id="done-view" style="display:none"><div class="icon">\u2705</div><div class="msg">\u4E0A\u4F20\u5B8C\u6210</div><div class="sub2" id="done-count"></div></div>
    <div class="foot">ioDrive</div>
  </div>
  <input type="file" id="file-input" multiple style="display:none">
  <script>
    var tsToken='',selectedFiles=[];
    var PS=20*1024*1024,MC=6;

    function onTS(t){tsToken=t;document.getElementById('upload-btn').disabled=selectedFiles.length===0?true:false;document.getElementById('file-area').style.display=''}
    function fmt(b){if(!b)return'0 B';var u=['B','KB','MB','GB','TB'],i=0,s=b;while(s>=1024&&i<u.length-1){s/=1024;i++}return s.toFixed(i?1:0)+' '+u[i]}
    function fmtS(b){return fmt(b)+'/s'}
    function fmtE(s){if(!s||!isFinite(s))return'';if(s<60)return Math.ceil(s)+'s';if(s<3600)return Math.ceil(s/60)+'m';return(s/3600).toFixed(1)+'h'}
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    var fileInput=document.getElementById('file-input');
    var dropZone=document.getElementById('drop-zone');
    dropZone.onclick=function(){fileInput.click()};
    fileInput.onchange=function(){addFiles(fileInput.files)};
    dropZone.ondragover=function(e){e.preventDefault();dropZone.classList.add('dragover')};
    dropZone.ondragleave=function(){dropZone.classList.remove('dragover')};
    dropZone.ondrop=function(e){e.preventDefault();dropZone.classList.remove('dragover');addFiles(e.dataTransfer.files)};
    function addFiles(fl){
      for(var i=0;i<fl.length;i++)selectedFiles.push(fl[i]);
      renderFiles();
      if(tsToken)document.getElementById('upload-btn').disabled=selectedFiles.length===0;
    }
    function removeFile(i){selectedFiles.splice(i,1);renderFiles();if(tsToken)document.getElementById('upload-btn').disabled=selectedFiles.length===0}
    function renderFiles(){
      var el=document.getElementById('file-list');
      if(!selectedFiles.length){el.innerHTML='';return}
      var h='';
      for(var i=0;i<selectedFiles.length;i++){
        var f=selectedFiles[i];
        h+='<div class="file-item"><span class="name">'+esc(f.name)+'</span><span class="size">'+fmt(f.size)+'</span><button class="remove" onclick="removeFile('+i+')">\u2715</button></div>';
      }
      el.innerHTML=h;
    }

    async function startUpload(){
      if(!tsToken||!selectedFiles.length)return;
      document.getElementById('upload-btn').classList.add('going');
      document.getElementById('upload-btn').textContent='\u4E0A\u4F20\u4E2D\u2026';
      document.getElementById('progress-wrap').style.display='';
      var pw=document.getElementById('progress-wrap');pw.innerHTML='';
      for(var i=0;i<selectedFiles.length;i++){
        pw.innerHTML+='<div class="progress-item" id="pi'+i+'"><div class="pi-name">'+esc(selectedFiles[i].name)+' ('+fmt(selectedFiles[i].size)+')</div><div class="progress-bar"><div class="fill" style="width:0%"></div></div><div class="pi-status">\u51C6\u5907...</div></div>';
      }
      var ok=0,fail=0;
      for(var i=0;i<selectedFiles.length;i++){
        try{
          if(selectedFiles[i].size<=PS)await upSingle(selectedFiles[i],i);
          else await upMulti(selectedFiles[i],i);
          piStatus(i,'\u2705 \u5B8C\u6210');ok++;
        }catch(e){piStatus(i,'\u274C '+e.message);fail++}
      }
      document.getElementById('progress-wrap').style.display='none';
      document.getElementById('done-view').style.display='';
      document.getElementById('done-count').textContent='\u6210\u529F '+ok+' \u4E2A'+(fail?'\uFF0C\u5931\u8D25 '+fail+' \u4E2A':'');
    }
    function piProg(i,p){var f=document.querySelector('#pi'+i+' .fill');if(f)f.style.width=p+'%'}
    function piStatus(i,t){var e=document.querySelector('#pi'+i+' .pi-status');if(e)e.textContent=t}

    function xhrUp(url,fd,idx){
      return new Promise(function(ok,no){
        var x=new XMLHttpRequest(),t0=Date.now();
        x.open('POST',url);
        x.upload.onprogress=function(e){
          if(e.lengthComputable){
            var el=(Date.now()-t0)/1000,sp=el>0?e.loaded/el:0,pct=Math.round(e.loaded/e.total*100),rm=sp>0?(e.total-e.loaded)/sp:0;
            piProg(idx,pct);piStatus(idx,fmtS(sp)+' \xB7 '+pct+'% \xB7 \u5269\u4F59 '+fmtE(rm));
          }
        };
        x.onload=function(){
          if(x.status>=200&&x.status<300){try{ok(JSON.parse(x.responseText))}catch{ok(x.responseText)}}
          else{try{no(new Error(JSON.parse(x.responseText).error))}catch{no(new Error('\u4E0A\u4F20\u5931\u8D25 '+x.status))}}
        };
        x.onerror=function(){no(new Error('\u7F51\u7EDC\u5F02\u5E38'))};
        x.send(fd);
      });
    }

    async function upSingle(f,idx){
      var fd=new FormData();fd.append('file',f);fd.append('turnstile',tsToken);
      await xhrUp('/api/upload-public/single',fd,idx);
    }

    async function upMulti(f,idx){
      var r=await fetch('/api/upload-public/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,size:f.size,turnstile:tsToken})});
      if(!r.ok)throw new Error('\u65E0\u6CD5\u5F00\u59CB\u4E0A\u4F20');
      var d=await r.json(),uid=d.uploadId,key=d.key;
      var tp=Math.ceil(f.size/PS),parts=[],pp=new Array(tp).fill(0),t0=Date.now(),q=[];
      for(var i=0;i<tp;i++){
        (function(pi,pn){
          var s=pi*PS,e=Math.min(s+PS,f.size),ch=f.slice(s,e);
          q.push(function(){
            return new Promise(function(ok,no){
              var fd=new FormData();fd.append('uploadId',uid);fd.append('key',key);fd.append('partNumber',String(pn));fd.append('chunk',ch);
              var x=new XMLHttpRequest();x.open('POST','/api/upload-public/part');
              x.upload.onprogress=function(ev){
                if(ev.lengthComputable){
                  pp[pi]=ev.loaded;var td=0;for(var j=0;j<pp.length;j++)td+=pp[j];
                  var el=(Date.now()-t0)/1000,sp=el>0?td/el:0,pct=Math.round(td/f.size*100),rm=sp>0?(f.size-td)/sp:0;
                  piProg(idx,pct);piStatus(idx,fmtS(sp)+' \xB7 '+pct+'% (\u5206\u7247 '+pn+'/'+tp+') \xB7 '+fmtE(rm));
                }
              };
              x.onload=function(){if(x.status>=200&&x.status<300){parts.push({partNumber:pn,etag:JSON.parse(x.responseText).etag});ok()}else{no(new Error('\u5206\u7247 '+pn+' \u4E0A\u4F20\u5931\u8D25'))}};
              x.onerror=function(){no(new Error('\u7F51\u7EDC\u5F02\u5E38'))};
              x.send(fd);
            });
          });
        })(i,i+1);
      }
      try{await conc(q,MC)}catch(e){fetch('/api/upload-public/abort',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key})}).catch(function(){});throw e}
      parts.sort(function(a,b){return a.partNumber-b.partNumber});
      var cr=await fetch('/api/upload-public/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key,parts:parts})});
      if(!cr.ok)throw new Error('\u4E0A\u4F20\u5B8C\u6210\u5931\u8D25');
    }

    async function conc(ts,lim){
      var ex=new Set();
      for(var i=0;i<ts.length;i++){if(ex.size>=lim)await Promise.race(ex);let p=ts[i]().then(function(){ex.delete(p)}).catch(function(){ex.delete(p)});ex.add(p)}
      await Promise.all(ex);
    }
  <\/script>
</body>
</html>`;
}
__name(renderPublicUploadPage, "renderPublicUploadPage");

// src/html/demo.ts
function renderDemo() {
  const IMG = "https://raw.githubusercontent.com/Mareixcode/Cloudflare-Drive/main/docs/images/screenshots";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - \u8F7B\u91CF\u7EA7 Cloudflare \u6587\u4EF6\u5206\u4EAB\u7CFB\u7EDF</title>
  <meta name="description" content="ioDrive - \u57FA\u4E8E Cloudflare Workers + Hono + R2 \u6784\u5EFA\u7684\u8F7B\u91CF\u7EA7\u6587\u4EF6\u7BA1\u7406\u4E0E\u5206\u4EAB\u5E73\u53F0">
  <meta property="og:title" content="ioDrive - \u8F7B\u91CF\u7EA7\u4E91\u6587\u4EF6\u5206\u4EAB">
  <meta property="og:description" content="\u57FA\u4E8E Cloudflare Workers + Hono + R2 \u6784\u5EFA\u7684\u9AD8\u6027\u80FD\u6587\u4EF6\u7BA1\u7406\u4E0E\u5206\u4EAB\u5E73\u53F0">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>\u2601\uFE0F</text></svg>">
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#666;--sub2:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--hover:#f0f0f0;--shadow:0 2px 12px rgba(0,0,0,0.06);--shadow-lg:0 8px 32px rgba(0,0,0,0.1)}
    [data-theme="dark"]{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#a1a1aa;--sub2:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--hover:#27272a;--shadow:0 2px 12px rgba(0,0,0,0.3);--shadow-lg:0 8px 32px rgba(0,0,0,0.4)}
    *{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);background:var(--bg);transition:background .35s,color .35s;overflow-x:hidden;-webkit-font-smoothing:antialiased}
    ::selection{background:var(--accent);color:var(--accent-fg)}
    a{color:inherit;text-decoration:none}

    /* \u2500\u2500 Nav \u2500\u2500 */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;background:rgba(245,245,247,0.8);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:all .3s}
    [data-theme="dark"] .nav{background:rgba(9,9,11,0.8)}
    .nav.scrolled{border-bottom:1px solid var(--border)}
    .nav-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px}
    .nav-logo svg{width:24px;height:24px;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
    .nav-logo:hover svg{transform:rotate(-8deg) scale(1.1)}
    .nav-links{display:flex;gap:28px}
    .nav-links a{font-size:14px;font-weight:500;color:var(--sub);transition:color .2s}
    .nav-links a:hover{color:var(--text)}
    .nav-right{display:flex;align-items:center;gap:8px}
    .theme-btn{background:none;border:1.5px solid var(--border);cursor:pointer;width:36px;height:36px;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;color:var(--sub)}
    .theme-btn:hover{background:var(--hover);transform:scale(1.08)}
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--text)}
    .hamburger svg{width:22px;height:22px}

    /* \u2500\u2500 Mobile menu \u2500\u2500 */
    .mobile-menu{display:none;position:fixed;top:60px;left:0;right:0;background:var(--card);border-bottom:1px solid var(--border);padding:16px 24px;z-index:99;animation:slideDown .25s ease}
    .mobile-menu.open{display:block}
    .mobile-menu a{display:block;padding:12px 0;font-size:15px;font-weight:500;color:var(--text);border-bottom:1px solid var(--border)}
    .mobile-menu a:last-child{border-bottom:none}
    @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

    /* \u2500\u2500 Hero \u2500\u2500 */
    .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:100px 24px 60px;position:relative}
    .hero::before{content:'';position:absolute;top:50%;left:50%;width:600px;height:600px;transform:translate(-50%,-55%);background:radial-gradient(circle,rgba(0,0,0,0.03) 0%,transparent 70%);pointer-events:none;border-radius:50%}
    [data-theme="dark"] .hero::before{background:radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 70%)}
    .hero-logo{margin-bottom:24px;animation:bounceIn .7s cubic-bezier(.34,1.56,.64,1)}
    .hero-logo svg{width:72px;height:72px}
    .hero h1{font-size:48px;font-weight:800;letter-spacing:-1.5px;margin-bottom:12px;animation:fadeUp .6s .15s both}
    .hero .subtitle{font-size:20px;color:var(--sub);margin-bottom:8px;font-weight:500;animation:fadeUp .6s .25s both}
    .hero .desc{font-size:15px;color:var(--sub2);max-width:480px;line-height:1.6;margin-bottom:36px;animation:fadeUp .6s .35s both}
    .hero-btns{display:flex;gap:12px;animation:fadeUp .6s .45s both}
    .btn-p{padding:12px 28px;background:var(--accent);color:var(--accent-fg);border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
    .btn-p:hover{opacity:.85;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
    .btn-s{padding:12px 28px;background:var(--card);color:var(--text);border:1.5px solid var(--border);border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
    .btn-s:hover{background:var(--hover);transform:translateY(-1px);box-shadow:var(--shadow)}
    @keyframes bounceIn{0%{opacity:0;transform:scale(.6) translateY(20px)}60%{transform:scale(1.05) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

    /* \u2500\u2500 Sections \u2500\u2500 */
    .section{padding:80px 24px;max-width:1040px;margin:0 auto}
    .section-title{text-align:center;font-size:28px;font-weight:700;letter-spacing:-0.5px;margin-bottom:8px}
    .section-desc{text-align:center;font-size:15px;color:var(--sub2);margin-bottom:48px}
    .scroll-reveal{opacity:0;transform:translateY(28px);transition:opacity .6s cubic-bezier(.34,1.56,.64,1),transform .6s cubic-bezier(.34,1.56,.64,1)}
    .scroll-reveal.revealed{opacity:1;transform:translateY(0)}

    /* \u2500\u2500 Features \u2500\u2500 */
    .features{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
    .feature-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:28px;transition:all .25s cubic-bezier(.34,1.56,.64,1);cursor:default}
    .feature-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:var(--sub2)}
    .feature-icon{width:44px;height:44px;background:var(--bg);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
    .feature-card:hover .feature-icon{transform:scale(1.1) rotate(-5deg)}
    .feature-card h3{font-size:16px;font-weight:600;margin-bottom:8px}
    .feature-card p{font-size:13px;color:var(--sub);line-height:1.6}

    /* \u2500\u2500 Screenshots \u2500\u2500 */
    .screenshots-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
    .device-frame{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
    .device-frame:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}
    .device-bar{height:32px;background:var(--bg);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:6px}
    .device-bar .dot{width:8px;height:8px;border-radius:50%;background:var(--border)}
    .device-bar .dot.r{background:#ff5f57}.device-bar .dot.y{background:#febc2e}.device-bar .dot.g{background:#28c840}
    .device-bar .url{flex:1;margin-left:12px;height:16px;background:var(--card);border:1px solid var(--border);border-radius:4px;font-size:10px;color:var(--sub2);display:flex;align-items:center;padding:0 8px}
    .device-frame img{width:100%;display:block}
    .device-caption{text-align:center;padding:12px;font-size:13px;color:var(--sub);font-weight:500}

    /* \u2500\u2500 Architecture \u2500\u2500 */
    .arch-container{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
    .arch-diagram{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:32px;box-shadow:var(--shadow)}
    .arch-node{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center;font-size:13px;font-weight:600;margin:0 auto;max-width:220px}
    .arch-arrow{text-align:center;color:var(--sub2);font-size:16px;padding:4px 0}
    .arch-branches{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}
    .arch-branches .arch-node{font-size:11px;padding:8px 6px}
    .tech-list{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .tech-item{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px;transition:all .2s}
    .tech-item:hover{border-color:var(--sub2);transform:translateY(-2px);box-shadow:var(--shadow)}
    .tech-icon{width:36px;height:36px;background:var(--bg);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .tech-item h4{font-size:14px;font-weight:600;margin-bottom:2px}
    .tech-item p{font-size:11px;color:var(--sub)}

    /* \u2500\u2500 Trial \u2500\u2500 */
    .trial-box{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:40px;text-align:center;box-shadow:var(--shadow);max-width:560px;margin:0 auto}
    .trial-box h3{font-size:20px;font-weight:700;margin-bottom:8px}
    .trial-box .sub{font-size:14px;color:var(--sub2);margin-bottom:24px}
    .trial-creds{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:16px 24px;display:inline-flex;gap:28px;margin-bottom:28px;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace}
    .trial-creds .label{font-size:11px;color:var(--sub2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
    .trial-creds .value{font-size:15px;font-weight:600}
    .trial-btns{display:flex;gap:12px;justify-content:center}
    .trial-btns .btn-p,.trial-btns .btn-s{padding:10px 24px;font-size:14px}

    /* \u2500\u2500 Steps \u2500\u2500 */
    .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    .step{position:relative}
    .step-num{width:32px;height:32px;background:var(--accent);color:var(--accent-fg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-bottom:12px}
    .step h4{font-size:15px;font-weight:600;margin-bottom:10px}
    .step .code-block{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:8px}
    .step .code-block code{color:var(--text)}
    .step .code-block .copy{background:none;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--sub);transition:all .2s;flex-shrink:0}
    .step .code-block .copy:hover{background:var(--hover);color:var(--text)}
    .step p{font-size:13px;color:var(--sub);margin-top:8px;line-height:1.5}

    /* \u2500\u2500 Footer \u2500\u2500 */
    .footer{border-top:1px solid var(--border);padding:32px 24px;text-align:center}
    .footer-inner{max-width:1040px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
    .footer-brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600}
    .footer-brand svg{width:20px;height:20px}
    .footer-info{font-size:13px;color:var(--sub)}
    .footer a{transition:color .2s}
    .footer a:hover{color:var(--text)}

    /* \u2500\u2500 Responsive \u2500\u2500 */
    @media(max-width:768px){
      .nav{padding:0 20px}
      .nav-links{display:none}
      .hamburger{display:flex}
      .hero{padding:80px 20px 40px;min-height:auto}
      .hero h1{font-size:36px}
      .hero .subtitle{font-size:17px}
      .hero .desc{font-size:14px}
      .hero-btns{flex-direction:column;width:100%;max-width:280px}
      .hero-btns .btn-p,.hero-btns .btn-s{justify-content:center}
      .section{padding:48px 20px}
      .section-title{font-size:24px}
      .features{grid-template-columns:repeat(2,1fr);gap:14px}
      .feature-card{padding:22px}
      .screenshots-grid{grid-template-columns:1fr}
      .arch-container{grid-template-columns:1fr;gap:28px}
      .tech-list{grid-template-columns:1fr}
      .steps{grid-template-columns:1fr;gap:20px}
      .trial-creds{flex-direction:column;gap:12px}
      .trial-btns{flex-direction:column}
      .trial-btns .btn-p,.trial-btns .btn-s{width:100%;justify-content:center}
      .footer-inner{flex-direction:column;text-align:center}
    }
    @media(max-width:480px){
      .hero h1{font-size:30px}
      .hero .subtitle{font-size:15px}
      .features{grid-template-columns:1fr}
      .trial-box{padding:28px 20px}
      .trial-creds{padding:12px 16px}
      .step .code-block{font-size:12px;padding:8px 10px}
    }
  </style>
</head>
<body>

<!-- \u2500\u2500 Nav \u2500\u2500 -->
<nav class="nav" id="nav">
  <a href="#" class="nav-logo">
    <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ioDrive
  </a>
  <div class="nav-links">
    <a href="#features">\u6838\u5FC3\u529F\u80FD</a>
    <a href="#screenshots">\u4EA7\u54C1\u5C55\u793A</a>
    <a href="#arch">\u6280\u672F\u67B6\u6784</a>
    <a href="#trial">\u7ACB\u5373\u4F53\u9A8C</a>
    <a href="#start">\u5FEB\u901F\u5F00\u59CB</a>
  </div>
  <div class="nav-right">
    <button class="theme-btn" id="theme-btn" onclick="toggleTheme()">\u{1F319}</button>
    <button class="hamburger" id="hamburger" onclick="toggleMenu()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</nav>
<div class="mobile-menu" id="mobile-menu">
  <a href="#features" onclick="closeMenu()">\u6838\u5FC3\u529F\u80FD</a>
  <a href="#screenshots" onclick="closeMenu()">\u4EA7\u54C1\u5C55\u793A</a>
  <a href="#arch" onclick="closeMenu()">\u6280\u672F\u67B6\u6784</a>
  <a href="#trial" onclick="closeMenu()">\u7ACB\u5373\u4F53\u9A8C</a>
  <a href="#start" onclick="closeMenu()">\u5FEB\u901F\u5F00\u59CB</a>
</div>

<!-- \u2500\u2500 Hero \u2500\u2500 -->
<section class="hero">
  <div class="hero-logo">
    <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
  <h1>ioDrive</h1>
  <p class="subtitle">\u8F7B\u91CF\u7EA7 Cloudflare \u6587\u4EF6\u5206\u4EAB\u7CFB\u7EDF</p>
  <p class="desc">\u57FA\u4E8E Cloudflare Workers + Hono + R2 \u6784\u5EFA\u7684\u9AD8\u6027\u80FD\u6587\u4EF6\u7BA1\u7406\u4E0E\u5206\u4EAB\u5E73\u53F0\uFF0C\u652F\u6301\u53CC\u4E91\u5B58\u50A8\u3001\u516C\u5F00\u4E0A\u4F20\u3001\u5206\u4EAB\u94FE\u63A5\u7B49\u529F\u80FD</p>
  <div class="hero-btns">
    <a href="#features" class="btn-p">\u4E86\u89E3\u66F4\u591A \u2193</a>
    <a href="https://github.com/Mareixcode/Cloudflare-Drive" target="_blank" class="btn-s">GitHub \u2197</a>
  </div>
</section>

<!-- \u2500\u2500 Features \u2500\u2500 -->
<section class="section" id="features">
  <h2 class="section-title scroll-reveal">\u6838\u5FC3\u529F\u80FD</h2>
  <p class="section-desc scroll-reveal">\u4E00\u7AD9\u5F0F\u6587\u4EF6\u7BA1\u7406\u4E0E\u5206\u4EAB\u89E3\u51B3\u65B9\u6848</p>
  <div class="features">
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">\u{1F4C1}</div>
      <h3>\u6587\u4EF6\u7BA1\u7406</h3>
      <p>\u6587\u4EF6\u5939\u521B\u5EFA\u3001\u4E0A\u4F20\u3001\u79FB\u52A8\u3001\u6279\u91CF\u5220\u9664\u548C\u6279\u91CF\u5206\u4EAB\uFF0C\u4E00\u7AD9\u5F0F\u7BA1\u7406\u60A8\u7684\u4E91\u7AEF\u6587\u4EF6\u3002</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">\u{1F517}</div>
      <h3>\u5206\u4EAB\u7CFB\u7EDF</h3>
      <p>\u4E00\u952E\u521B\u5EFA\u5206\u4EAB\u94FE\u63A5\uFF0C\u652F\u6301\u6709\u6548\u671F\u8BBE\u7F6E\u3001\u4E0B\u8F7D\u7EDF\u8BA1\u548C\u94FE\u63A5\u7BA1\u7406\u3002</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">\u{1F4E4}</div>
      <h3>\u516C\u5171\u4E0A\u4F20</h3>
      <p>\u65E0\u9700\u767B\u5F55\u5373\u53EF\u4E0A\u4F20\uFF0CTurnstile \u4EBA\u673A\u9A8C\u8BC1\u4FDD\u62A4\uFF0C\u652F\u6301\u81EA\u5B9A\u4E49\u4E0A\u4F20\u76EE\u5F55\u3002</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">\u{1F511}</div>
      <h3>\u4E0A\u4F20\u94FE\u63A5</h3>
      <p>\u72EC\u7ACB\u4E0A\u4F20\u5730\u5740\uFF0C\u81EA\u5B9A\u4E49\u6709\u6548\u671F\u548C\u76EE\u5F55\uFF0C\u9002\u5408\u56E2\u961F\u534F\u4F5C\u548C\u5916\u90E8\u63A5\u6536\u6587\u4EF6\u3002</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">\u{1F4CA}</div>
      <h3>\u4E0B\u8F7D\u7EDF\u8BA1</h3>
      <p>\u8BB0\u5F55 IP\u3001\u5730\u533A\u3001\u6D4F\u89C8\u5668\u3001\u64CD\u4F5C\u7CFB\u7EDF\u548C\u8BBE\u5907\u7C7B\u578B\uFF0C\u5168\u9762\u4E86\u89E3\u6587\u4EF6\u5206\u53D1\u60C5\u51B5\u3002</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">\u2601\uFE0F</div>
      <h3>\u53CC\u4E91\u5B58\u50A8</h3>
      <p>\u540C\u65F6\u652F\u6301 Cloudflare R2 \u548C S3 \u517C\u5BB9\u5B58\u50A8\uFF0CPresigned URL \u76F4\u63A5\u4E0B\u8F7D\u3002</p>
    </div>
  </div>
</section>

<!-- \u2500\u2500 Screenshots \u2500\u2500 -->
<section class="section" id="screenshots">
  <h2 class="section-title scroll-reveal">\u4EA7\u54C1\u5C55\u793A</h2>
  <p class="section-desc scroll-reveal">\u7B80\u6D01\u7684\u754C\u9762\u8BBE\u8BA1\uFF0C\u652F\u6301\u6DF1\u8272/\u6D45\u8272\u4E3B\u9898</p>
  <div class="screenshots-grid">
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com</div></div>
      <img src="${IMG}/dashboard.jpg" alt="\u7BA1\u7406\u540E\u53F0" loading="lazy">
      <div class="device-caption">\u7BA1\u7406\u540E\u53F0</div>
    </div>
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com/upload</div></div>
      <img src="${IMG}/upload.png" alt="\u6587\u4EF6\u4E0A\u4F20" loading="lazy">
      <div class="device-caption">\u6587\u4EF6\u4E0A\u4F20</div>
    </div>
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com/s/...</div></div>
      <img src="${IMG}/share-link-1.png" alt="\u5206\u4EAB\u9875\u9762" loading="lazy">
      <div class="device-caption">\u5206\u4EAB\u9875\u9762</div>
    </div>
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com/s/...</div></div>
      <img src="${IMG}/share-link-2.png" alt="\u5206\u4EAB\u4E0B\u8F7D" loading="lazy">
      <div class="device-caption">\u5206\u4EAB\u4E0B\u8F7D</div>
    </div>
  </div>
</section>

<!-- \u2500\u2500 Architecture \u2500\u2500 -->
<section class="section" id="arch">
  <h2 class="section-title scroll-reveal">\u6280\u672F\u67B6\u6784</h2>
  <p class="section-desc scroll-reveal">\u5B8C\u5168\u8FD0\u884C\u5728 Cloudflare \u8FB9\u7F18\u7F51\u7EDC</p>
  <div class="arch-container">
    <div class="arch-diagram scroll-reveal">
      <div class="arch-node">\u7528\u6237\u8BF7\u6C42</div>
      <div class="arch-arrow">\u2193</div>
      <div class="arch-node" style="background:var(--accent);color:var(--accent-fg)">Cloudflare Workers</div>
      <div class="arch-arrow">\u2193</div>
      <div class="arch-node">Hono Framework</div>
      <div class="arch-arrow">\u2193</div>
      <div class="arch-branches">
        <div class="arch-node">JWT \u8BA4\u8BC1</div>
        <div class="arch-node">\u5206\u4EAB\u670D\u52A1</div>
        <div class="arch-node">\u4E0A\u4F20\u670D\u52A1</div>
      </div>
      <div class="arch-arrow">\u2193</div>
      <div class="arch-node" style="background:var(--accent);color:var(--accent-fg)">Cloudflare R2</div>
      <div class="arch-arrow">\u2193</div>
      <div class="arch-node">\u53EF\u9009 S3 \u540C\u6B65</div>
    </div>
    <div class="tech-list">
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">\u{1F4BB}</div>
        <div><h4>TypeScript</h4><p>\u7C7B\u578B\u5B89\u5168\u7684\u5F00\u53D1\u8BED\u8A00</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">\u26A1</div>
        <div><h4>Hono</h4><p>\u8F7B\u91CF\u7EA7 Web \u6846\u67B6</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">\u2601\uFE0F</div>
        <div><h4>Cloudflare Workers</h4><p>\u8FB9\u7F18\u8BA1\u7B97\u8FD0\u884C\u65F6</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">\u{1FA63}</div>
        <div><h4>Cloudflare R2</h4><p>S3 \u517C\u5BB9\u5BF9\u8C61\u5B58\u50A8</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">\u{1F6E1}\uFE0F</div>
        <div><h4>Cloudflare Turnstile</h4><p>\u514D\u8D39\u4EBA\u673A\u9A8C\u8BC1</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">\u{1F504}</div>
        <div><h4>S3 \u517C\u5BB9\u5B58\u50A8</h4><p>AWS S3 / MinIO / B2</p></div>
      </div>
    </div>
  </div>
</section>

<!-- \u2500\u2500 Trial \u2500\u2500 -->
<section class="section" id="trial">
  <h2 class="section-title scroll-reveal">\u7ACB\u5373\u4F53\u9A8C</h2>
  <p class="section-desc scroll-reveal">\u4F7F\u7528\u4EE5\u4E0B\u8D26\u53F7\u767B\u5F55\u4F53\u9A8C\u5B8C\u6574\u529F\u80FD</p>
  <div class="trial-box scroll-reveal">
    <h3>\u{1F510} \u6F14\u793A\u8D26\u53F7</h3>
    <p class="sub">\u76F4\u63A5\u4F7F\u7528\u4EE5\u4E0B\u51ED\u636E\u767B\u5F55\u7BA1\u7406\u540E\u53F0</p>
    <div class="trial-creds">
      <div><div class="label">\u7528\u6237\u540D</div><div class="value">admin</div></div>
      <div><div class="label">\u5BC6\u7801</div><div class="value">admin</div></div>
    </div>
    <div class="trial-btns">
      <a href="/login" class="btn-p">\u7ACB\u5373\u767B\u5F55</a>
      <button class="btn-s" disabled style="opacity:.5;cursor:not-allowed">\u6F14\u793A\u73AF\u5883\u5DF2\u7981\u7528\u4E0A\u4F20</button>
    </div>
  </div>
</section>

<!-- \u2500\u2500 Quick Start \u2500\u2500 -->
<section class="section" id="start">
  <h2 class="section-title scroll-reveal">\u5FEB\u901F\u5F00\u59CB</h2>
  <p class="section-desc scroll-reveal">\u4E09\u6B65\u90E8\u7F72\u60A8\u81EA\u5DF1\u7684 ioDrive</p>
  <div class="steps">
    <div class="step scroll-reveal">
      <div class="step-num">1</div>
      <h4>\u5B89\u88C5\u4F9D\u8D56</h4>
      <div class="code-block"><code>npm install</code><button class="copy" onclick="copyCode(this)">\u590D\u5236</button></div>
      <p>\u514B\u9686\u9879\u76EE\u4ED3\u5E93\u5E76\u5B89\u88C5\u4F9D\u8D56\u5305</p>
    </div>
    <div class="step scroll-reveal">
      <div class="step-num">2</div>
      <h4>\u672C\u5730\u5F00\u53D1</h4>
      <div class="code-block"><code>npm run dev</code><button class="copy" onclick="copyCode(this)">\u590D\u5236</button></div>
      <p>\u542F\u52A8\u672C\u5730\u5F00\u53D1\u670D\u52A1\u5668\u8FDB\u884C\u8C03\u8BD5</p>
    </div>
    <div class="step scroll-reveal">
      <div class="step-num">3</div>
      <h4>\u90E8\u7F72\u4E0A\u7EBF</h4>
      <div class="code-block"><code>npm run deploy</code><button class="copy" onclick="copyCode(this)">\u590D\u5236</button></div>
      <p>\u4E00\u952E\u90E8\u7F72\u5230 Cloudflare Workers</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:36px" class="scroll-reveal">
    <a href="https://github.com/Mareixcode/Cloudflare-Drive" target="_blank" class="btn-s">\u67E5\u770B GitHub \u4ED3\u5E93 \u2197</a>
  </div>
</section>

<!-- \u2500\u2500 Footer \u2500\u2500 -->
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ioDrive
    </div>
    <div class="footer-info">Cloudflare Workers + Hono + R2</div>
    <div class="footer-info"><a href="https://github.com/Mareixcode/Cloudflare-Drive" target="_blank">GitHub</a> \xB7 GPL-3.0 License \xA9 2026</div>
  </div>
</footer>

<script>
  /* Theme */
  function initTheme(){
    var t=localStorage.getItem('iodrive_theme');
    if(!t) t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
    if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
    updateBtn();
  }
  function toggleTheme(){
    var d=document.documentElement.getAttribute('data-theme')==='dark';
    if(d){document.documentElement.removeAttribute('data-theme');localStorage.setItem('iodrive_theme','light')}
    else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('iodrive_theme','dark')}
    updateBtn();
  }
  function updateBtn(){document.getElementById('theme-btn').textContent=document.documentElement.getAttribute('data-theme')==='dark'?'\u2600\uFE0F':'\u{1F319}'}
  initTheme();

  /* Nav scroll */
  var nav=document.getElementById('nav');
  window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>50)});

  /* Mobile menu */
  function toggleMenu(){document.getElementById('mobile-menu').classList.toggle('open')}
  function closeMenu(){document.getElementById('mobile-menu').classList.remove('open')}

  /* Scroll reveal */
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('revealed');obs.unobserve(e.target)}})
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.scroll-reveal').forEach(function(el,i){
    el.style.transitionDelay=(i%6)*80+'ms';
    obs.observe(el);
  });

  /* Copy */
  function copyCode(btn){
    var code=btn.parentElement.querySelector('code');
    navigator.clipboard.writeText(code.textContent).then(function(){
      btn.textContent='\u2713';setTimeout(function(){btn.textContent='\u590D\u5236'},1200);
    });
  }
<\/script>
</body>
</html>`;
}
__name(renderDemo, "renderDemo");

// src/webdav-xml.ts
function xmlEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(xmlEscape, "xmlEscape");
function propfindResponse(requestUri, items) {
  const responses = items.map((item) => {
    const href = item.href.startsWith("/") ? item.href : "/" + item.href;
    const props = [];
    props.push(`<D:displayname>${xmlEscape(item.displayName)}</D:displayname>`);
    if (item.isCollection) {
      props.push(`<D:resourcetype><D:collection/></D:resourcetype>`);
    } else {
      props.push(`<D:resourcetype/>`);
    }
    if (item.creationDate) {
      props.push(`<D:creationdate>${xmlEscape(item.creationDate)}</D:creationdate>`);
    }
    if (item.lastModified) {
      props.push(`<D:getlastmodified>${xmlEscape(item.lastModified)}</D:getlastmodified>`);
    }
    if (!item.isCollection && item.contentLength !== void 0) {
      props.push(`<D:getcontentlength>${item.contentLength}</D:getcontentlength>`);
    }
    if (!item.isCollection && item.contentType) {
      props.push(`<D:getcontenttype>${xmlEscape(item.contentType)}</D:getcontenttype>`);
    }
    const etag = `"${item.contentLength ?? 0}-${item.lastModified ?? ""}"`;
    props.push(`<D:getetag>${etag}</D:getetag>`);
    return `<D:response>
<D:href>${xmlEscape(href)}</D:href>
<D:propstat>
<D:prop>${props.join("")}</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses}
</D:multistatus>`;
}
__name(propfindResponse, "propfindResponse");
function propstatOk(href) {
  return `<?xml version="1.0" encoding="utf-8"?>
<D:response xmlns:D="DAV:">
<D:href>${xmlEscape(href)}</D:href>
<D:propstat>
<D:prop>
<D:displayname>OK</D:displayname>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
}
__name(propstatOk, "propstatOk");

// src/webdav.ts
var webdavRoutes = new Hono2();
function assertValidKey2(key) {
  if (key.startsWith("_")) throw new Error("\u4E0D\u5141\u8BB8\u64CD\u4F5C\u5185\u90E8\u6587\u4EF6");
  if (key.includes("..")) throw new Error("\u8DEF\u5F84\u4E2D\u5305\u542B ..");
  if (key.includes("\\")) throw new Error("\u8DEF\u5F84\u4E2D\u5305\u542B\u53CD\u659C\u6760");
}
__name(assertValidKey2, "assertValidKey");
function decodeKey(rawPath) {
  let path = rawPath;
  if (path.startsWith("/dav")) path = path.slice(4);
  if (path.startsWith("/")) path = path.slice(1);
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new Error("URL \u89E3\u7801\u5931\u8D25");
  }
  if (decoded.includes("..") || decoded.includes("\\")) {
    throw new Error("\u975E\u6CD5\u8DEF\u5F84");
  }
  return decoded;
}
__name(decodeKey, "decodeKey");
function requireAuth(c) {
  if (c.env.WEBDAV_ENABLED !== "true") {
    return c.text("WebDAV disabled", 403);
  }
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Basic ")) {
    return new Response("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="ioDrive"' }
    });
  }
  return null;
}
__name(requireAuth, "requireAuth");
async function mintInternalJWT(env, ttlSeconds = 300) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return await new SignJWT({ sub: "webdav", role: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(secret);
}
__name(mintInternalJWT, "mintInternalJWT");
async function internalFetch(env, path, init = {}) {
  const token = await mintInternalJWT(env);
  const selfUrl = env.R2_PUBLIC_DOMAIN ? `https://${env.R2_PUBLIC_DOMAIN}` : "http://localhost:8787";
  return await fetch(selfUrl + path, {
    ...init,
    headers: {
      ...init.headers || {},
      "Authorization": `Bearer ${token}`
    }
  });
}
__name(internalFetch, "internalFetch");
webdavRoutes.use("*", async (c, next) => {
  if ((c.req.header("host") || "").startsWith("demo.")) {
    return c.text("demo mode", 403);
  }
  await next();
});
webdavRoutes.on("OPTIONS", "*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  return new Response(null, {
    status: 200,
    headers: {
      "DAV": "1, 2",
      "Allow": "OPTIONS, GET, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY, PROPPATCH",
      "MS-Author-Via": "DAV"
    }
  });
});
webdavRoutes.on("PROPFIND", "*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  let key;
  try {
    key = decodeKey(c.req.path);
  } catch (e) {
    return c.text(e.message, 400);
  }
  const depth = c.req.header("Depth") || "1";
  const engine = await createStorageEngine(c.env);
  const items = [];
  const href = c.req.path.replace(/\/$/, "") || "/dav";
  const isCollection = key === "" || key.endsWith("/");
  if (!isCollection) {
    const head = await engine.head(key);
    if (!head) return c.text("Not Found", 404);
    items.push({
      href,
      isCollection: false,
      displayName: key.split("/").pop() || key,
      lastModified: head.uploaded ? new Date(head.uploaded).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString(),
      contentLength: head.size,
      contentType: head.contentType || "application/octet-stream",
      creationDate: head.uploaded || (/* @__PURE__ */ new Date()).toISOString()
    });
  } else {
    items.push({
      href,
      isCollection: true,
      displayName: key.split("/").filter(Boolean).pop() || "root",
      lastModified: (/* @__PURE__ */ new Date()).toUTCString(),
      creationDate: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (depth !== "0") {
      const prefix = key.endsWith("/") ? key : key + "/";
      const listed = await engine.list(prefix, { delimiter: "/" });
      for (const dp of listed.delimitedPrefixes || []) {
        const childPath = dp;
        const childName = childPath.replace(/\/$/, "").split("/").pop() || childPath;
        items.push({
          href: "/dav/" + childPath,
          isCollection: true,
          displayName: childName,
          lastModified: (/* @__PURE__ */ new Date()).toUTCString(),
          creationDate: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      for (const obj of listed.objects) {
        const name = obj.key.split("/").pop() || obj.key;
        items.push({
          href: "/dav/" + obj.key,
          isCollection: false,
          displayName: name,
          lastModified: obj.uploaded ? new Date(obj.uploaded).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString(),
          contentLength: obj.size,
          contentType: "application/octet-stream",
          creationDate: obj.uploaded || (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
  }
  return new Response(propfindResponse(href, items), {
    status: 207,
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
});
webdavRoutes.get("*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  let key;
  try {
    key = decodeKey(c.req.path);
  } catch (e) {
    return c.text(e.message, 400);
  }
  if (key === "" || key.endsWith("/")) {
    return c.html(renderDirectoryListing(key));
  }
  try {
    assertValidKey2(key);
  } catch (e) {
    return c.text(e.message, 403);
  }
  const engine = await createStorageEngine(c.env);
  const obj = await engine.get(key);
  if (!obj) return c.text("Not Found", 404);
  const name = key.split("/").pop() || key;
  const headers = {
    "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`
  };
  if (obj.size) headers["Content-Length"] = String(obj.size);
  return new Response(obj.body, { status: 200, headers });
});
webdavRoutes.put("*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  let key;
  try {
    key = decodeKey(c.req.path);
    assertValidKey2(key);
  } catch (e) {
    return c.text(e.message, 400);
  }
  if (key.includes("/")) {
    const parent = key.split("/").slice(0, -1).join("/") + "/";
    const engine = await createStorageEngine(c.env);
    const parentCheck = await engine.list(parent, { limit: 1 });
    if (parentCheck.objects.length === 0 && !parentCheck.delimitedPrefixes?.length) {
      return c.text("Parent collection does not exist", 409);
    }
  }
  const body = c.req.raw.body;
  if (!body) return c.text("Missing body", 400);
  const contentType = c.req.header("Content-Type") || "application/octet-stream";
  const formData = new FormData();
  const buf = await new Response(body).arrayBuffer();
  const blob = new File([buf], key.split("/").pop() || "file", { type: contentType });
  formData.set("file", blob);
  formData.set("path", key.split("/").slice(0, -1).join("/") + "/");
  const res = await internalFetch(c.env, "/api/upload/single", {
    method: "POST",
    body: formData
  });
  if (res.ok) {
    return new Response(null, { status: 201, headers: { "Location": "/dav/" + key } });
  }
  const errText = await res.text().catch(() => "");
  return c.text(`Upload failed: ${errText}`, res.status);
});
webdavRoutes.delete("*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  let key;
  try {
    key = decodeKey(c.req.path);
    assertValidKey2(key);
  } catch (e) {
    return c.text(e.message, 400);
  }
  const res = await internalFetch(c.env, `/api/files/${encodeURI(key)}`, {
    method: "DELETE"
  });
  if (res.ok || res.status === 404) {
    return new Response(null, { status: res.status === 404 ? 404 : 204 });
  }
  return c.text(`Delete failed: ${await res.text().catch(() => "")}`, res.status);
});
webdavRoutes.on("MKCOL", "*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  let key;
  try {
    key = decodeKey(c.req.path);
    assertValidKey2(key);
  } catch (e) {
    return c.text(e.message, 400);
  }
  if (!key.endsWith("/")) {
    return c.text("MKCOL requires collection path ending in /", 409);
  }
  const res = await internalFetch(c.env, "/api/files/folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: key })
  });
  if (res.ok) return new Response(null, { status: 201 });
  const errText = await res.text().catch(() => "");
  return c.text(`MKCOL failed: ${errText}`, res.status);
});
webdavRoutes.on("MOVE", "*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  let srcKey;
  try {
    srcKey = decodeKey(c.req.path);
    assertValidKey2(srcKey);
  } catch (e) {
    return c.text(e.message, 400);
  }
  const dest = c.req.header("Destination");
  if (!dest) return c.text("Missing Destination header", 400);
  let destKey;
  try {
    const destUrl = new URL(dest);
    destKey = decodeKey(destUrl.pathname);
    assertValidKey2(destKey);
  } catch (e) {
    return c.text(`Invalid Destination: ${e.message}`, 400);
  }
  const targetDir = destKey.split("/").slice(0, -1).join("/") + "/";
  const res = await internalFetch(c.env, "/api/files/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys: [srcKey], targetPath: targetDir })
  });
  if (res.ok) return new Response(null, { status: 201 });
  const errText = await res.text().catch(() => "");
  return c.text(`MOVE failed: ${errText}`, res.status);
});
webdavRoutes.on("COPY", "*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  let srcKey;
  try {
    srcKey = decodeKey(c.req.path);
    assertValidKey2(srcKey);
  } catch (e) {
    return c.text(e.message, 400);
  }
  const dest = c.req.header("Destination");
  if (!dest) return c.text("Missing Destination header", 400);
  let destKey;
  try {
    const destUrl = new URL(dest);
    destKey = decodeKey(destUrl.pathname);
    assertValidKey2(destKey);
  } catch (e) {
    return c.text(`Invalid Destination: ${e.message}`, 400);
  }
  const engine = await createStorageEngine(c.env);
  const srcObj = await engine.get(srcKey);
  if (!srcObj) return c.text("Source not found", 404);
  await engine.put(destKey, await srcObj.arrayBuffer(), {
    contentType: srcObj.httpMetadata?.contentType
  });
  return new Response(null, { status: 201, headers: { "Location": "/dav/" + destKey } });
});
webdavRoutes.on("PROPPATCH", "*", async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  return new Response(propstatOk(c.req.path), {
    status: 207,
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
});
function renderDirectoryListing(key) {
  const title = key || "root";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} - ioDrive WebDAV</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
h1 { font-size: 18px; }
ul { list-style: none; padding: 0; }
li { padding: 8px 0; border-bottom: 1px solid #eee; }
a { color: #0066cc; text-decoration: none; }
a:hover { text-decoration: underline; }
.note { color: #666; font-size: 14px; margin-top: 20px; }
</style>
</head>
<body>
<h1>\u{1F4C1} ${title || "WebDAV Root"}</h1>
<p class="note">\u8FD9\u662F\u4E00\u4E2A WebDAV \u76EE\u5F55\u3002\u8981\u6D4F\u89C8\u6587\u4EF6\uFF0C\u8BF7\u4F7F\u7528\u652F\u6301 WebDAV \u7684\u5BA2\u6237\u7AEF\uFF08Windows \u8D44\u6E90\u7BA1\u7406\u5668\u3001macOS Finder\u3001RaiDrive \u7B49\uFF09\u8FDE\u63A5\u5230\u672C\u670D\u52A1\u5668\u3002</p>
<p class="note">URL: <code>${new URL("/dav/" + (key || ""), "https://example.com").toString()}</code></p>
</body>
</html>`;
}
__name(renderDirectoryListing, "renderDirectoryListing");

// src/random.ts
var randomRoutes = new Hono2();
randomRoutes.use("*", cors({ origin: "*" }));
randomRoutes.get("/", async (c) => {
  if (c.env.RANDOM_ENABLED !== "true") {
    return c.json({ error: "random API disabled" }, 403);
  }
  const dir = c.req.query("dir") || "";
  const contentFilter = (c.req.query("content") || "image").toLowerCase();
  const orientation = (c.req.query("orientation") || "all").toLowerCase();
  const type = c.req.query("type") || "";
  const form = c.req.query("form") || "";
  const allowedDirs = (c.env.RANDOM_ALLOWED_DIRS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowedDirs.length > 0 && !allowedDirs.includes(dir)) {
    return c.json({ error: "directory not in allowlist" }, 403);
  }
  const origin = new URL(c.req.url).origin;
  const cacheKey = new Request(`${origin}/_random_cache?dir=${encodeURIComponent(dir)}&content=${encodeURIComponent(contentFilter)}`);
  let entries = null;
  try {
    const cached = await caches.default.match(cacheKey);
    if (cached) entries = await cached.json();
  } catch {
  }
  if (!entries) {
    const engine = await createStorageEngine(c.env);
    const prefix = dir.endsWith("/") ? dir : dir + "/";
    const all = [];
    let cursor;
    do {
      const listed = await engine.list(prefix, { limit: 1e3, cursor });
      for (const obj of listed.objects) {
        if (obj.key.endsWith("/")) continue;
        if (obj.key.startsWith("_")) continue;
        all.push({
          key: obj.key,
          contentType: obj.contentType || "application/octet-stream",
          size: obj.size
        });
        if (all.length >= 1e3) break;
      }
      cursor = listed.truncated ? listed.cursor : void 0;
    } while (cursor);
    entries = all;
    try {
      const cacheResponse = new Response(JSON.stringify(entries), {
        headers: { "Content-Type": "application/json" }
      });
      await caches.default.put(cacheKey, cacheResponse);
    } catch {
    }
  }
  const contentTerms = contentFilter.split(",").map((s) => s.trim());
  let filtered = entries.filter(
    (e) => e.size > 100 && contentTerms.some((term) => e.contentType.toLowerCase().includes(term))
  );
  if (orientation !== "all" && filtered.length > 0) {
    const target = orientation === "auto" ? detectOrientation(c.req.header("User-Agent") || "") : orientation;
    if (target !== "all") {
      const oriented = filtered.filter((e) => matchOrientationGuess(e, target));
      if (oriented.length > 0) filtered = oriented;
    }
  }
  if (filtered.length === 0) {
    return c.json({ error: "no matching files" }, 404);
  }
  const picked = filtered[Math.floor(Math.random() * filtered.length)];
  const r2Domain = c.env.R2_PUBLIC_DOMAIN || new URL(c.req.url).host;
  const urlPath = "/" + picked.key.split("/").map(encodeURIComponent).join("/");
  if (form === "text") {
    return c.text("https://" + r2Domain + urlPath);
  }
  if (type === "img") {
    return c.redirect("https://" + r2Domain + urlPath, 302);
  }
  if (type === "url") {
    return c.json({ url: "https://" + r2Domain + urlPath });
  }
  return c.json({ url: urlPath });
});
function detectOrientation(ua) {
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) return "portrait";
  return "landscape";
}
__name(detectOrientation, "detectOrientation");
function matchOrientationGuess(entry, target) {
  return true;
}
__name(matchOrientationGuess, "matchOrientationGuess");
var randomAdminRoutes = new Hono2();
randomAdminRoutes.use("*", jwtAuth);
randomAdminRoutes.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const dirs = body && body.dirs || [];
  const origin = new URL(c.req.url).origin;
  let deleted = 0;
  for (const dir of dirs) {
    const key = new Request(`${origin}/_random_cache?dir=${encodeURIComponent(dir)}`);
    const ok = await caches.default.delete(key);
    if (ok) deleted++;
  }
  return c.json({ ok: true, deleted });
});

// src/moderation-admin.ts
var MODERATION_CONFIG_KEY2 = "_config/moderation";
var moderationAdminRoutes = new Hono2();
moderationAdminRoutes.use("*", jwtAuth);
var DEFAULT_CONFIG = {
  enabled: false,
  provider: "none",
  fileTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  maxSize: 20 * 1024 * 1024,
  thresholds: { adult: 0.9, racy: 0.7 }
};
moderationAdminRoutes.get("/config", async (c) => {
  const meta = createMetadataStore(c.env);
  const cfg = await meta.get(MODERATION_CONFIG_KEY2);
  const safe = cfg ? { ...cfg, apiKey: cfg.apiKey ? "***" + cfg.apiKey.slice(-4) : "" } : DEFAULT_CONFIG;
  return c.json(safe);
});
moderationAdminRoutes.put("/config", async (c) => {
  const body = await c.req.json();
  if (!body.provider || !["moderatecontent", "nsfwjs", "none"].includes(body.provider)) {
    return c.json({ error: "invalid provider" }, 400);
  }
  if (body.enabled && body.provider !== "none") {
    if (body.provider === "moderatecontent" && !body.apiKey) {
      return c.json({ error: "moderatecontent \u9700\u8981 apiKey" }, 400);
    }
    if (body.provider === "nsfwjs" && !body.apiPath) {
      return c.json({ error: "nsfwjs \u9700\u8981 apiPath" }, 400);
    }
  }
  const cfg = {
    enabled: !!body.enabled,
    provider: body.provider,
    apiKey: body.apiKey,
    apiPath: body.apiPath,
    thresholds: body.thresholds,
    fileTypes: body.fileTypes?.length ? body.fileTypes : DEFAULT_CONFIG.fileTypes,
    maxSize: body.maxSize || DEFAULT_CONFIG.maxSize,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const meta = createMetadataStore(c.env);
  await meta.put(MODERATION_CONFIG_KEY2, cfg);
  return c.json({ ok: true, config: { ...cfg, apiKey: cfg.apiKey ? "***" + cfg.apiKey.slice(-4) : "" } });
});
moderationAdminRoutes.post("/test", async (c) => {
  const body = await c.req.json();
  if (!body.url) return c.json({ error: "missing url" }, 400);
  const meta = createMetadataStore(c.env);
  const cfg = await meta.get(MODERATION_CONFIG_KEY2);
  if (!cfg) return c.json({ error: "no moderation config" }, 400);
  const provider = createModerationProvider(cfg);
  if (!provider) return c.json({ error: "provider not configured" }, 400);
  try {
    const result = await provider.moderate({ url: body.url, contentType: "image/*", size: 0 });
    return c.json({ ok: true, result });
  } catch (e) {
    return c.json({ ok: false, error: e?.message || String(e) }, 500);
  }
});
moderationAdminRoutes.get("/logs", async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list(MODERATION_LOG_PREFIX, { limit: 500 });
  const logs = [];
  for (const key of keys) {
    const entry = await meta.get(key);
    if (entry) logs.push(entry);
  }
  logs.sort((a, b) => b.time.localeCompare(a.time));
  return c.json({ entries: logs });
});
moderationAdminRoutes.delete("/logs", async (c) => {
  const meta = createMetadataStore(c.env);
  let deleted = 0;
  let cursor;
  do {
    const { keys, cursor: next } = await meta.list(MODERATION_LOG_PREFIX, { limit: 1e3, cursor });
    if (keys.length > 0) {
      await meta.delete(keys);
      deleted += keys.length;
    }
    cursor = next;
  } while (cursor);
  return c.json({ ok: true, deleted });
});
moderationAdminRoutes.delete("/logs/:id", async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param("id");
  await meta.delete(MODERATION_LOG_PREFIX + id);
  return c.json({ ok: true });
});

// src/index.ts
var app = new Hono2();
app.use("/api/*", cors());
app.use("*", async (c, next) => {
  if (c.env.META_DB) {
    c.executionCtx.waitUntil(ensureD1Schema(c.env));
  }
  await next();
});
var DEMO_HOST = "demo.iodevo.com";
var isDemoHost = /* @__PURE__ */ __name((c) => (c.req.header("host") || "") === DEMO_HOST, "isDemoHost");
app.use("*", async (c, next) => {
  if (isDemoHost(c) && c.req.path === "/") {
    return c.html(renderDemo());
  }
  await next();
});
app.use("/api/upload/*", async (c, next) => {
  if (isDemoHost(c)) return c.json({ error: "\u6F14\u793A\u73AF\u5883\u7981\u6B62\u5B9E\u9645\u4E0A\u4F20\u6587\u4EF6" }, 403);
  await next();
});
app.use("/api/upload-public/*", async (c, next) => {
  if (isDemoHost(c)) return c.json({ error: "\u6F14\u793A\u73AF\u5883\u7981\u6B62\u5B9E\u9645\u4E0A\u4F20\u6587\u4EF6" }, 403);
  await next();
});
app.use("/api/*", async (c, next) => {
  if (isDemoHost(c) && c.req.method === "DELETE") {
    return c.json({ error: "\u6F14\u793A\u73AF\u5883\u7981\u6B62\u5220\u9664\u64CD\u4F5C" }, 403);
  }
  await next();
});
app.get("/login", (c) => c.html(renderLogin(c.env.TURNSTILE_SITE_KEY)));
app.get("/dashboard", (c) => c.html(renderDashboard(isDemoHost(c))));
app.get("/", (c) => c.html(renderDashboard(isDemoHost(c))));
app.get("/s/:token", (c) => c.html(renderSharePage(c.req.param("token"), c.env.TURNSTILE_SITE_KEY)));
app.get("/u/:keyId", (c) => c.html(renderUploadKeyPage(c.req.param("keyId"), c.env.TURNSTILE_SITE_KEY)));
app.get("/upload", (c) => c.html(renderPublicUploadPage(c.env.TURNSTILE_SITE_KEY)));
app.route("/api/auth", authRoutes);
app.route("/api/files", filesRoutes);
app.route("/api/upload", uploadRoutes);
app.route("/api/share", sharePublicRoutes);
app.route("/api/share", shareRoutes);
app.route("/api/download", downloadRoutes);
app.route("/api/upload-keys", uploadKeyPublicRoutes);
app.route("/api/upload-keys", uploadKeyRoutes);
app.route("/api/upload-public", uploadPublicRoutes);
app.route("/api/upload-logs", uploadLogRoutes);
app.route("/api/storage", storageConfigRoutes);
app.route("/api/moderation", moderationAdminRoutes);
app.route("/api/random", randomAdminRoutes);
app.route("/dav", webdavRoutes);
app.route("/random", randomRoutes);
var MIGRATION_PREFIXES = [
  "_config/",
  "_shares/",
  "_dl_logs/",
  "_ul_logs/",
  "_upload_keys/",
  "_multipart/",
  "_moderation_logs/"
];
app.post("/api/migration/r2-to-d1", jwtAuth, async (c) => {
  if (!c.env.META_DB) {
    return c.json({ error: "D1 \u672A\u914D\u7F6E\uFF08\u7F3A\u5C11 META_DB binding\uFF09" }, 400);
  }
  if (!c.env.DRIVE) {
    return c.json({ error: "R2 \u672A\u914D\u7F6E\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u6E90\u6570\u636E" }, 400);
  }
  const meta = createMetadataStore(c.env);
  if (meta.kind !== "d1") {
    return c.json({ error: "\u5F53\u524D MetadataStore \u4E0D\u662F D1 \u5B9E\u73B0" }, 400);
  }
  const stats = {};
  const errors = [];
  for (const prefix of MIGRATION_PREFIXES) {
    let count = 0;
    let cursor;
    do {
      const listed = await c.env.DRIVE.list({ prefix, limit: 1e3, cursor });
      for (const obj of listed.objects) {
        try {
          const data = await c.env.DRIVE.get(obj.key);
          if (!data) continue;
          const text = await data.text();
          const value = JSON.parse(text);
          const key = obj.key.endsWith(".json") ? obj.key.slice(0, -5) : obj.key;
          await meta.put(key, value);
          count++;
        } catch (e) {
          errors.push(`${obj.key}: ${e?.message || e}`);
        }
      }
      cursor = listed.truncated ? listed.cursor : void 0;
    } while (cursor);
    stats[prefix] = count;
  }
  await meta.put("_config/_migration_v1", {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    stats,
    errorCount: errors.length
  });
  return c.json({ ok: true, stats, errors: errors.slice(0, 20) });
});
app.get(
  "/robots.txt",
  (c) => c.text(`User-agent: *
Allow: /login
Allow: /s/*
Allow: /u/*
Allow: /upload
Disallow: /api/*
Disallow: /

Sitemap: https://drive.example.com/sitemap.xml`)
);
app.get("/sitemap.xml", async (c) => {
  try {
    const meta = createMetadataStore(c.env);
    const { keys } = await meta.list("_shares/", { limit: 1e3 });
    const urls = keys.map((key) => {
      const token = key.replace("_shares/", "").replace(".json", "");
      return `  <url><loc>https://drive.example.com/s/${token}</loc></url>`;
    }).join("\n");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://drive.example.com/login</loc></url>
${urls}
</urlset>`,
      { headers: { "Content-Type": "application/xml; charset=utf-8" } }
    );
  } catch {
    return new Response('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { "Content-Type": "application/xml; charset=utf-8" }
    });
  }
});
app.notFound((c) => c.text("Not Found", 404));
var index_default = app;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
