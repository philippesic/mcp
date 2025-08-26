#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const manifestPath = path.join(process.cwd(), "react-component-library-master", "custom-elements.json");
let manifest = {};
try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}
catch (e) {
    console.error("Could not load custom-elements.json:", e);
    manifest = { modules: [] };
}
function getComponentsFromManifest(manifest) {
    const components = [];
    for (const mod of manifest.modules || []) {
        for (const decl of mod.declarations || []) {
            if (decl.kind === "class") {
                let tag = "";
                if (mod.exports) {
                    const exp = mod.exports.find((e) => e.declaration &&
                        e.declaration.name === decl.name &&
                        e.kind === "js");
                    if (exp && exp.declaration && exp.declaration.name) {
                        tag = exp.declaration.name;
                    }
                }
                if (!tag && decl.name)
                    tag = decl.name;
                const props = {};
                for (const member of decl.members || []) {
                    if (member.kind === "field") {
                        props[member.name] = {
                            type: member.type?.text ?? "unknown",
                            description: member.description ?? "",
                        };
                    }
                }
                components.push({
                    tag,
                    name: decl.name,
                    description: decl.description ?? "",
                    props,
                    modulePath: mod.path,
                });
            }
        }
    }
    return components;
}
class ComponentServer {
    server;
    componentsList;
    tagIndex = new Map();
    constructor() {
        this.server = new index_js_1.Server({
            name: "component-server",
            version: "0.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.componentsList = getComponentsFromManifest(manifest);
        this.componentsList.forEach((comp, idx) => {
            const tag = comp && typeof comp.tag === "string" && comp.tag.length
                ? comp.tag
                : String(idx);
            this.tagIndex.set(tag, idx);
            this.tagIndex.set(tag.toLowerCase(), idx);
            this.tagIndex.set(String(idx), idx);
        });
        this.setupHandlers();
        this.server.onerror = (error) => console.error("[Error]", error);
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "get_component",
                        description: "Get information about a frontend component by tag (returns full component object)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                componentName: {
                                    type: "string",
                                    description: "Component tag or numeric index (e.g. 'TestComponent' or '0')",
                                },
                            },
                            required: ["componentName"],
                        },
                    },
                    {
                        name: "list_components",
                        description: "List all available component tags",
                        inputSchema: {
                            type: "object",
                            properties: {},
                        },
                    },
                    {
                        name: "get_stories",
                        description: "Fetch the .stories.tsx file for a component by tag or index",
                        inputSchema: {
                            type: "object",
                            properties: {
                                componentName: {
                                    type: "string",
                                    description: "Component tag or numeric index (e.g. 'TestComponent' or '0')",
                                },
                            },
                            required: ["componentName"],
                        },
                    },
                ],
            };
        });
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case "get_component": {
                    const componentNameRaw = request.params.arguments?.componentName;
                    const lookup = typeof componentNameRaw === "string" ? componentNameRaw : "";
                    const idx = this.resolveIndexForTag(lookup);
                    if (idx === null) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Component "${lookup}" not found. Available tags: ${this.listTags().join(", ")}`,
                                },
                            ],
                        };
                    }
                    const component = this.componentsList[idx];
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(component, null, 2),
                            },
                        ],
                    };
                }
                case "list_components": {
                    const tags = this.listTags();
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(tags, null, 2),
                            },
                        ],
                    };
                }
                case "get_stories": {
                    const componentNameRaw = request.params.arguments?.componentName;
                    const lookup = typeof componentNameRaw === "string" ? componentNameRaw : "";
                    const idx = this.resolveIndexForTag(lookup);
                    if (idx === null) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Component "${lookup}" not found. Available tags: ${this.listTags().join(", ")}`,
                                },
                            ],
                        };
                    }
                    const component = this.componentsList[idx];
                    const tag = component?.tag ?? String(idx);
                    const storiesPath = path.join(process.cwd(), "react-component-library-master", "src", tag, `${tag}.stories.tsx`);
                    try {
                        const storiesContent = fs.readFileSync(storiesPath, "utf8");
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: storiesContent,
                                },
                            ],
                        };
                    }
                    catch (e) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Could not read stories file for "${tag}": ${e.message}`,
                                },
                            ],
                        };
                    }
                }
                default:
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Tool not found: ${request.params.name}`);
            }
        });
    }
    resolveIndexForTag(input) {
        if (!input)
            return null;
        if (this.tagIndex.has(input))
            return this.tagIndex.get(input);
        const lower = input.toLowerCase();
        if (this.tagIndex.has(lower))
            return this.tagIndex.get(lower);
        const n = Number(input);
        if (!Number.isNaN(n) &&
            Number.isInteger(n) &&
            n >= 0 &&
            n < this.componentsList.length) {
            return n;
        }
        for (let i = 0; i < this.componentsList.length; i++) {
            const c = this.componentsList[i];
            if (c && typeof c.tag === "string") {
                if (c.tag === input || c.tag.toLowerCase() === lower)
                    return i;
            }
        }
        return null;
    }
    listTags() {
        return this.componentsList.map((c, i) => (c && c.tag) || String(i));
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error("MCP server running on stdio");
    }
}
const server = new ComponentServer();
server.run().catch(console.error);
