import { TwitterOpenApi } from "twitter-openapi-typescript";

export const _xClient = async (TOKEN: string) => {
    console.log("🚀 ~ const_xClient= ~ TOKEN:", TOKEN)

    // convert to fetch 
    const resp = await fetch("https://x.com/manifest.json", {
        headers: {
            cookie: `auth_token=${TOKEN}`,
        },
    })

    const resCookie = resp.headers.getAll("set-cookie");
    const cookieObj = resCookie.reduce((acc: Record<string, string>, cookie: string) => {
        const [name, value] = cookie.split(";")[0].split("=");
        acc[name] = value;
        return acc;
    }, {});

    console.log("🚀 ~ cookieObj ~ cookieObj:", JSON.stringify(cookieObj, null, 2))

    const api = new TwitterOpenApi();
    const client = await api.getClientFromCookies({ ...cookieObj, auth_token: TOKEN });
    return client;
};

// 用于克隆响应体的工具函数
async function cloneResponse(response: Response): Promise<Response> {
    const clone = response.clone();
    // 如果响应体是JSON格式
    if (response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json();
        return new Response(JSON.stringify(body), {
            status: clone.status,
            statusText: clone.statusText,
            headers: clone.headers
        });
    }
    // 如果是其他格式（如文本）
    const body = await response.text();
    return new Response(body, {
        status: clone.status,
        statusText: clone.statusText,
        headers: clone.headers
    });
}

// 创建请求响应记录中间件
