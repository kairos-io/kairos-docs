import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import SearchBar from '@theme/SearchBar';
import NavbarSearch from '@theme/Navbar/Search';
import type {Props} from '@theme/NavbarItem/SearchNavbarItem';

export default function SearchNavbarItem({
  mobile,
  className,
}: Props): ReactNode {
  if (mobile) {
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
