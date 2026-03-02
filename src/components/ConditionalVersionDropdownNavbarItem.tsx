import React from 'react';
import {useLocation} from '@docusaurus/router';
import DocsVersionDropdownNavbarItem from '@theme/NavbarItem/DocsVersionDropdownNavbarItem';
import clsx from 'clsx';

type ConditionalVersionDropdownNavbarItemProps = {
  /** Only show this dropdown when the current path is under this base (e.g. "docs" or "operator-docs") */
  routeBasePath: string;
  /** Optional label shown before the dropdown (e.g. "Kairos" or "Operator") */
  label?: string;
  mobile?: boolean;
  docsPluginId?: string;
  dropdownActiveClassDisabled?: boolean;
  className?: string;
  position?: 'left' | 'right';
};

export default function ConditionalVersionDropdownNavbarItem({
  routeBasePath,
  label,
  ...dropdownProps
}: ConditionalVersionDropdownNavbarItemProps): React.JSX.Element | null {
  const location = useLocation();
  const pathname = location.pathname;

  // Show only when viewing this plugin's docs
  const base = `/${routeBasePath}/`;
  const isActive =
    pathname === `/${routeBasePath}` ||
    pathname.startsWith(base);

  if (!isActive) {
    return null;
  }

  const dropdown = (
    <DocsVersionDropdownNavbarItem
      {...dropdownProps}
      dropdownItemsBefore={dropdownProps.dropdownItemsBefore ?? []}
      dropdownItemsAfter={dropdownProps.dropdownItemsAfter ?? []}
    />
  );

  if (!label) {
    return dropdown;
  }

  return (
    <div className={clsx('navbar__item', 'navbar__version-dropdown-with-label')}>
      <span className="navbar__version-label">{label}</span>
      {dropdown}
    </div>
  );
}
