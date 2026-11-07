import React from 'react';
import { Toaster } from 'react-hot-toast';

/** App-wide toast host. Mounted once near the root. */
export default function ToastContainer() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#18181b',
          color: '#f4f4f5',
          border: '1px solid #3f3f46',
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#34d399', secondary: '#09090b' } },
        error: { iconTheme: { primary: '#fb7185', secondary: '#09090b' }, duration: 5000 },
      }}
    />
  );
}
