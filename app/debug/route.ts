// app/debug/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const files = ['all.json', 'trending.json', 'recommendations.json', 'schedule.json', 'meta.json'];
  const info: any = {
    status: 'ok',
    data_directory: dataDir,
    files: {},
  };

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const exists = fs.existsSync(filePath);
    info.files[file] = { exists };
    if (exists) {
      const stat = fs.statSync(filePath);
      info.files[file].size_kb = Math.round(stat.size / 1024);
      info.files[file].modified = stat.mtime.toISOString();
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (file === 'meta.json') {
          info.meta = content;
        } else if (Array.isArray(content.items)) {
          info.files[file].count = content.items.length;
          if (content.items.length > 0) {
            info.files[file].sample = content.items.slice(0, 3).map((i: any) => i.title);
          }
        }
      } catch (e) {
        info.files[file].parse_error = String(e);
      }
    }
  }

  info.node_env = process.env.NODE_ENV;
  info.vercel_region = process.env.VERCEL_REGION || 'local';

  return NextResponse.json({ success: true, debug: info });
}