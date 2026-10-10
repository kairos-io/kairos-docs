import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useLocation} from '@docusaurus/router';
import SearchBar from '@theme/SearchBar';
import NavbarSearch from '@theme/Navbar/Search';
import {isDocsMobileSearchRoute} from '@site/src/utils/mobileNavbarSearch';
import type {Props} from '@theme/NavbarItem/SearchNavbarItem';

export default function SearchNavbarItem({
  mobile,
  className,
}: Props): ReactNode {
  if (mobile) {
    const {pathname} = useLocation();
    if (isDocsMobileSearchRoute(pathname)) {
      return null;
    }

    return (
      <li className={clsx('menu__list-item', 'navbar-sidebar__search-item')}>
        <NavbarSearch className={className}>
          <SearchBar />
        </NavbarSearch>
      </li>
    );
  }

  return (
    <NavbarSearch className={className}>
      <SearchBar />
    </NavbarSearch>
  );
}
