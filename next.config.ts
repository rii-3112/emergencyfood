import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 親ディレクトリに別の package-lock があると Next がワークスペースルートを誤認するため明示する */
const projectDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectDir,
  turbopack: {
    root: projectDir,
  },
  // SSG対応の最適化
  output: 'standalone',

  // 画像最適化
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // 圧縮とキャッシュ最適化
  compress: true,

  // 静的ページの生成設定は削除（無効なオプション）

  // パフォーマンス最適化
  experimental: {
    optimizePackageImports: ['@/components', '@/utils', '@/hooks'],
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
