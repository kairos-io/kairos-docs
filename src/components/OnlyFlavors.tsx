import React from 'react';

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

export default function OnlyFlavors({
  onlyFlavors = '',
  children,
}: OnlyFlavorsProps): React.JSX.Element {
  const allowedFlavors = parseFlavors(onlyFlavors);

  if (allowedFlavors.length === 0) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
