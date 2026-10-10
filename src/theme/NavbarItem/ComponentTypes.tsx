import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import FlavorSelectorNavbarItem from '@site/src/components/FlavorSelectorNavbarItem';
import GitHubStarsNavbarItem from '@site/src/components/GitHubStarsNavbarItem';
import ConditionalVersionDropdownNavbarItem from '@site/src/components/ConditionalVersionDropdownNavbarItem';

const ComponentTypesExtended = {
  ...ComponentTypes,
  'custom-flavorSelector': FlavorSelectorNavbarItem,
  'custom-githubStars': GitHubStarsNavbarItem,
  'custom-conditionalVersionDropdown': ConditionalVersionDropdownNavbarItem,
};

export default ComponentTypesExtended;
