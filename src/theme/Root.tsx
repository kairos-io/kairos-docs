import React from 'react';
import type {Props} from '@theme/Root';
import {FlavorProvider} from '@site/src/context/flavor';

export default function Root({children}: Props): React.JSX.Element {
  return <FlavorProvider>{children}</FlavorProvider>;
}
