import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import {useFlavor} from '@site/src/context/flavor';
import {buildKairosImageName} from '@site/src/components/kairos-image-name';

type ShortcodeCodeBlockProps = {
  language?: string;
  template: string;
};

const IMAGE_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*image\s+([^>]*?)\s*>\}\}/g;
const ATTRIBUTE_PATTERN = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"/g;

function parseAttributes(rawAttributes: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = ATTRIBUTE_PATTERN.exec(rawAttributes);
  while (match) {
    attrs[match[1]] = match[2];
    match = ATTRIBUTE_PATTERN.exec(rawAttributes);
  }
  return attrs;
}

function renderTemplate(
  template: string,
  flavor: string,
  flavorRelease: string,
): string {
  return template.replace(IMAGE_SHORTCODE_GLOBAL_PATTERN, (_full, rawAttrs) => {
    const attrs = parseAttributes(rawAttrs);
    if (!attrs.variant) {
      return _full;
    }

    return buildKairosImageName({
      variant: attrs.variant,
      arch: attrs.arch,
      model: attrs.model,
      suffix: attrs.suffix,
      kairosVersion: attrs.kairosVersion,
      k3sVersion: attrs.k3sVersion,
      flavor,
      flavorRelease,
    });
  });
}

export default function ShortcodeCodeBlock({
  language = 'text',
  template,
}: ShortcodeCodeBlockProps): React.JSX.Element {
  const {selection} = useFlavor();
  const content = renderTemplate(template, selection.flavor, selection.flavorRelease);

  return <CodeBlock language={language}>{content}</CodeBlock>;
}
