import React from 'react';
import {useFlavor} from '@site/src/context/flavor';

type OnlyFlavorsProps = {
  onlyFlavors?: string;
  children: React.ReactNode;
};

function parseFlavors(raw: string): string[] {
  return String(raw)
    .split(',')
    .map((entry) => entry.replaceAll('+', ' ').trim())
    .filter(Boolean);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function OnlyFlavors({
  onlyFlavors = '',
  children,
}: OnlyFlavorsProps): React.JSX.Element {
  const {selection} = useFlavor();
  const allowedFlavors = parseFlavors(onlyFlavors);

  if (allowedFlavors.length === 0) {
    return <>{children}</>;
  }

  const selected = normalize(selection.label);
  const isCompatible = allowedFlavors.map(normalize).includes(selected);

  return (
    <>
      {!isCompatible && (
        <div className="alert alert--warning" style={{marginBottom: '0.75rem'}}>
          This example is compatible with {allowedFlavors.join(', ')}. Your current flavor is{' '}
          {selection.label}.
        </div>
      )}
      {children}
    </>
  );
}
