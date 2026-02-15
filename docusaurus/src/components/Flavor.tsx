import React from 'react';
import {useFlavor} from '@site/src/context/flavor';

export default function Flavor(): React.JSX.Element {
  const {selection} = useFlavor();
  return <>{selection.flavor}</>;
}
