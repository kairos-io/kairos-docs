import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useLocation} from '@docusaurus/router';

type SearchEntry = {
  title: string;
  url: string;
  text: string;
};

type SearchData = {
  entries: SearchEntry[];
};

type ScoredEntry = SearchEntry & {
  score: number;
};

function getQuery(search: string): string {
  const params = new URLSearchParams(search);
  return (params.get('q') || '').trim();
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function score(entry: SearchEntry, tokens: string[]): number {
  const title = entry.title.toLowerCase();
  const text = entry.text.toLowerCase();
  let value = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      value += 10;
    }
    if (text.includes(token)) {
      value += 1;
    }
  }
  return value;
}

function snippet(text: string, max = 180): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trim()}...`;
}

export default function SearchPage(): React.JSX.Element {
  const location = useLocation();
  const {siteConfig} = useDocusaurusContext();
  const data = (usePluginData('local-search-index-plugin') as SearchData | undefined) ?? {
    entries: [],
  };

  const query = getQuery(location.search);
  const tokens = tokenize(query);

  const results = React.useMemo((): ScoredEntry[] => {
    if (tokens.length === 0) {
      return [];
    }
    return data.entries
      .map((entry) => ({...entry, score: score(entry, tokens)}))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }, [data.entries, tokens]);

  return (
    <Layout title={`Search | ${siteConfig.title}`} description="Search the documentation">
      <main className="container margin-vert--lg">
        <h1>Search</h1>
        {!query && <p>Use the search input in the navbar to search docs and blog content.</p>}
        {query && (
          <p>
            Results for <strong>{query}</strong>: {results.length}
          </p>
        )}
        {results.length > 0 && (
          <ul>
            {results.map((entry) => (
              <li key={entry.url}>
                <Link to={entry.url}>{entry.title}</Link>
                <div>{snippet(entry.text)}</div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Layout>
  );
}
