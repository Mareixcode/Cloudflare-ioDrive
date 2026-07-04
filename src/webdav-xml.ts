// WebDAV PROPFIND 响应 XML 生成
//
// 客户端（Windows 资源管理器、macOS Finder、RaiDrive 等）发起的 PROPFIND
// 请求需要返回 207 Multi-Status + 标准的 DAV: XML，列出目录/文件元数据。

export interface DavItem {
  /** 资源路径，相对于 WebDAV 根（不含前导 /，但 WebDAV 客户端通常需要带前导 /） */
  href: string;
  /** 是否为目录 */
  isCollection: boolean;
  /** 显示名 */
  displayName: string;
  /** 最后修改时间（HTTP-date 格式） */
  lastModified?: string;
  /** 文件大小（字节，目录为 0） */
  contentLength?: number;
  /** MIME 类型（文件） */
  contentType?: string;
  /** 创建时间（ISO 8601） */
  creationDate?: string;
}

const RFC822 = (d: Date) => d.toUTCString();

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 生成 207 Multi-Status 响应 XML
 * @param requestUri 当前请求的 URI（包含 query），用于相对路径计算
 * @param items 资源列表（含当前目录本身和子项）
 */
export function propfindResponse(requestUri: string, items: DavItem[]): string {
  const responses = items.map(item => {
    const href = item.href.startsWith('/') ? item.href : '/' + item.href;
    const props: string[] = [];

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
    if (!item.isCollection && item.contentLength !== undefined) {
      props.push(`<D:getcontentlength>${item.contentLength}</D:getcontentlength>`);
    }
    if (!item.isCollection && item.contentType) {
      props.push(`<D:getcontenttype>${xmlEscape(item.contentType)}</D:getcontenttype>`);
    }
    // ETag：基于路径 + 大小 + mtime
    const etag = `"${item.contentLength ?? 0}-${item.lastModified ?? ''}"`;
    props.push(`<D:getetag>${etag}</D:getetag>`);

    return `<D:response>
<D:href>${xmlEscape(href)}</D:href>
<D:propstat>
<D:prop>${props.join('')}</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses}
</D:multistatus>`;
}

/** 简单的成功 XML（用于 PROPPATCH 等） */
export function propstatOk(href: string): string {
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
