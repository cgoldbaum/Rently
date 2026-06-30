import { renderHook, act } from '@testing-library/react';
import api from '@/lib/api';
import { usePropertyMutations } from '@/app/(dashboard)/properties/[id]/hooks/usePropertyMutations';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  getApiBaseUrl: () => 'http://test',
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('@/store/toast', () => ({ useToastStore: { getState: () => ({ showToast: jest.fn() }) } }));

const post = api.post as jest.Mock;

// jsdom no implementa createObjectURL (lo usa handlePhotoSelect para previews).
beforeAll(() => {
  (global.URL as any).createObjectURL = jest.fn(() => 'blob:preview');
});

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: { data: [] } });
});

// Construye los objetos `data`/`ui` que el componente padre le pasa al hook.
// `folder` y `tags` son el estado de carpeta/etiquetas que el usuario eligió.
function makeArgs(folder: string, tags: string[]) {
  const noop = jest.fn();
  const data: any = { setPhotos: noop, setPhotoPreview: noop };
  const ui: any = {
    photoUploadFolder: folder,
    photoUploadTags: tags,
    setUploadingPhotos: noop,
    setPhotoUploadFolder: noop,
    setPhotoUploadTags: noop,
  };
  return { data, ui };
}

function fileEvent() {
  const file = new File(['x'], 'foto.png', { type: 'image/png' });
  return { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

describe('usePropertyMutations — handlePhotoSelect (regresión de stale closure)', () => {
  it('usa la carpeta y etiquetas elegidas ANTES de subir, no los valores iniciales', async () => {
    // Render inicial: sin carpeta ni etiquetas (como al montar la página).
    const { result, rerender } = renderHook(
      ({ folder, tags }: { folder: string; tags: string[] }) => {
        const { data, ui } = makeArgs(folder, tags);
        return usePropertyMutations('prop-1', data, ui);
      },
      { initialProps: { folder: '', tags: [] as string[] } },
    );

    // El usuario elige carpeta y etiquetas -> el padre re-renderiza con el nuevo estado.
    rerender({ folder: 'folder-9', tags: ['tag-a', 'tag-b'] });

    // Recién ahora selecciona los archivos (dispara el upload real).
    await act(async () => {
      await result.current.handlePhotoSelect(fileEvent());
    });

    expect(post).toHaveBeenCalledTimes(1);
    const [url, formData] = post.mock.calls[0];
    expect(url).toBe('/properties/prop-1/photos');
    // Antes del fix, estos valores eran '' y [] (capturados en el primer render).
    expect((formData as FormData).get('folderId')).toBe('folder-9');
    expect((formData as FormData).getAll('tagIds[]')).toEqual(['tag-a', 'tag-b']);
  });

  it('no envía folderId ni tagIds cuando no se eligió nada', async () => {
    const { result } = renderHook(() => {
      const { data, ui } = makeArgs('', []);
      return usePropertyMutations('prop-1', data, ui);
    });

    await act(async () => {
      await result.current.handlePhotoSelect(fileEvent());
    });

    const [, formData] = post.mock.calls[0];
    expect((formData as FormData).get('folderId')).toBeNull();
    expect((formData as FormData).getAll('tagIds[]')).toEqual([]);
  });
});
