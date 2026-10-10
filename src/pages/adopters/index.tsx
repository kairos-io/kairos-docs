import type {ReactNode} from 'react';
import Layout from '@theme/Layout';

import {AdoptersPageContent} from '../../components/adopters/AdoptersPageContent';

export default function AdoptersPage(): ReactNode {
  return (
    <Layout
      title="Kairos adopters"
      description="Organizations using Kairos in real environments — and how to become an adopter">
      <main>
        <AdoptersPageContent />
      </main>
    </Layout>
  );
}
