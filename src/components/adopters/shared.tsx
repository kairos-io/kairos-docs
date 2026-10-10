import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

import {type AdopterItem, endUserAdopters, serviceProviderAdopters} from '../designs/content';

/** Renders the company's original, unmodified logo. */
export function AdopterLogo({
  adopter,
  className,
}: {
  adopter: AdopterItem;
  className?: string;
}): ReactNode {
  const base = useBaseUrl('/');
  return (
    <img
      src={`${base}${adopter.logo.replace(/^\//, '')}`}
      alt={`${adopter.name} logo`}
      className={className}
      loading="lazy"
    />
  );
}

export {endUserAdopters, serviceProviderAdopters};
