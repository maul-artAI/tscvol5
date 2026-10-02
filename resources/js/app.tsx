import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { FeedbackProvider } from './Components/Feedback';

const appName = import.meta.env.VITE_APP_NAME || 'TSC Cup';

createInertiaApp({
    title: (title) => (title ? `${title} | ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Provider di root agar useFeedback() bisa dipakai page mana pun
        // (page me-render AdminLayout sebagai anak, bukan sebaliknya).
        root.render(
            <FeedbackProvider>
                <App {...props} />
            </FeedbackProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
