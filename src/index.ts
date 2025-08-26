#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

const manifestPath = path.join(
  process.cwd(),
  "react-component-library-master",
  "custom-elements.json"
);
let manifest: any = {};
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (e) {
  console.error("Could not load custom-elements.json:", e);
  manifest = { modules: [] };
}

function getComponentsFromManifest(manifest: any) {
  const components: any[] = [];
  for (const mod of manifest.modules || []) {
    for (const decl of mod.declarations || []) {
      if (decl.kind === "class") {
        let tag = "";
        if (mod.exports) {
          const exp = mod.exports.find(
            (e: any) =>
              e.declaration &&
              e.declaration.name === decl.name &&
              e.kind === "js"
          );
          if (exp && exp.declaration && exp.declaration.name) {
            tag = exp.declaration.name;
          }
        }

        if (!tag && decl.name) tag = decl.name;

        const props: Record<string, any> = {};
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
  private server: Server;
  private componentsList: any[];
  private tagIndex = new Map<string, number>();

  constructor() {
    this.server = new Server(
      {
        name: "component-server",
        version: "0.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.componentsList = getComponentsFromManifest(manifest);

    this.componentsList.forEach((comp: any, idx: number) => {
      const tag =
        comp && typeof comp.tag === "string" && comp.tag.length
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

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_component",
            description:
              "Get information about a frontend component by tag (returns full component object)",
            inputSchema: {
              type: "object",
              properties: {
                componentName: {
                  type: "string",
                  description:
                    "Component tag or numeric index (e.g. 'TestComponent' or '0')",
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
            description:
              "Fetch the .stories.tsx file for a component by tag or index",
            inputSchema: {
              type: "object",
              properties: {
                componentName: {
                  type: "string",
                  description:
                    "Component tag or numeric index (e.g. 'TestComponent' or '0')",
                },
              },
              required: ["componentName"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "get_component": {
          const componentNameRaw = request.params.arguments?.componentName;
          const lookup =
            typeof componentNameRaw === "string" ? componentNameRaw : "";

          const idx = this.resolveIndexForTag(lookup);
          if (idx === null) {
            return {
              content: [
                {
                  type: "text",
                  text: `Component "${lookup}" not found. Available tags: ${this.listTags().join(
                    ", "
                  )}`,
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
          const lookup =
            typeof componentNameRaw === "string" ? componentNameRaw : "";

          const idx = this.resolveIndexForTag(lookup);
          if (idx === null) {
            return {
              content: [
                {
                  type: "text",
                  text: `Component "${lookup}" not found. Available tags: ${this.listTags().join(
                    ", "
                  )}`,
                },
              ],
            };
          }

          const component = this.componentsList[idx];
          const tag = component?.tag ?? String(idx);

          const storiesPath = path.join(
            process.cwd(),
            "react-component-library-master",
            "src",
            tag,
            `${tag}.stories.tsx`
          );

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
          } catch (e: any) {
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
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool not found: ${request.params.name}`
          );
      }
    });
  }

  private resolveIndexForTag(input: string): number | null {
    if (!input) return null;

    if (this.tagIndex.has(input)) return this.tagIndex.get(input)!;

    const lower = input.toLowerCase();
    if (this.tagIndex.has(lower)) return this.tagIndex.get(lower)!;

    const n = Number(input);
    if (
      !Number.isNaN(n) &&
      Number.isInteger(n) &&
      n >= 0 &&
      n < this.componentsList.length
    ) {
      return n;
    }

    for (let i = 0; i < this.componentsList.length; i++) {
      const c = this.componentsList[i];
      if (c && typeof c.tag === "string") {
        if (c.tag === input || c.tag.toLowerCase() === lower) return i;
      }
    }

    return null;
  }

  private listTags(): string[] {
    return this.componentsList.map(
      (c: any, i: number) => (c && c.tag) || String(i)
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP server running on stdio");
  }
}

const server = new ComponentServer();
server.run().catch(console.error);
