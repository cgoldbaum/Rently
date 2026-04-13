'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TenantPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [linkResent, setLinkResent] = useState(false);

  const { data: property } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const res = await api.get(`/properties/${id}`);
      return res.data.data;
    },
  });

  const contractId = property?.contract?.id;

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      try {
        const res = await api.get(`/contracts/${contractId}/tenant`);
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post(`/contracts/${contractId}/tenant`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant', contractId] }),
  });

  const resendMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${contractId}/tenant/resend-link`, {}),
    onSuccess: () => setLinkResent(true),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;

  if (!contractId) {
    return <p className="text-gray-500">Primero creá un contrato para esta propiedad.</p>;
  }

  if (!tenant) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold mb-6">Agregar inquilino</h1>
        <Card>
          <CardHeader><CardTitle>Datos del inquilino</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Teléfono (opcional)</Label>
                <Input {...register('phone')} />
              </div>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
              {createMutation.isError && <p className="text-red-500 text-sm">Error al guardar</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_API_URL?.replace('4000', '3000') || 'http://localhost:3000';
  const link = `${appUrl}/public/portal/${tenant.linkToken}`;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Inquilino</h1>
      <Card className="mb-4">
        <CardContent className="pt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Nombre</span><span>{tenant.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{tenant.email}</span></div>
          {tenant.phone && <div className="flex justify-between"><span className="text-gray-500">Teléfono</span><span>{tenant.phone}</span></div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Link de reclamos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Activo</Badge>
            <span className="text-xs text-gray-500 break-all">{link}</span>
          </div>
          <Button
            variant="outline"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
          >
            {resendMutation.isPending ? 'Enviando...' : 'Reenviar link'}
          </Button>
          {linkResent && <p className="text-green-600 text-sm">Link reenviado correctamente</p>}
        </CardContent>
      </Card>
    </div>
  );
}
