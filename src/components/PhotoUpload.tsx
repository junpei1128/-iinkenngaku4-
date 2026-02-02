import { useState, useRef, useEffect } from 'react';

interface PhotoUploadProps {
  /** 写真のBase64配列（複数枚対応） */
  value: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 10; // 最大枚数

export const PhotoUpload = ({ value, onChange, disabled = false }: PhotoUploadProps) => {
  const [photos, setPhotos] = useState<string[]>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhotos(value);
  }, [value]);

  const syncToParent = (next: string[]) => {
    setPhotos(next);
    onChange(next);
  };

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      alert(`写真は最大${MAX_PHOTOS}枚までです`);
      e.target.value = '';
      return;
    }

    const fileList = Array.from(files).slice(0, remaining);
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        alert(`「${file.name}」は画像ファイルではありません。画像を選択してください。`);
        e.target.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`「${file.name}」は5MB以下にしてください。`);
        e.target.value = '';
        return;
      }
    }

    try {
      const newBase64List = await Promise.all(fileList.map(readFileAsDataURL));
      syncToParent([...photos, ...newBase64List]);
    } catch {
      alert('写真の読み込みに失敗しました。');
    }
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const next = photos.filter((_, i) => i !== index);
    syncToParent(next);
  };

  const handleRemoveAll = () => {
    syncToParent([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              写真を選択
            </button>
            {photos.length > 0 && (
              <button
                type="button"
                onClick={handleRemoveAll}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                すべて削除
              </button>
            )}
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {photos.map((src, index) => (
            <div key={index} className="relative inline-block">
              <img
                src={src}
                alt={`プレビュー ${index + 1}`}
                className="max-w-xs max-h-48 object-contain border border-gray-300 rounded-md"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 focus:outline-none"
                  title="この写真を削除"
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
