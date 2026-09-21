<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>Telkom School Futsal Cup Vol V</title>

        <link rel="icon" type="image/png" href="/icon.png">
        <link rel="preconnect" href="https://images.unsplash.com">
        <link rel="dns-prefetch" href="https://images.unsplash.com">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="bg-dark font-sans text-white antialiased selection:bg-brand selection:text-white">
        @inertia
    </body>
</html>
