import ReactDOM from 'react-dom/client'
import App from './App';
import './App.css';
import { ThemeProvider } from './common/theme.jsx';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
      <ThemeProvider>
            <App />
      </ThemeProvider>
);
