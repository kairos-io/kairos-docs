import MDXComponents from '@theme-original/MDXComponents';
import type {MDXComponentsObject} from '@theme/MDXComponents';
import FlavorCode from '@site/src/components/FlavorCode';
import FlavorReleaseCode from '@site/src/components/FlavorReleaseCode';
import Image from '@site/src/components/Image';
import ImageLink from '@site/src/components/ImageLink';
import ShortcodeCodeBlock from '@site/src/components/ShortcodeCodeBlock';

const components: MDXComponentsObject = {
  ...MDXComponents,
  FlavorCode,
  FlavorReleaseCode,
  Image,
  ImageLink,
  ShortcodeCodeBlock,
};

export default components;
