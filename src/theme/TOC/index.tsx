import React from 'react';
import clsx from 'clsx';
import TOCItems from '@theme/TOCItems';
import type {Props} from '@theme/TOC';
import styles from './styles.module.css';

export default function TOC({className, ...props}: Props): React.JSX.Element {
  return (
    <div className={clsx(styles.tableOfContents, 'thin-scrollbar', className)}>
      <TOCItems {...props} />
    </div>
  );
}
