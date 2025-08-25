#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const components_json_1 = __importDefault(require("./components.json"));
class ComponentServer {
    server;
    componentsRaw = components_json_1.default; // original JSON (array or object)
    componentsList; // flattened array of components
    tagIndex = new Map(); // tag -> index
    constructor() {
        this.server = new index_js_1.Server({
            name: "component-server",
            version: "0.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        // build a flattened list and tag->index map
        this.componentsList = Array.isArray(this.componentsRaw)
            ? this.componentsRaw.slice()
            : Object.values(this.componentsRaw);
        this.componentsList.forEach((comp, idx) => {
            const tag = comp && typeof comp.tag === "string" && comp.tag.length
                ? comp.tag
                : String(idx);
            this.tagIndex.set(tag, idx);
            this.tagIndex.set(tag.toLowerCase(), idx);
            // also allow lookup by string index
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
                                    description: "Component tag or numeric index (e.g. 'Button' or '0')",
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
                                text: JSON.stringify(component, null, 2) +
                                    "\nUsage note: the component name is defined in kebab-case (component-name), but should be called in PascalCase (ComponentName) in usage.",
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
                default:
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Tool not found: ${request.params.name}`);
            }
        });
    }
    resolveIndexForTag(input) {
        if (!input)
            return null;
        // direct map lookup (case-sensitive)
        if (this.tagIndex.has(input))
            return this.tagIndex.get(input);
        // case-insensitive
        const lower = input.toLowerCase();
        if (this.tagIndex.has(lower))
            return this.tagIndex.get(lower);
        // numeric index fallback
        const n = Number(input);
        if (!Number.isNaN(n) &&
            Number.isInteger(n) &&
            n >= 0 &&
            n < this.componentsList.length) {
            return n;
        }
        // final fallback: scan components' tag fields
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
