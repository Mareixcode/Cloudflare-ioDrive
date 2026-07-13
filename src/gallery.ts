import { Hono } from 'hono';
import type { Env, FileMeta } from './types';
import { createStorageEngine } from './storage-engine';

export const galleryRoutes = new Hono<{ Bindings: Env }>();

galleryRoutes.get('/list', async (c) => {
  try {
    const engine = await createStorageEngine(c.env);
    
    // Default gallery path. You can customize this or make it configurable via Env
    const prefix = 'gallery/'; 
    
    // We want to fetch all images recursively in the gallery folder, 
    // or just the top level. Let's do top level for simplicity, 
    // or we can remove the delimiter to get all images.
    // Given it's a gallery, recursive might be nice, but list with delimiter='' handles that.
    const listed = await engine.list(prefix, { limit: 1000 }); // limit to 1000 for safety

    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

    const files: FileMeta[] = listed.objects
      .filter((obj) => {
        if (obj.key.endsWith('/') || obj.key.startsWith('_')) return false;
        const lowerKey = obj.key.toLowerCase();
        return imageExts.some(ext => lowerKey.endsWith(ext));
      })
      .map((obj) => ({
        key: obj.key,
        name: obj.key.replace(prefix, ''),
        size: obj.size,
        uploaded: obj.uploaded || new Date().toISOString(),
        contentType: obj.contentType || 'image/jpeg',
      }))
      .sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

    // We can also return public URLs directly to make it easier for the frontend
    let r2Domain = c.env.PUBLIC_DOMAIN;
    const origin = new URL(c.req.url).origin;

    const items = files.map(f => {
      let url = '';
      if (r2Domain) {
        url = `https://${r2Domain}/${f.key.split('/').map(encodeURIComponent).join('/')}`;
      } else {
        url = `${origin}/f/${f.key}`;
      }
      return {
        ...f,
        url
      };
    });

    return c.json({ ok: true, items });
  } catch (err: any) {
    console.error('Gallery list error:', err);
    return c.json({ ok: false, error: '获取图库失败' }, 500);
  }
});
