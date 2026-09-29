type MarkdownNode = {
  type: string;
  lang?: string;
  value?: string;
  children?: MarkdownNode[];
};

type MarkdownTree = MarkdownNode;

const SUPPORTED_SHORTCODE_PATTERN = /(\{\{<\s*(Image\b[^>]*|OCI\b[^>]*|FlavorCode|FlavorReleaseCode|RegistryURL|KairosVersion|K3sVersion|K3sVersionOCI|ProviderVersion|KairosInitVersion|AuroraBootVersion|OperatorVersion|OperatorChartVersion|GoogleImage|OCITag)\s*>\}\}|<\s*ProviderVersion\s*\/>)/;

function visitAndTransform(node: MarkdownNode): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  for (let i = 0; i < node.children.length; i += 1) {
    const child = node.children[i];

    if (
      child.type === 'code' &&
      typeof child.value === 'string' &&
      SUPPORTED_SHORTCODE_PATTERN.test(child.value)
    ) {
      node.children[i] = {
        type: 'mdxJsxFlowElement',
        name: 'ShortcodeCodeBlock',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'language',
            value: child.lang ?? 'text',
          },
          {
            type: 'mdxJsxAttribute',
            name: 'template',
            value: child.value,
          },
        ],
        children: [],
      } as unknown as MarkdownNode;
      continue;
    }

    // Inline code carries the same shortcodes as a fenced block: prose that
    // names an image or a version writes it as `quay.io/kairos/kairos-init:{{<
    // KairosInitVersion >}}` in the middle of a sentence. Without this branch
    // the shortcode reaches the page verbatim and a reader who copies the
    // command gets an invalid reference. An inline node is phrasing content,
    // so it becomes a text element, not a flow one.
    if (
      child.type === 'inlineCode' &&
      typeof child.value === 'string' &&
      SUPPORTED_SHORTCODE_PATTERN.test(child.value)
    ) {
      node.children[i] = {
        type: 'mdxJsxTextElement',
        name: 'ShortcodeInlineCode',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'template',
            value: child.value,
          },
        ],
        children: [],
      } as unknown as MarkdownNode;
      continue;
    }

    visitAndTransform(child);
  }
}

export default function remarkShortcodeCode() {
  return (tree: MarkdownTree): void => {
    visitAndTransform(tree);
  };
}
