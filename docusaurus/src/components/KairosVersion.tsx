import React from 'react';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

export default function KairosVersion(): React.JSX.Element {
  const {kairosVersion} = useVersionedCustomFields();
  const version = String(kairosVersion ?? 'master');
  return <>{version}</>;
}
