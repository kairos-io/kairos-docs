import React from 'react';
import clsx from 'clsx';

type GitHubStarsNavbarItemProps = {
  className?: string;
  mobile?: boolean;
};

export default function GitHubStarsNavbarItem({
  className,
  mobile,
}: GitHubStarsNavbarItemProps): React.JSX.Element {
  if (mobile) {
    return (
      <a
        className={clsx('menu__link', className)}
        href="https://github.com/kairos-io/kairos"
        target="_blank"
        rel="noreferrer noopener">
        GitHub Stars
      </a>
    );
  }

  return (
    <a
      className={clsx('navbar__item', 'navbar__link', 'github-stars-link', className)}
      href="https://github.com/kairos-io/kairos"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Star kairos-io/kairos on GitHub">
      <img
        alt="GitHub Repo stars"
        src="https://img.shields.io/github/stars/kairos-io/kairos?style=social"
      />
    </a>
  );
}
