import { visit } from "unist-util-visit";
import type { Root, Text, PhrasingContent } from "mdast";

interface SmartLinksOptions {
  repoUrl?: string;
}

export function remarkSmartLinks(options: SmartLinksOptions = {}) {
  const { repoUrl } = options;

  return (tree: Root) => {
    if (!repoUrl) return;
    const base = repoUrl.replace(/\/+$/, "");

    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index == null) return;
      const parentType = parent.type as string;
      if (parentType === "link" || parentType === "code" || parentType === "inlineCode") return;

      const pattern = /(?:(?:PR|pull)\s+#(\d+))|(?:#(\d+))/g;
      const value = node.value;
      const children: PhrasingContent[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(value)) !== null) {
        // Text before match
        if (match.index > lastIndex) {
          children.push({ type: "text", value: value.slice(lastIndex, match.index) });
        }

        const prNum = match[1]; // PR/pull match
        const issueNum = match[2]; // plain #N match
        const num = prNum || issueNum;
        const isPR = !!prNum;

        children.push({
          type: "link",
          url: `${base}/${isPR ? "pull" : "issues"}/${num}`,
          children: [{ type: "text", value: match[0] }],
        });

        lastIndex = match.index + match[0].length;
      }

      if (children.length === 0) return;

      // Remaining text after last match
      if (lastIndex < value.length) {
        children.push({ type: "text", value: value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
}
