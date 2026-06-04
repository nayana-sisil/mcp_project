import sys
import gradio as gr
from transformers import pipeline
from mcp_http_client_base import MCPHTTPClient


class MCPHTTPHostApp(MCPHTTPClient):
    """AI host application using local FLAN-T5 + MCP tools."""

    def __init__(self, server_url: str, roots_dir: str):
        super().__init__(server_url, roots_dir)

        self.conversation_history = []

        # FREE LOCAL MODEL (no API needed)
        self.generator = pipeline("text2text-generation", model="google/flan-t5-small")

    async def get_available_tools(self):
        await self.connect()

        mcp_tools = await self.list_tools()
        openai_tools = []

        for tool in mcp_tools:
            tool_schema = {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description or tool.name,
                    "parameters": {"type": "object", "properties": {}},
                },
            }

            if hasattr(tool, "inputSchema") and tool.inputSchema:
                schema = tool.inputSchema
                if isinstance(schema, dict):
                    tool_schema["function"]["parameters"]["properties"] = schema.get(
                        "properties", {}
                    )
                    if "required" in schema:
                        tool_schema["function"]["parameters"]["required"] = schema[
                            "required"
                        ]

            openai_tools.append(tool_schema)

        return openai_tools

    async def execute_tool(self, tool_name: str, arguments: dict):
        await self.connect()

        try:
            result = await self.call_tool(tool_name, arguments)

            if isinstance(result, list) and len(result) > 0:
                content = result[0]
                if hasattr(content, "text"):
                    return content.text
                return str(content)

            return str(result)

        except Exception as e:
            return f"Tool error: {str(e)}"

    async def chat(self, user_message: str, history: list):
        await self.connect()

        self.conversation_history.append({"role": "user", "content": user_message})

        prompt = f"""
You are a helpful assistant.

User: {user_message}
Assistant:
"""

        result = self.generator(prompt, max_length=256, do_sample=True)
        response = result[0]["generated_text"]

        if "Assistant:" in response:
            response = response.split("Assistant:")[-1].strip()

        self.conversation_history.append({"role": "assistant", "content": response})

        return response

    def create_interface(self):

        def chat_wrapper(message, history):
            if not message.strip():
                return history

            import asyncio

            response = asyncio.run(self.chat(message, history))

            return history + [
                {"role": "user", "content": message},
                {"role": "assistant", "content": response},
            ]

        def reset_conversation():
            self.conversation_history = []
            return []

        with gr.Blocks(title="MCP HTTP AI Host") as interface:
            gr.Markdown(f"""
# MCP HTTP AI Host

Server: {self.server_url}  
Workspace: {self.roots_dir}  
Model: FLAN-T5 Small (Free Local Model)
""")

            chatbot = gr.Chatbot(type="messages", height=500)

            with gr.Row():
                msg = gr.Textbox(placeholder="Ask something...", scale=4)
                clear = gr.Button("Clear")

            msg.submit(chat_wrapper, inputs=[msg, chatbot], outputs=chatbot).then(
                lambda: "", outputs=msg
            )

            clear.click(reset_conversation, outputs=chatbot)

        return interface


def main():
    if len(sys.argv) < 3:
        print("Usage: python mcp_http_host_app.py <server_url> <roots_dir>")
        sys.exit(1)

    server_url = sys.argv[1]
    roots_dir = sys.argv[2]

    app = MCPHTTPHostApp(server_url, roots_dir)
    interface = app.create_interface()

    interface.launch(server_name="127.0.0.1", server_port=7862)


if __name__ == "__main__":
    main()
