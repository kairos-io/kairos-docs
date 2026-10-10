import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import {useFlavor} from '@site/src/context/flavor';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';
import {renderTemplate} from '@site/src/components/ShortcodeCodeBlock.render';

type ShortcodeCodeBlockProps = {
  language?: string;
  template: string;
};

export default function ShortcodeCodeBlock({
  language = 'text',
  template,
}: ShortcodeCodeBlockProps): React.JSX.Element {
  const {selection} = useFlavor();
  const {
    hadronFlavorRelease,
    registryURL,
    kairosVersion,
    k3sVersion,
    providerVersion,
    kairosInitVersion,
    auroraBootVersion,
    operatorVersion,
  } = useVersionedCustomFields();
  const content = renderTemplate({
    template,
    flavor: selection.flavor,
    flavorRelease: selection.flavorRelease,
    hadronFlavorRelease,
    registryURL,
    defaultKairosVersion: kairosVersion,
    defaultK3sVersion: k3sVersion,
    providerVersion,
    kairosInitVersion,
    auroraBootVersion,
    operatorVersion,
  });

  return <CodeBlock language={language}>{content}</CodeBlock>;
}
