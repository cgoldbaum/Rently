'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' });

const schema = z.object({
  category: z.enum(['PLUMBING', 'ELECTRICITY', 'STRUCTURE', 'OTHER']),
  description: z.string().min(5, 'Describí el problema con al menos 5 caracteres'),
  photoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const categoryLabels = [
  { value: 'PLUMBING', label: 'Plomería' },
  { value: 'ELECTRICITY', label: 'Electricidad' },
  { value: 'STRUCTURE', label: 'Estructura' },
  { value: 'OTHER', label: 'Otro' },
];

export default function PublicClaimPage() {
  const { token } = useParams<{ token: string }>();

  const { data: info, isLoading, error } = useQuery({
    queryKey: ['link', token],
    queryFn: async () => {
      const res = await api.get(`/public/link/${token}`);
      return res.data.data;
    },
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, photoUrl: data.photoUrl || undefined };
      return api.post(`/public/claims/${token}`, payload);
    },
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">El link no es válido o el contrato venció.</p>
    </div>
  );

  if (mutation.isSuccess) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-lg font-medium">Reclamo enviado</p>
          <p className="text-gray-500 text-sm mt-1">El propietario recibirá tu reclamo y te contactará.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Reportar un problema</CardTitle>
          <p className="text-sm text-gray-500">{info?.propertyAddress}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select onValueChange={(v) => setValue('category', v as FormData['category'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryLabels.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-500 text-sm">Seleccioná una categoría</p>}
            </div>
            <div className="space-y-1">
              <Label>Descripción del problema</Label>
              <Textarea {...register('description')} rows={4} placeholder="Describí el problema en detalle..." />
              {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>URL de foto (opcional)</Label>
              <Input {...register('photoUrl')} placeholder="https://..." />
              {errors.photoUrl && <p className="text-red-500 text-sm">{errors.photoUrl.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Enviar reclamo'}
            </Button>
            {mutation.isError && <p className="text-red-500 text-sm">Error al enviar. Intentá de nuevo.</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
