'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Product } from '@/app/portal/services/context';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | undefined;
  onSuccess: () => void;
  product?: Product | null;
}

const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      if (file.type === 'image/svg+xml') {
        resolve(e.target?.result as string);
        return;
      }
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

export default function ProductFormModal({ isOpen, onClose, accessToken, onSuccess, product }: ProductFormModalProps) {
  const isEditing = !!product;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // dollars, as typed
  const [currency, setCurrency] = useState('usd');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(product?.name || '');
    setDescription(product?.description || '');
    setPrice(product ? (product.price_cents / 100).toString() : '');
    setCurrency(product?.currency || 'usd');
    setImageUrl(product?.image_url || null);
    setActive(product?.active ?? true);
    setError(null);
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 4 MB');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await compressImage(file);
      setImageUrl(dataUrl);
    } catch {
      setError('No se pudo procesar la imagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio');
      return;
    }
    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber < 0) {
      setError('Introduce un precio válido');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        description: description.trim() || null,
        priceCents: Math.round(priceNumber * 100),
        currency,
        imageUrl,
        active,
      };

      const res = await fetch(isEditing ? `/api/products/${product!.id}` : '/api/products', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo guardar el producto');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card-liquid rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{isEditing ? 'Editar producto' : 'Añadir producto'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-lg">{error}</div>
          )}

          {/* Image */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Imagen</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-white/30" />
                )}
              </div>
              <label className="px-3 py-2 border border-gray-700 hover:bg-gray-800 text-white/70 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                {uploading ? 'Subiendo…' : 'Subir imagen'}
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="text-sm text-white/40 hover:text-white cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Pack de redes sociales"
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 outline-none"
              maxLength={200}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qué incluye este producto o servicio"
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 outline-none resize-none"
              maxLength={2000}
            />
          </div>

          {/* Price + currency */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-white/60 mb-2">Precio</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 outline-none"
                required
              />
            </div>
            <div className="w-28">
              <label className="block text-sm text-white/60 mb-2">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-olive-500 focus:border-olive-500 outline-none"
              >
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
                <option value="mxn">MXN</option>
              </select>
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-white/70">Visible en la tienda pública</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-700 hover:bg-gray-800 text-white/70 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-olive-500 text-black hover:bg-olive-400 disabled:opacity-50 rounded-full text-sm font-medium transition-colors cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Añadir producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
