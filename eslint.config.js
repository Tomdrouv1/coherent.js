export default [
    {
        files: [
            'src/**/*.js', 
            'tests/**/*.js', 
            'examples/**/*.js',
            'packages/**/*.js',
            'scripts/**/*.js',
            'website/**/*.js'
        ],
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '**/*.min.js'
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Node.js globals
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                setImmediate: 'readonly',
                clearImmediate: 'readonly',
                performance: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                WebSocket: 'readonly',
                Response: 'readonly',
                globalCache: 'readonly',
                isStaticElement: 'readonly',
                // Universal/shared globals
                renderToStream: 'readonly',
                DatabaseManager: 'readonly',
                context: 'readonly',
                path: 'readonly',
                // Browser globals (for universal code)
                window: 'readonly',
                document: 'readonly',
                location: 'readonly',
                Node: 'readonly'
            }
        },
        rules: {
            // Variables
            'no-unused-vars': ['warn', { 
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_' 
            }],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-undef': 'error',
            
            // Code style
            'no-console': 'off', // Allow console for server-side code
            'no-debugger': 'error',
            'no-alert': 'error',
            
            // Best practices
            'eqeqeq': ['error', 'always'],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            
            // ES6+
            'arrow-spacing': 'error',
            'no-duplicate-imports': 'error',
            'prefer-arrow-callback': 'off',
            'prefer-template': 'warn',
            
            // Async/await
            'require-await': 'off', // Too noisy for examples
            'no-async-promise-executor': 'error',
            
            // Error prevention
            'no-unreachable': 'error',
            'no-constant-condition': 'error',
            'valid-typeof': 'error'
        }
    },
    {
        // Core package - isomorphic code needs both Node and browser globals
        files: ['packages/core/**/*.js'],
        languageOptions: {
            globals: {
                // Browser APIs used in isomorphic code
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                indexedDB: 'readonly',
                IntersectionObserver: 'readonly',
                MutationObserver: 'readonly',
                requestIdleCallback: 'readonly',
                CustomEvent: 'readonly',
                FormData: 'readonly',
                btoa: 'readonly',
                atob: 'readonly',
                BroadcastChannel: 'readonly',
                alert: 'readonly',
                event: 'readonly'
            }
        },
        rules: {
            'no-alert': 'off' // Allow alert in tests
        }
    },
    {
        // Browser-specific rules for client package
        files: ['packages/client/**/*.js', 'src/client/**/*.js'],
        languageOptions: {
            globals: {
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                location: 'readonly',
                Node: 'readonly',
                path: 'readonly',
                context: 'readonly',
                renderToStream: 'readonly',
                DatabaseManager: 'readonly'
            }
        },
        rules: {
            'no-restricted-globals': ['error', 'process', 'Buffer', '__dirname', '__filename']
        }
    },
    {
        // i18n, forms, performance, runtime packages - isomorphic code
        files: ['packages/i18n/**/*.js', 'packages/forms/**/*.js', 'packages/performance/**/*.js', 'packages/runtime/**/*.js', 'packages/nextjs/**/*.js'],
        languageOptions: {
            globals: {
                // Browser APIs
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                IntersectionObserver: 'readonly',
                requestIdleCallback: 'readonly',
                Image: 'readonly',
                AbortController: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                // Performance APIs
                performance: 'readonly',
                performanceMonitor: 'readonly'
            }
        }
    },
    {
        // Web Components - needs all browser globals
        files: ['packages/web-components/**/*.js'],
        languageOptions: {
            globals: {
                window: 'readonly',
                document: 'readonly',
                HTMLElement: 'readonly',
                customElements: 'readonly',
                CustomEvent: 'readonly',
                Element: 'readonly',
                Document: 'readonly',
                MutationObserver: 'readonly',
                FormData: 'readonly',
                requestAnimationFrame: 'readonly'
            }
        },
        rules: {
            'no-new-func': 'off', // Allow Function constructor for dynamic components
            'no-unused-vars': ['warn', { 
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_' 
            }]
        }
    },
    {
        // Runtime package - needs multiple environment globals
        files: ['packages/runtime/**/*.js'],
        languageOptions: {
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                HTMLElement: 'readonly',
                customElements: 'readonly',
                Image: 'readonly',
                FontFace: 'readonly',
                DOMParser: 'readonly',
                // Runtime-specific globals
                EdgeRuntime: 'readonly',
                Deno: 'readonly',
                Bun: 'readonly',
                caches: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                addEventListener: 'readonly',
                fetch: 'readonly',
                WebSocket: 'readonly',
                Worker: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                indexedDB: 'readonly',
                crypto: 'readonly',
                ReadableStream: 'readonly',
                IntersectionObserver: 'readonly',
                MutationObserver: 'readonly',
                requestAnimationFrame: 'readonly',
                requestIdleCallback: 'readonly'
            }
        },
        rules: {
            'no-new-func': 'off' // Runtime detection may need Function constructor
        }
    },
    {
        // Framework Adapters - needs flexible rules for framework integration
        files: ['packages/adapters/**/*.js', 'packages/build-tools/**/*.js'],
        languageOptions: {
            globals: {
                // Common framework globals
                React: 'readonly',
                process: 'readonly',
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                // Build tool globals
                webpack: 'readonly',
                // Web APIs that adapters might use
                Request: 'readonly',
                Response: 'readonly',
                Headers: 'readonly',
                FormData: 'readonly',
                fetch: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { 
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_' 
            }],
            'no-undef': 'warn', // More lenient for framework integration code
            'no-new-func': 'off' // May need Function constructor for dynamic integration
        }
    },
    {
        // Components files need browser globals
        files: ['src/components/**/*.js'],
        languageOptions: {
            globals: {
                localStorage: 'readonly'
            }
        }
    },
    {
        // Examples - more lenient rules
        files: ['examples/**/*.js'],
        languageOptions: {
            globals: {
                NextUserPage: 'readonly',
                hashPassword: 'readonly',
                db: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'off',
            'prefer-template': 'off',
            'prefer-const': 'warn',
            'no-debugger': 'off',
            'no-undef': 'off'
        }
    },
    {
        // Scripts - more lenient for build scripts
        files: ['scripts/**/*.js'],
        rules: {
            'no-unused-vars': 'off'
        }
    },
    {
        // Test files
        files: ['**/*.test.js', '**/test/**/*.js'],
        languageOptions: {
            globals: {
                test: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                before: 'readonly',
                after: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly'
            }
        },
        rules: {
            'no-unused-expressions': 'off' // Allow assertions in tests
        }
    }
];
