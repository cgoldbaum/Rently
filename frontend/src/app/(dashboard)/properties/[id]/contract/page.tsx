'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  initialAmount: z.number().positive(),
  paymentDay: z.number().int().min(1).max(31),
  indexType: z.enum(['IPC', 'ICL']),
  adjustFrequency: z.number().int().positive(),
});

type FormData = z.infer<typeof schema>;

function toDateInput(iso: string) {
  return iso ? iso.substring(0, 10) : '';
}

export default function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/properties/${id}/contract`);
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (contract) {
      reset({
        startDate: toDateInput(contract.startDate),
        endDate: toDateInput(contract.endDate),
        initialAmount: contract.initialAmount,
        paymentDay: contract.paymentDay,
        indexType: contract.indexType,
        adjustFrequency: contract.adjustFrequency,
      });
    }
  }, [contract, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      if (contract) {
        return api.patch(`/properties/${id}/contract`, payload);
      }
      return api.post(`/properties/${id}/contract`, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract', id] }),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">{contract ? 'Contrato' : 'Crear contrato'}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{contract ? 'Editar contrato' : 'Nuevo contrato'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <Input type="date" {...register('startDate')} />
                {errors.startDate && <p className="text-red-500 text-sm">Requerido</p>}
              </div>
              <div className="space-y-1">
                <Label>Fecha fin</Label>
                <Input type="date" {...register('endDate')} />
                {errors.endDate && <p className="text-red-500 text-sm">Requerido</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Monto inicial ($)</Label>
              <Input type="number" step="0.01" {...register('initialAmount', { valueAsNumber: true })} />
              {errors.initialAmount && <p className="text-red-500 text-sm">{errors.initialAmount.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Día de pago</Label>
                <Input type="number" min={1} max={31} {...register('paymentDay', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Frec. ajuste (meses)</Label>
                <Input type="number" min={1} {...register('adjustFrequency', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Índice</Label>
              <Select
                defaultValue={contract?.indexType}
                onValueChange={(v) => setValue('indexType', v as 'IPC' | 'ICL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná índice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IPC">IPC</SelectItem>
                  <SelectItem value="ICL">ICL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            {mutation.isSuccess && <p className="text-green-600 text-sm">Guardado correctamente</p>}
            {mutation.isError && <p className="text-red-500 text-sm">Error al guardar</p>}
          </form>
        </CardContent>
      </Card>

      {contract && (
        <Card className="mt-4">
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Monto actual</span>
              <span className="font-medium">${contract.currentAmount.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Próximo ajuste</span>
              <span>{new Date(contract.nextAdjustDate).toLocaleDateString('es-AR')}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
