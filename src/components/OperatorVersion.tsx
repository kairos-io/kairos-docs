import React from 'react';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

export default function OperatorVersion(): React.JSX.Element {
  const {operatorVersion} = useVersionedCustomFields();
  return <>{operatorVersion}</>;
}
