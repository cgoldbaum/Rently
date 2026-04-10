'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const statusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  comment: z.string().optional(),
});

type StatusForm = z.infer<typeof statusSchema>;

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  OPEN: { label: 'Abierto', variant: 'destructive' },
  IN_PROGRESS: { label: 'En curso', variant: 'outline' },
  RESOLVED: { label: 'Resuelto', variant: 'secondary' },
};

const categoryLabels: Record<string, string> = {
  PLUMBING: 'Plomería',
  ELECTRICITY: 'Electricidad',
  STRUCTURE: 'Estructura',
  OTHER: 'Otro',
};

interface Claim {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function PropertyClaimsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const { data: claims, isLoading } = useQuery<Claim[]>({
    queryKey: ['claims', id],
    queryFn: async () => {
      const res = await api.get(`/properties/${id}/claims`);
      return res.data.data;
    },
  });

  const { register, handleSubmit, setValue, reset } = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: StatusForm) => api.patch(`/claims/${selectedClaim!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', id] });
      setSelectedClaim(null);
      reset();
    },
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Reclamos</h1>

      {!claims?.length && <p className="text-gray-500">Sin reclamos registrados.</p>}

      <div className="space-y-3">
        {claims?.map((claim) => {
          const status = statusConfig[claim.status] ?? { label: claim.status, variant: 'secondary' as const };
          return (
            <Card key={claim.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <span className="text-sm text-gray-500">{categoryLabels[claim.category]}</span>
                    </div>
                    <p className="text-sm">{claim.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(claim.createdAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  {claim.status !== 'RESOLVED' && (
                    <Button size="sm" variant="outline" onClick={() => setSelectedClaim(claim)}>
                      Actualizar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedClaim} onOpenChange={(o) => { if (!o) { setSelectedClaim(null); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado del reclamo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Nuevo estado</Label>
              <Select onValueChange={(v) => setValue('status', v as StatusForm['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PROGRESS">En curso</SelectItem>
                  <SelectItem value="RESOLVED">Resuelto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Comentario (opcional)</Label>
              <Textarea {...register('comment')} rows={3} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setSelectedClaim(null); reset(); }}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
