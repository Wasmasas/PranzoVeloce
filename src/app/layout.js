import './globals.css';
import { MenuProvider } from '../context/MenuContext';
import { ToastProvider } from '../context/ToastContext';
import FeedbackWidget from '../components/FeedbackWidget';

export const metadata = {
  title: 'PranzoVeloce',
  description: 'Ordina il tuo pranzo in anticipo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <ToastProvider>
          <MenuProvider>
            {children}
            <div style={{ zIndex: 9999 }}>
              {/* Dynamic import or just direct usage if it's client component */}
              <FeedbackWidget />
            </div>
          </MenuProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
