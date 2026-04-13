import React from 'react';
import clsx from 'clsx';
import TOCItems from '@theme/TOCItems';
import type {Props} from '@theme/TOC';
import {useLocation} from '@docusaurus/router';
import ImageBuilderDrawer from '@site/src/components/builder/ImageBuilderDrawer';
import styles from './styles.module.css';

// Add pathname substrings here to show the Image Builder button in the TOC sidebar
const IMAGE_BUILDER_PAGES = ['/kairos-factory'];

export default function TOC({className, ...props}: Props): React.JSX.Element {
  const {pathname} = useLocation();
  const showImageBuilder = IMAGE_BUILDER_PAGES.some((path) => pathname.includes(path));

  return (
    <div className={clsx(styles.tableOfContents, 'thin-scrollbar', className)}>
      {showImageBuilder && <ImageBuilderDrawer />}
      <TOCItems {...props} />
    </div>
  );
}
