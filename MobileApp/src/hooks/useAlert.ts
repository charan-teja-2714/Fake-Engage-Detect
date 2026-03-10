import { useState } from 'react';

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  return { alert, showAlert, hideAlert };
}
