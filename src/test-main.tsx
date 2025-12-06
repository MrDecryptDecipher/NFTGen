import React from 'react';
import ReactDOM from 'react-dom/client';
import TestApp from './TestApp';

console.log('🧪 Loading NFTGen Test Application...');

// Create root and render test app
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);

console.log('🧪 Test application rendered successfully!');
