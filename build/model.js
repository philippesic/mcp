"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const zod_1 = require("zod");
async function testModel() {
    const client = new index_js_1.Client({ name: "gpt-4o-mini", version: "1.0.0" });
    const serverPath = path_1.default.join(process.cwd(), "build", "index.js");
    const transport = new stdio_js_1.StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: Object.fromEntries(Object.entries(process.env).filter(([_, v]) => typeof v === "string")),
    });
    await client.connect(transport);
    const listResp = await client.request({ method: "tools/list", params: {} }, zod_1.z.any());
    console.log("list tools ->", listResp);
    const getResp = await client.request({
        method: "tools/call",
        params: {
            name: "get_component",
            arguments: { componentName: "Button" },
        },
    }, zod_1.z.any());
    console.log("get_component ->", getResp);
}
testModel().catch(console.error);
