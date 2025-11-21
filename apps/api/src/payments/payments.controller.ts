import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateSinpePaymentDto } from './dto/create-sinpe-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/sinpe')
  createSinpePayment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
    @Body() createSinpePaymentDto: CreateSinpePaymentDto,
  ) {
    return this.paymentsService.createSinpePayment(orderId, user.id, createSinpePaymentDto);
  }

  @Get('orders/:orderId')
  getPaymentsByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.paymentsService.getPaymentsByOrder(orderId, user.id, isAdmin);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.paymentsService.findOne(id, user.id, isAdmin);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  confirmPayment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirmPayment(id, user.id, confirmPaymentDto);
  }

  @Patch(':id/fail')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  failPayment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    return this.paymentsService.failPayment(id, user.id, body.reason);
  }
}
