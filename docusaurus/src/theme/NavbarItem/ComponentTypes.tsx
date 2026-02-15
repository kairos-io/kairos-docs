import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import FlavorSelectorNavbarItem from '@site/src/components/FlavorSelectorNavbarItem';
import GitHubStarsNavbarItem from '@site/src/components/GitHubStarsNavbarItem';
import SearchNavbarItem from '@site/src/components/SearchNavbarItem';

const ComponentTypesExtended = {
  ...ComponentTypes,
  'custom-flavorSelector': FlavorSelectorNavbarItem,
  'custom-githubStars': GitHubStarsNavbarItem,
  'custom-search': SearchNavbarItem,
};

export default ComponentTypesExtended;
