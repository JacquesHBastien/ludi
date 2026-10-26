import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import KillLab from './KillLab';
import '../ui/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KillLab />
  </StrictMode>,
);
