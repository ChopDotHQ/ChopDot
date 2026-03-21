import React from 'react';
import ReactDOM from 'react-dom/client';
import { SandboxApp } from './sandbox/SandboxApp';
import './index.css'; // Import Tailwind CSS
import './styles/globals.css'; // Import the design tokens

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SandboxApp />
    </React.StrictMode>
);
