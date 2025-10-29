# Cloudflare Workers Proxy

这是一个基于 Cloudflare Workers 的简单反向代理脚本，用于将客户端的请求转发到目标地址，并将目标地址的响应返回给客户端。在使用本脚本之前，请务必详细阅读以下安全注意事项和免责声明，以确保使用脚本时的安全和法律合规性。

- 群聊: [HeroCore](https://t.me/HeroCore)
- 频道: [HeroMsg](https://t.me/HeroMsg)

## 简介

这个 Cloudflare Workers 脚本充当了一个反向代理，它的主要功能是接收客户端的请求，并将请求代理到目标地址，然后将目标地址的响应返回给客户端。具体功能包括：

- 代理客户端请求到目标地址。
- 修改响应中的相对路径为绝对路径，以确保资源的正确加载。
- 处理重定向并进行适当的修改，以保持资源路径的正确性。
- 添加 CORS 头部，以允许跨域访问。

## 如何部署

以下是部署 Cloudflare Workers 反向代理脚本的详细步骤：

1. 注册 Cloudflare 账户：如果您尚未拥有 Cloudflare 账户，请在 [Cloudflare 官方网站](https://www.cloudflare.com/) 上注册一个账户。

2. 创建 Workers 脚本：登录到 Cloudflare 账户后，进入 "Workers" 部分，创建一个新的 Workers 脚本。

3. 复制[worker.js](worker.js)：将提供的反向代理脚本粘贴到 Workers 编辑器中。

4. 保存并部署：保存脚本后，点击 "Deploy" 按钮，以部署您的 Workers 脚本。

5. 配置域名：在 Cloudflare 中，将您的域名与部署的 Workers 脚本关联。确保将流量路由到您的 Workers 脚本。

6. 测试：访问您的域名或者 Cloudflare Workers URL 会看到一个输入框，您可以在其中输入要代理的目标网站的 URL，然后点击 "进入代理" 按钮进行访问。

## 环境变量配置

本项目支持通过环境变量进行配置，以便更好地控制代理行为。

### WHITELIST_DOMAINS

- **描述**: 配置允许代理的域名白名单
- **格式**: 逗号分隔的域名列表
- **示例**: `example.com,google.com,github.com`
- **默认值**: 空（允许所有域名）
- **说明**: 
  - 如果设置了此变量，只有列表中的域名及其子域名会被允许代理
  - 如果未设置此变量，则允许所有域名（向后兼容）
  - 域名匹配支持精确匹配和子域名匹配，例如 `example.com` 会同时匹配 `example.com` 和 `sub.example.com`

### PORTAL_PAGE

- **描述**: 选择使用哪个页面作为门户页面
- **格式**: 字符串，可选值为 `"portal.html"` 或 `"nginx.html"`
- **示例**: `"nginx.html"`
- **默认值**: `"portal.html"`
- **说明**: 
  - 如果设置为 `"portal.html"`，将使用美观的代理界面（默认选项）
  - 如果设置为 `"nginx.html"`，将使用简单的 nginx 欢迎页面
  - 此环境变量允许用户根据需要选择不同的门户界面

### WHITELIST_EXEMPT_PATH

- **描述**: 配置白名单豁免路径，使用此路径前缀的请求将绕过白名单检查
- **格式**: 字符串，作为URL路径前缀
- **示例**: `"WHITE_PATH"`
- **默认值**: 空（不启用豁免功能）
- **说明**: 
  - 如果设置了此变量，所有以指定路径前缀开头的请求将绕过白名单检查
  - 这对于需要临时访问不在白名单中的网站或为特定用户提供无限制访问权限非常有用
  - 使用示例：如果设置为 `"WHITE_PATH"`，则 `https://your-worker.com/WHITE_PATH/https://github.com` 将直接代理到GitHub，无需检查GitHub是否在白名单中
  - 注意：请谨慎使用此功能，因为它可能会绕过您设置的安全限制

### 如何设置环境变量

在 Cloudflare Workers 中设置环境变量的方法：

1. **通过 Cloudflare Dashboard**:
   - 登录 Cloudflare Dashboard
   - 进入 Workers & Pages
   - 选择您的 Worker
   - 点击 "Settings" 标签
   - 在 "Environment Variables" 部分添加变量名和值

2. **通过 Wrangler CLI**:
   ```bash
   wrangler secret put WHITELIST_DOMAINS
   ```
   然后输入您的域名列表

3. **通过 wrangler.toml 配置**:
   ```toml
   [vars]
   WHITELIST_DOMAINS = "example.com,google.com"
   PORTAL_PAGE = "nginx.html"
   WHITELIST_EXEMPT_PATH = "WHITE_PATH"
   ```

## 使用方法

要使用此反向代理访问其他网站，请按照以下步骤操作：

### 基本使用方式

1. 发出请求：只需向您的 Cloudflare Workers URL 发出请求，将请求发送到目标网站。

   示例请求：`https://your-worker-url.com/https://example.com/`

   将 `your-worker-url.com` 替换为您的 Cloudflare Workers URL，`example.com` 替换为您要代理的目标网站的地址。

2. 使用参数方式（支持自定义请求头）：

   示例请求：`https://your-worker-url.com/?params={"target":"https://example.com","headers":{"user-agent":"Mozilla/5.0"}}`

   这种方式允许您指定目标URL和自定义请求头，以JSON格式提供参数。

3. 使用白名单豁免路径（绕过白名单检查）：

   示例请求：`https://your-worker-url.com/WHITE_PATH/https://github.com`

   如果设置了 `WHITELIST_EXEMPT_PATH` 环境变量为 `"WHITE_PATH"`，则所有以 `/WHITE_PATH/` 开头的请求将绕过白名单检查。

### 高级功能

1. 处理重定向

   反向代理脚本能够处理重定向并适当修改资源路径，以确保正确性。

2. 允许跨域请求

   反向代理添加了 CORS（跨源资源共享）头部，以允许跨域请求。这意味着您可以在前端 JavaScript 代码中从不同域（不同域名）发起请求，而不会受到浏览器的跨域安全限制。

3. 用户友好界面

   如果您未提供目标网站的 URL，此反向代理还提供了一个用户友好的界面。用户可以在此界面中输入目标网站的 URL，然后点击 "进入代理" 按钮，以便快速代理访问目标网站。

## 注意事项

- 请确保部署的 Workers 脚本在部署时是有效的，并且有足够的资源来处理请求。

- 请注意不要滥用该服务，确保只将它用于合法和合适的用途。

## 免责声明

- **责任限制**：作者不对脚本可能导致的任何安全问题、数据损失、服务中断、法律纠纷或其他损害负责。使用此脚本需自行承担风险。

- **不当使用**：使用者需了解，本脚本可能被用于非法活动或未经授权的访问。作者强烈反对和谴责任何不当使用脚本的行为，并鼓励合法合规的使用。

- **合法性**：请确保遵守所有适用的法律、法规和政策，包括但不限于互联网使用政策、隐私法规和知识产权法。确保您拥有对目标地址的合法权限。

- **自担风险**：使用此脚本需自行承担风险。作者和 Cloudflare 不对脚本的滥用、不当使用或导致的任何损害承担责任。

**此免责声明针对非中国大陆地区用户，如在中国大陆地区使用，需遵守相关地区法律法规，且由使用者自行承担相应风险与责任。**


## 资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers)
- [Cloudflare Workers 设置](https://developers.cloudflare.com/workers/platform/settings)

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")

## 许可证

本项目采用 MIT 许可证。详细信息请参阅 [LICENSE](LICENSE) 文件。

感谢您的使用！如果您对这个项目有任何改进或建议，也欢迎贡献代码或提出问题。
