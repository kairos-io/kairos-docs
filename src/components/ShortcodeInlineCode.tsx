import React from 'react';
import {useFlavor} from '@site/src/context/flavor';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';
import {renderTemplate} from '@site/src/components/ShortcodeCodeBlock.render';

type ShortcodeInlineCodeProps = {
  template: string;
};

// The inline half of ShortcodeCodeBlock: same substitutions, rendered as a
// plain <code> span so it keeps looking like the inline code it was written
// as, rather than opening a fenced block in the middle of a sentence.
export default function ShortcodeInlineCode({
  template,
}: ShortcodeInlineCodeProps): React.JSX.Element {
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

  return <code>{content}</code>;
}
