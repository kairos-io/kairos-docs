import React from 'react';
import clsx from 'clsx';
import {FLAVOR_OPTIONS, useFlavor} from '@site/src/context/flavor';

type FlavorSelectorNavbarItemProps = {
  mobile?: boolean;
  className?: string;
};

function optionKey(option: {family: string; flavor: string; flavorRelease: string}): string {
  return `${option.family};${option.flavor};${option.flavorRelease}`;
}

export default function FlavorSelectorNavbarItem({
  mobile,
  className,
}: FlavorSelectorNavbarItemProps): React.JSX.Element {
  const {selection, setSelection} = useFlavor();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const selectedKey = optionKey(selection);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent | FocusEvent): void => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      setShowDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('focusin', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('focusin', handleClickOutside);
    };
  }, []);

  if (mobile) {
    return (
      <div className="menu__list-item">
        <div className="menu__link">Flavor: {selection.label}</div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className={clsx('navbar__item', 'dropdown', 'dropdown--hoverable', className, {
        'dropdown--show': showDropdown,
      })}>
      <a
        aria-haspopup="true"
        aria-expanded={showDropdown}
        role="button"
        href="#"
        className="navbar__link"
        onClick={(event) => {
          event.preventDefault();
          setShowDropdown((visible) => !visible);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            setShowDropdown((visible) => !visible);
          }
        }}>
        {selection.label}
      </a>
      <ul className="dropdown__menu">
        {FLAVOR_OPTIONS.map((option) => {
          const isActive = optionKey(option) === selectedKey;
          return (
            <li key={optionKey(option)}>
              <button
                type="button"
                className={clsx('dropdown__link', {'dropdown__link--active': isActive})}
                onClick={() => {
                  setSelection(option);
                  setShowDropdown(false);
                }}>
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
