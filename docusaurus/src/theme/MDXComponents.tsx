import MDXComponents from '@theme-original/MDXComponents';
import type {MDXComponentsObject} from '@theme/MDXComponents';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Flavor from '@site/src/components/Flavor';
import FlavorCode from '@site/src/components/FlavorCode';
import FlavorRelease from '@site/src/components/FlavorRelease';
import FlavorReleaseCode from '@site/src/components/FlavorReleaseCode';
import ContainerRepoLink from '@site/src/components/ContainerRepoLink';
import GetRemoteSource from '@site/src/components/GetRemoteSource';
import Image from '@site/src/components/Image';
import ImageLink from '@site/src/components/ImageLink';
import KairosVersion from '@site/src/components/KairosVersion';
import OciCode from '@site/src/components/OciCode';
import ProviderVersion from '@site/src/components/ProviderVersion';
import ShortcodeCodeBlock from '@site/src/components/ShortcodeCodeBlock';

const components: MDXComponentsObject = {
  ...MDXComponents,
  Tabs,
  TabItem,
  Flavor,
  FlavorCode,
  FlavorRelease,
  FlavorReleaseCode,
  ContainerRepoLink,
  GetRemoteSource,
  Image,
  ImageLink,
  KairosVersion,
  OciCode,
  ProviderVersion,
  ShortcodeCodeBlock,
};

export default components;
