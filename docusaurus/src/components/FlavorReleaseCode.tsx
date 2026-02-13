import React from 'react';
import {useFlavor} from '@site/src/context/flavor';

export default function FlavorReleaseCode(): React.JSX.Element {
  const {selection} = useFlavor();
  return <code>{selection.flavorRelease}</code>;
}
