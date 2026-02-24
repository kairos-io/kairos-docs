import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import FlavorSelectorNavbarItem from '@site/src/components/FlavorSelectorNavbarItem';
import GitHubStarsNavbarItem from '@site/src/components/GitHubStarsNavbarItem';

const ComponentTypesExtended = {
  ...ComponentTypes,
  'custom-flavorSelector': FlavorSelectorNavbarItem,
  'custom-githubStars': GitHubStarsNavbarItem,
};

export default ComponentTypesExtended;
