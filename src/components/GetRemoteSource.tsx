import React, {useEffect, useMemo, useState} from 'react';
import CodeBlock from '@theme/CodeBlock';

type GetRemoteSourceProps = {
  url?: string;
};

function languageFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.includes('.') ? clean.slice(clean.lastIndexOf('.') + 1).toLowerCase() : '';
  if (!ext) {
    return 'text';
  }
  return ext;
}

export default function GetRemoteSource({url = ''}: GetRemoteSourceProps): React.JSX.Element {
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const language = useMemo(() => languageFromUrl(url), [url]);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setError('Missing URL');
      setContent('');
      return () => {
        cancelled = true;
      };
    }

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        if (cancelled) {
          return;
        }
        setContent(text);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setContent('');
        setError(err instanceof Error ? err.message : 'Failed to load remote source');
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <>
        <p>
          Could not load remote source from <a href={url}>{url}</a>: {error}
        </p>
      </>
    );
  }

  return <CodeBlock language={language}>{content}</CodeBlock>;
}
