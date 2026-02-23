import React from 'react';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

export default function ProviderVersion(): React.JSX.Element {
  const {providerVersion} = useVersionedCustomFields();
  return <>{String(providerVersion ?? 'latest')}</>;
}
