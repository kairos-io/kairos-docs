import React from 'react';
import clsx from 'clsx';

type SearchNavbarItemProps = {
  className?: string;
  mobile?: boolean;
};

function buildSearchPath(query: string): string {
  const params = new URLSearchParams({q: query});
  return `/search/?${params.toString()}`;
}

export default function SearchNavbarItem({
  className,
  mobile,
}: SearchNavbarItemProps): React.JSX.Element {
  const [query, setQuery] = React.useState('');

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      return;
    }
    window.location.href = buildSearchPath(term);
  };

  if (mobile) {
    return (
      <form className={clsx('menu__list-item', className)} onSubmit={onSubmit}>
        <input
          type="search"
          className="navbar-search-input"
          placeholder="Search docs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search documentation"
        />
      </form>
    );
  }

  return (
    <form className={clsx('navbar__item', 'navbar-search-form', className)} onSubmit={onSubmit}>
      <input
        type="search"
        className="navbar-search-input"
        placeholder="Search docs"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search documentation"
      />
    </form>
  );
}
