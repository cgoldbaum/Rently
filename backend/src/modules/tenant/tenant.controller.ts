import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as tenantService from './tenant.service';

export async function getContractController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getContract(req.user!.tenantId!);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getPaymentsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, page, limit } = req.query as Record<string, string>;
    const data = await tenantService.getPayments(req.user!.tenantId!, {
      status: status || undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.json({ data });
  } catch (err) { next(err); }
}

export async function registerCashPaymentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.registerCashPayment(req.user!.tenantId!, req.body);
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function createMercadoPagoPaymentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.createMercadoPagoPayment(req.user!.tenantId!, String(req.params['id']));
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function getUpcomingPaymentsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getUpcomingPayments(req.user!.tenantId!);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getPaymentReceiptController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getPaymentReceipt(req.user!.tenantId!, String(req.params['id']));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getPublicMockTenantPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getPublicMockTenantPayment(String(req.params['id']));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function confirmPublicMockTenantPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.confirmPublicMockTenantPayment(String(req.params['id']));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getClaimsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getClaims(req.user!.tenantId!);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getClaimController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getClaim(req.user!.tenantId!, String(req.params['id']));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function createClaimController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.createClaim(req.user!.tenantId!, req.body);
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function updateClaimDescriptionController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.updateClaimDescription(
      req.user!.tenantId!,
      String(req.params['id']),
      req.body
    );
    res.json({ data });
  } catch (err) { next(err); }
}

export async function deleteClaimController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.deleteClaim(req.user!.tenantId!, String(req.params['id']));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getPropertyPhotosController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getPropertyPhotos(req.user!.tenantId!);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getNotificationsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.getNotifications(req.user!.userId);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function markNotificationReadController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.markNotificationRead(req.user!.userId, String(req.params['id']));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function markNotificationUnreadController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.markNotificationUnread(req.user!.userId, String(req.params['id']));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function markAllNotificationsReadController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await tenantService.markAllNotificationsRead(req.user!.userId);
    res.json({ data });
  } catch (err) { next(err); }
}
