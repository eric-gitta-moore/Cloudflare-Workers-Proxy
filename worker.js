export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};

// 获取域名白名单配置 - 支持环境变量和默认配置
function getDomainWhitelist(env) {
  // 优先使用环境变量 WHITELIST_DOMAINS（逗号分隔）
  const whitelist = env?.WHITELIST_DOMAINS;
  if (whitelist) {
    return whitelist.split(',').map(domain => domain.trim().toLowerCase()).filter(Boolean);
  }
  // 默认白名单空，即放行所有
  return [];
}

// 获取门户页面配置 - 支持环境变量和默认配置
function getPortalPage(env) {
  // 优先使用环境变量 PORTAL_PAGE，默认为 portal.html
  return env?.PORTAL_PAGE || 'portal.html';
}

async function handleRequest(request, env, ctx) {
  try {
      const url = new URL(request.url);

      // 如果访问根目录，返回 HTML
      if (url.pathname === "/" && !url.searchParams.has('params')) {
          return new Response(await getRootHtml(env), {
              headers: {
                  'Content-Type': 'text/html; charset=utf-8'
              }
          });
      }

      // 从请求路径中提取目标 URL（原有方式）
      let actualUrlStr = decodeURIComponent(url.pathname.replace("/", ""));
      // params query 重写请求头
      let overrideHeaders = {}

      // 检查是否使用新的参数方式
      if (url.searchParams.has('params')) {
        try {
          const params = JSON.parse(url.searchParams.get('params'));
          if (!params.target) {
            return jsonResponse({
              error: 'Missing target URL in params'
            }, 400);
          }
          
          actualUrlStr = params.target;
          Object.assign(overrideHeaders, params.headers)
        } catch (error) {
          return jsonResponse({
            error: 'Invalid params format: ' + error.message
          }, 400);
        }
      }


      // 判断用户输入的 URL 是否带有协议
      actualUrlStr = ensureProtocol(actualUrlStr, url.protocol);

      // 检查域名是否在白名单中
      const domainWhitelist = getDomainWhitelist(env);
      if (!isDomainWhitelisted(actualUrlStr, domainWhitelist)) {
        return jsonResponse({
          error: 'Access denied: Domain not in whitelist'
        }, 403);
      }

      // 保留查询参数
      actualUrlStr += url.search;

      // 创建新 Headers 对象，排除以 'cf-' 开头的请求头
      const newHeaders = filterHeaders(request.headers, name => !name.startsWith('cf-'));

      // 创建一个新的请求以访问目标 URL
      const modifiedRequest = new Request(actualUrlStr, {
          headers: { ...newHeaders, ...overrideHeaders },
          method: request.method,
          body: request.body,
          redirect: 'manual'
      });

      // 发起对目标 URL 的请求
      const response = await fetch(modifiedRequest);
      let body = response.body;

      // 处理重定向
      if ([301, 302, 303, 307, 308].includes(response.status)) {
          body = response.body;
          // 创建新的 Response 对象以修改 Location 头部
          return handleRedirect(response, body);
      } else if (response.headers.get("Content-Type")?.includes("text/html")) {
          body = await handleHtmlContent(response, url.protocol, url.host, actualUrlStr);
      }

      // 创建修改后的响应对象
      const modifiedResponse = new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
      });

      // 添加禁用缓存的头部
      setNoCacheHeaders(modifiedResponse.headers);

      // 添加 CORS 头部，允许跨域访问
      setCorsHeaders(modifiedResponse.headers);

      return modifiedResponse;
  } catch (error) {
      // 如果请求目标地址时出现错误，返回带有错误消息的响应和状态码 500（服务器错误）
      return jsonResponse({
          error: error.message
      }, 500);
  }
}

// 确保 URL 带有协议
function ensureProtocol(url, defaultProtocol) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : defaultProtocol + "//" + url;
}

// 检查域名是否在白名单中
function isDomainWhitelisted(url, whitelist) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 如果白名单为空，允许所有域名（向后兼容）
    if (whitelist.length === 0) {
      return true;
    }
    
    return whitelist.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch (error) {
    return false;
  }
}

// 处理重定向
function handleRedirect(response, body) {
  const location = new URL(response.headers.get('location'));
  const modifiedLocation = `/${encodeURIComponent(location.toString())}`;
  return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
          ...response.headers,
          'Location': modifiedLocation
      }
  });
}

// 处理 HTML 内容中的相对路径
async function handleHtmlContent(response, protocol, host, actualUrlStr) {
  const originalText = await response.text();
  const regex = new RegExp('((href|src|action)=["\'])/(?!/)', 'g');
  let modifiedText = replaceRelativePaths(originalText, protocol, host, new URL(actualUrlStr).origin);

  return modifiedText;
}

// 替换 HTML 内容中的相对路径
function replaceRelativePaths(text, protocol, host, origin) {
  const regex = new RegExp('((href|src|action)=["\'])/(?!/)', 'g');
  return text.replace(regex, `$1${protocol}//${host}/${origin}/`);
}

// 返回 JSON 格式的响应
function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
      status: status,
      headers: {
          'Content-Type': 'application/json; charset=utf-8'
      }
  });
}

// 过滤请求头
function filterHeaders(headers, filterFunc) {
  return new Headers([...headers].filter(([name]) => filterFunc(name)));
}

// 设置禁用缓存的头部
function setNoCacheHeaders(headers) {
  headers.set('Cache-Control', 'no-store');
}

// 设置 CORS 头部
function setCorsHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  headers.set('Access-Control-Allow-Headers', '*');
}

// 返回根目录的 HTML
async function getRootHtml(env) {
  const portalPage = getPortalPage(env);
  
  if (portalPage === 'nginx.html') {
    return import('./nginx.html').then(module => module.default);
  } else {
    // 默认返回 portal.html
    return import('./portal.html').then(module => module.default);
  }
}
