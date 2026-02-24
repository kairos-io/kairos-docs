import React from 'react';
import Layout from '@theme/Layout';

export default function GettingStartedRedirect(): React.JSX.Element {
  React.useEffect(() => {
    window.location.replace('/quickstart/');
  }, []);

  return (
    <Layout title="Redirecting to Quick Start">
      <main style={{padding: '2rem 1rem'}}>
        <p>
          Getting Started has moved to <a href="/quickstart/">Quick Start</a>.
        </p>
      </main>
    </Layout>
  );
}
