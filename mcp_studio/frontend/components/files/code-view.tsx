"use client";
import * as React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

type Props = {
  content: string;
  language?: string;
};

export function CodeView({ content, language = "text" }: Props) {
  return (
    <div className="h-full">
      <SyntaxHighlighter
        language={language === "text" ? "plaintext" : language}
        style={oneDark}
        customStyle={{
          margin: 0,
          height: "100%",
          background: "transparent",
          fontSize: 13,
          padding: "1rem",
        }}
        showLineNumbers
        wrapLongLines
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}
