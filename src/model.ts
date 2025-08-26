import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

async function testModel() {
  const client = new Client({ name: "gpt-4o-mini", version: "1.0.0" });

  const serverPath = path.join(process.cwd(), "build", "index.js");
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: Object.fromEntries(
      Object.entries(process.env).filter(([_, v]) => typeof v === "string")
    ) as Record<string, string>,
  });

  await client.connect(transport);

  const listResp = await client.request(
    { method: "tools/list", params: {} },
    z.any()
  );
  console.log("list tools ->", listResp);

  const getResp = await client.request(
    {
      method: "tools/call",
      params: {
        name: "get_component",
        arguments: { componentName: "TestComponent" },
      },
    },
    z.any()
  );
  console.log("get_component ->", getResp);

  const storiesResp = await client.request(
    {
      method: "tools/call",
      params: {
        name: "get_stories",
        arguments: { componentName: "TestComponent" },
      },
    },
    z.any()
  );
  console.log("get_stories ->", storiesResp);
}

testModel().catch(console.error);
