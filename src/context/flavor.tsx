import React, {createContext, useContext, useMemo, useState} from 'react';

export type FlavorSelection = {
  family: string;
  flavor: string;
  flavorRelease: string;
  label: string;
};

export const FLAVOR_OPTIONS: FlavorSelection[] = [
  {family: 'alpine', flavor: 'alpine', flavorRelease: '3.19', label: 'Alpine 3.19'},
  {family: 'debian', flavor: 'debian', flavorRelease: 'bookworm', label: 'Debian Bookworm'},
  {family: 'debian', flavor: 'debian', flavorRelease: 'testing', label: 'Debian Testing'},
  {family: 'rhel', flavor: 'fedora', flavorRelease: '40', label: 'Fedora 40'},
  {family: 'opensuse', flavor: 'opensuse', flavorRelease: 'leap-15.6', label: 'openSUSE Leap-15.6'},
  {family: 'opensuse', flavor: 'opensuse', flavorRelease: 'tumbleweed', label: 'openSUSE Tumbleweed'},
  {family: 'rhel', flavor: 'rockylinux', flavorRelease: '9', label: 'Rockylinux 9'},
  {family: 'ubuntu', flavor: 'ubuntu', flavorRelease: '25.10', label: 'Ubuntu 25.10'},
  {family: 'ubuntu', flavor: 'ubuntu', flavorRelease: '24.04', label: 'Ubuntu 24.04'},
  {family: 'ubuntu', flavor: 'ubuntu', flavorRelease: '22.04', label: 'Ubuntu 22.04'},
  {family: 'ubuntu', flavor: 'ubuntu', flavorRelease: '20.04', label: 'Ubuntu 20.04'},
];

const DEFAULT_FLAVOR = FLAVOR_OPTIONS.find(
  (option) => option.flavor === 'ubuntu' && option.flavorRelease === '24.04',
) ?? FLAVOR_OPTIONS[0];

type FlavorContextValue = {
  selection: FlavorSelection;
  setSelection: (selection: FlavorSelection) => void;
};

const FlavorContext = createContext<FlavorContextValue>({
  selection: DEFAULT_FLAVOR,
  setSelection: () => {},
});

const STORAGE_KEY = 'selectedDistro';

function parseStoredSelection(raw: string | null): FlavorSelection | null {
  if (!raw) {
    return null;
  }

  const [family, flavor, flavorRelease] = raw.split(';');
  if (!family || !flavor || !flavorRelease) {
    return null;
  }

  return (
    FLAVOR_OPTIONS.find(
      (option) =>
        option.family === family &&
        option.flavor === flavor &&
        option.flavorRelease === flavorRelease,
    ) ?? null
  );
}

export function FlavorProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  const [selection, setSelectionState] = useState<FlavorSelection>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_FLAVOR;
    }
    return parseStoredSelection(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_FLAVOR;
  });

  const setSelection = (next: FlavorSelection): void => {
    setSelectionState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, `${next.family};${next.flavor};${next.flavorRelease}`);
    }
  };

  const value = useMemo(
    () => ({
      selection,
      setSelection,
    }),
    [selection],
  );

  return <FlavorContext.Provider value={value}>{children}</FlavorContext.Provider>;
}

export function useFlavor(): FlavorContextValue {
  return useContext(FlavorContext);
}
