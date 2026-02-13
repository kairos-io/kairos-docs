import React from 'react';
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
  const selectedKey = optionKey(selection);

  return (
    <div className={`navbar__item ${mobile ? 'flavor-selector-mobile' : 'flavor-selector'} ${className ?? ''}`.trim()}>
      <select
        aria-label="Select flavor"
        className="flavor-selector-control"
        value={selectedKey}
        onChange={(event) => {
          const next = FLAVOR_OPTIONS.find((option) => optionKey(option) === event.target.value);
          if (next) {
            setSelection(next);
          }
        }}>
        {FLAVOR_OPTIONS.map((option) => (
          <option key={optionKey(option)} value={optionKey(option)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
