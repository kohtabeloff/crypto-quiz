import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThirdwebProvider, metamaskWallet } from '@thirdweb-dev/react';
import { Base } from '@thirdweb-dev/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        activeChain={Base}
        supportedWallets={[metamaskWallet()]}
        clientId="177a8471292e57f33d77b3815c8550f7"
      >
        <App />
      </ThirdwebProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);


