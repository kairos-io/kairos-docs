import React from 'react';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

export default function K3sVersion(): React.JSX.Element {
  const {k3sVersion} = useVersionedCustomFields();
  return <>{k3sVersion}</>;
}
