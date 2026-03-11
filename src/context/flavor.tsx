import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

export type FlavorSelection = {
  family: string;
  flavor: string;
  flavorRelease: string;
  label: string;
};

const DEFAULT_FLAVOR: FlavorSelection = {
  family: 'ubuntu',
  flavor: 'ubuntu',
  flavorRelease: '24.04',
  label: 'Ubuntu 24.04',
};

type FlavorContextValue = {
  selection: FlavorSelection;
  setSelection: (selection: FlavorSelection) => void;
};

const FlavorContext = createContext<FlavorContextValue>({
  selection: DEFAULT_FLAVOR,
  setSelection: () => {},
});

function optionKey(option: Pick<FlavorSelection, 'family' | 'flavor' | 'flavorRelease'>): string {
  return `${option.family};${option.flavor};${option.flavorRelease}`;
}

function parseStoredSelection(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const [family, flavor, flavorRelease] = raw.split(';');
  if (!family || !flavor || !flavorRelease) {
    return null;
  }

  return `${family};${flavor};${flavorRelease}`;
}

export function FlavorProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  const [selection, setSelectionState] = useState<FlavorSelection>(DEFAULT_FLAVOR);

  const setSelection = (next: FlavorSelection): void => {
    setSelectionState(next);
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
  const context = useContext(FlavorContext);
  const {docsVersion, flavorOptions} = useVersionedCustomFields();
  const storageKey = `selectedDistro:${docsVersion}`;

  useEffect(() => {
    if (typeof window === 'undefined' || flavorOptions.length === 0) {
      return;
    }

    const storedKey = parseStoredSelection(window.localStorage.getItem(storageKey));
    const nextSelection =
      (storedKey && flavorOptions.find((option) => optionKey(option) === storedKey)) ?? flavorOptions[0];

    if (optionKey(context.selection) !== optionKey(nextSelection)) {
      context.setSelection(nextSelection);
    }
  }, [context, flavorOptions, storageKey]);

  const selected =
    flavorOptions.find((option) => optionKey(option) === optionKey(context.selection)) ??
    flavorOptions[0] ??
    context.selection;

  const setSelection = (next: FlavorSelection): void => {
    const nextSelection =
      flavorOptions.find((option) => optionKey(option) === optionKey(next)) ?? flavorOptions[0] ?? selected;

    context.setSelection(nextSelection);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, optionKey(nextSelection));
    }
  };

  return {
    selection: selected,
    setSelection,
  };
}
