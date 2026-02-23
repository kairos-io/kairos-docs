import React from 'react';
import {useFlavor} from '@site/src/context/flavor';

export default function FlavorCode(): React.JSX.Element {
  const {selection} = useFlavor();
  return <code>{selection.flavor}</code>;
}
