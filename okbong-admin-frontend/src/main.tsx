import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import './style.css';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { adminRoutes } from '@/routes';

const router = createBrowserRouter(adminRoutes);
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root was not found in index.html');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>,
);
