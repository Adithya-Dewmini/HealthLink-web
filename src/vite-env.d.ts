/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOBILE_APP_SCHEME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
