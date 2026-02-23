type MarkdownNode = {
  type: string;
  lang?: string;
  value?: string;
  children?: MarkdownNode[];
};

type MarkdownTree = MarkdownNode;

const SUPPORTED_SHORTCODE_PATTERN = /(\{\{<\s*(image\b[^>]*|oci\b[^>]*|flavorCode|flavorReleaseCode|registryURL|kairosVersion|providerVersion|kairosInitVersion|auroraBootVersion)\s*>\}\}|<\s*ProviderVersion\s*\/>)/;

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

    visitAndTransform(child);
  }
}

export default function remarkShortcodeCode() {
  return (tree: MarkdownTree): void => {
    visitAndTransform(tree);
  };
}
