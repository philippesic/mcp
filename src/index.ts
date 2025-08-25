#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import components from "./components.json";

class ComponentServer {
  private server: Server;
  private componentsRaw = components as any;
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

    this.componentsList = Array.isArray(this.componentsRaw)
      ? this.componentsRaw.slice()
      : Object.values(this.componentsRaw);

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
                    "Component tag or numeric index (e.g. 'Button' or '0')",
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
                text:
                  JSON.stringify(component, null, 2) +
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
